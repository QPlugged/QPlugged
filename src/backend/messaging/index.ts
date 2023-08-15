import { InternalApi } from "../api";
import { WSApi } from "../ws";
import { filterEntities } from "./converter";
import {
    decodeEntity,
    decodeFaceElement,
    decodeImageElement,
    decodeMentionElement,
    decodeRawElement,
    decodeReplyElement,
    decodeTextElement,
} from "./decoder";
import { encodeGroup, encodeMessage, encodeUser } from "./encoder";
import { MessagingMedia } from "./media";
import EventEmitter from "eventemitter3";

export class MessagingImpl
    extends EventEmitter<MessagingEvents>
    implements Messaging
{
    private nt: WSApi;
    private media: MessagingMedia;
    constructor(api: InternalApi, fs: Filesystem) {
        super();
        const { nt } = api;
        this.nt = nt;
        this.media = new MessagingMedia(api, fs);
        this.nt.on("nodeIKernelMsgListener/onRecvMsg", (payload: any) => {
            const messages = (payload?.msgList as any[])?.map((message) =>
                encodeMessage(message, this.media),
            );
            if (messages) this.emit("new-messages", messages);
        });
        this.nt.on("nodeIKernelMsgListener/onAddSendMsg", (payload: any) => {
            const message =
                payload?.msgRecord &&
                encodeMessage(payload.msgRecord, this.media);
            if (message) this.emit("new-messages", [message]);
        });
    }

    private async _getResourceDir(type: number): Promise<string> {
        const res = await this.nt.send(
            "nodeIKernelMsgService/getEmojiResourcePath",
            { type: type },
        );
        return res.resourcePath;
    }

    getFaceResourceDir(): Promise<string> {
        return this._getResourceDir(1);
    }

    async getLottieResourceDir(): Promise<string> {
        return this._getResourceDir(4);
    }

    async getPreviousMessages(
        entity: Entity,
        messageCount: number,
        fromMessageId = "0",
        queryOrder = true,
    ): Promise<Message[]> {
        const res = await this.nt.send(
            "nodeIKernelMsgService/getMsgsIncludeSelf",
            {
                peer: decodeEntity(entity),
                msgId: fromMessageId,
                cnt: messageCount,
                queryOrder: queryOrder,
            },
            undefined,
        );
        const messages = (res.msgList as any[]).map((raw) =>
            encodeMessage(raw, this.media),
        );
        return messages;
    }

    async getPreviousMessagesBySeq(
        entity: Entity,
        messageCount: number,
        messageSeq: string,
        queryOrder = true,
    ): Promise<Message[]> {
        const res = await this.nt.send(
            "nodeIKernelMsgService/getMsgsBySeqAndCount",
            {
                peer: decodeEntity(entity),
                msgSeq: messageSeq,
                cnt: messageCount,
                queryOrder: queryOrder,
            },
            undefined,
        );
        const messages = (res.msgList as any[]).map((raw) =>
            encodeMessage(raw, this.media),
        );
        return messages;
    }

    async sendMessage(
        entity: Entity,
        elements: MessageSendableElement[],
    ): Promise<string> {
        await this.nt.send(
            "nodeIKernelMsgService/sendMsg",
            {
                msgId: "0",
                peer: decodeEntity(entity),
                msgElements: await Promise.all(
                    elements.map(async (element) => {
                        return {
                            reply: decodeReplyElement,
                            text: decodeTextElement,
                            mention: decodeMentionElement,
                            image: (element: MessageSendableElementImage) =>
                                decodeImageElement(
                                    this.media.prepareImageElement(
                                        element.file,
                                        element.imageType,
                                        element.imageSubType,
                                    ),
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
            this.nt.once("nodeIKernelMsgListener/onAddSendMsg", (payload) => {
                const message =
                    payload?.msgRecord &&
                    encodeMessage(payload.msgRecord, this.media);
                resolve(message);
            }),
        );
    }

    async getAvatars(entities: Entity[]): Promise<Map<Entity, string>> {
        const avatars = new Map<Entity, string>();
        const users: Map<string, string> = await this.nt.send(
            "nodeIKernelAvatarService/getMembersAvatarPath",
            {
                uids: [...new Set(filterEntities(entities, "user"))],
                clarity: 0,
            },
        );
        for (const [uid, path] of users)
            avatars.set(
                entities.find(
                    (entity) => entity.type === "user" && entity.uid === uid,
                )!,
                path,
            );
        const groups: Map<string, string> = await this.nt.send(
            "nodeIKernelAvatarService/getGroupsAvatarPath",
            {
                groupCodes: [...new Set(filterEntities(entities, "group"))],
                clarity: 0,
            },
        );
        for (const [uid, path] of groups)
            avatars.set(
                entities.find(
                    (entity) => entity.type === "group" && entity.uid === uid,
                )!,
                path,
            );
        return avatars;
    }

    async getUserInfo(uid: string): Promise<User> {
        this.nt.send(
            "nodeIKernelProfileService/getUserDetailInfo",
            { uid: uid },
            undefined,
        );
        return await new Promise((resolve) => {
            const listener = (payload: any) => {
                const user = encodeUser(payload.info);
                if (user.uid === uid) {
                    resolve(user);
                    this.nt.off(
                        "nodeIKernelProfileListener/onProfileDetailInfoChanged",
                        listener,
                    );
                }
            };
            this.nt.on(
                "nodeIKernelProfileListener/onProfileDetailInfoChanged",
                listener,
            );
        });
    }

    async getGroupInfo(uid: string): Promise<Group> {
        this.nt.send(
            "nodeIKernelGroupService/getGroupDetailInfo",
            { groupCode: uid, source: 4 },
            undefined,
        );
        return await new Promise((resolve) => {
            const listener = (payload: any) => {
                const user = encodeGroup(payload.groupDetail);
                if (user.uid === uid) {
                    resolve(user);
                    this.nt.off(
                        "nodeIKernelGroupListener/onGroupDetailInfoChange",
                        listener,
                    );
                }
            };
            this.nt.on(
                "nodeIKernelGroupListener/onGroupDetailInfoChange",
                listener,
            );
        });
    }

    async getFriendsList(forced: boolean): Promise<User[]> {
        this.nt.send(
            "nodeIKernelBuddyService/getBuddyList",
            { force_update: forced },
            undefined,
        );
        return await new Promise((resolve) =>
            this.nt.once(
                "nodeIKernelBuddyListener/onBuddyListChange",
                (payload) => {
                    resolve(
                        ([] as User[]).concat(
                            ...((payload?.data || []) as any[]).map(
                                (category) =>
                                    ((category?.buddyList || []) as any[]).map(
                                        (friend) => encodeUser(friend),
                                    ),
                            ),
                        ),
                    );
                },
            ),
        );
    }

    async getGroupsList(forced: boolean): Promise<Group[]> {
        this.nt.send(
            "nodeIKernelGroupService/getGroupList",
            { forceFetch: forced },
            undefined,
        );
        return await new Promise((resolve) =>
            this.nt.once(
                "nodeIKernelGroupListener/onGroupListUpdate",
                (payload) => {
                    resolve(
                        ((payload?.groupList || []) as any[]).map((group) =>
                            encodeGroup(group),
                        ),
                    );
                },
            ),
        );
    }
}
