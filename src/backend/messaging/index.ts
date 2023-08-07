import { InternalApi } from "../api";
import { IpcApi } from "../ipc";
import {
	decodeFaceElement,
	decodeImageElement,
	decodePeer,
	decodeRawElement,
	decodeTextElement,
} from "./decoder";
import { encodeMessage } from "./encoder";
import { MessagingMedia } from "./media";
import EventEmitter from "eventemitter3";

export class MessagingImpl
	extends EventEmitter<MessagingEvents>
	implements Messaging
{
	private nt: IpcApi;
	private media: MessagingMedia;
	constructor(api: InternalApi) {
		super();
		const { nt } = api;
		this.nt = nt;
		this.media = new MessagingMedia(api);
		this.nt.on("nodeIKernelMsgListener/onRecvMsg", (payload: any) => {
			const messages = (payload?.msgList as any[])?.map((message) =>
				encodeMessage(message, this.media),
			);
			if (messages) this.emit("new-messages", messages);
		});
		this.nt.on("nodeIKernelMsgListener/onAddSendMsg", (payload) => {
			const message =
				payload?.msgRecord && encodeMessage(payload.msgRecord, this.media);
			if (message) this.emit("add-sent-message", message);
		});
	}
	async getPreviousMessages(
		peer: Peer,
		messageCount: number,
		fromMessageId = "0",
	): Promise<Message[]> {
		const res = await this.nt.send(
			"nodeIKernelMsgService/getMsgsIncludeSelf",
			{
				peer: decodePeer(peer),
				msgId: fromMessageId,
				cnt: messageCount,
				queryOrder: true,
			},
			undefined,
		);
		const messages = (res.msgList as any[]).map((raw) =>
			encodeMessage(raw, this.media),
		);
		return messages;
	}
	async sendMessage(peer: Peer, elements: MessageElement[]): Promise<string> {
		await this.nt.send(
			"nodeIKernelMsgService/sendMsg",
			{
				msgId: "0",
				peer: decodePeer(peer),
				msgElements: await Promise.all(
					elements.map(async (element) => {
						return {
							text: decodeTextElement,
							image: (element: MessageElementImage) =>
								decodeImageElement(
									this.media.prepareImageElement(element.filePath),
								),
							face: decodeFaceElement,
							raw: decodeRawElement,
						}[element.type](element as any);
					}),
				),
			},
			null,
		);
		return await new Promise<string>((resolve) =>
			this.once("add-sent-message", (message) => resolve(message.id)),
		);
	}
}
