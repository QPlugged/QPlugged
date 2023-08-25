import { filterEntities } from "./converter";
import { decodeElement, decodeEntity, decodeSticker } from "./decoder";
import { encodeGroup, encodeMessage, encodeUser } from "./encoder";
import { MessagingMediaImpl } from "./media";
import EventEmitter from "eventemitter3";

export class MessagingImpl
    extends EventEmitter<MessagingEvents>
    implements Messaging
{
    private nt: InternalApi;
    private business: InternalApi;
    private scene: string | undefined;
    private switchScenePromise: Promise<string> | undefined;
    private entity: Entity | undefined;
    public media: MessagingMedia;
    constructor(api: InternalApis, fs: Filesystem) {
        super();
        const { nt, business } = api;
        this.nt = nt;
        this.business = business;
        this.media = new MessagingMediaImpl(api, fs);
        this.nt.on("nodeIKernelMsgListener/onRecvMsg", (payload: any) => {
            const messages = (payload?.msgList as any[])?.map((message) =>
                encodeMessage(message, this.media),
            );

            if (messages)
                Promise.all(
                    messages.map(async (message) => {
                        await this.business.send("setBadge", { unreadCnt: 0 });
                        await this.nt.send(
                            "nodeIKernelMsgService/setMsgRead",
                            { peer: decodeEntity(message.entity) },
                            undefined,
                        );
                        return await this.getPreviousMessages(
                            message.entity,
                            1,
                            message.id,
                            false,
                        );
                    }),
                ).then((messages) =>
                    this.emit("new-messages", messages.flat()),
                );
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
                    elements.map((element) =>
                        decodeElement(element, this.media),
                    ),
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

    async forwardMessage(
        fromEntity: Entity,
        toEntities: Entity[],
        messages: [MessageEntity, string][],
        extraElements: MessageSendableElement[],
        combine: boolean,
    ): Promise<void> {
        const payload = Object.assign(
            {
                srcContact: decodeEntity(fromEntity),
                commentElements: await Promise.all(
                    extraElements.map((element) =>
                        decodeElement(element, this.media),
                    ),
                ),
            },
            combine
                ? {
                      msgInfos: messages.map(([sender, id]) => ({
                          msgId: id,
                          senderShowName: sender.name,
                      })),
                  }
                : { msgIds: messages.map(([_, id]) => id) },
        );
        if (combine)
            for (const entity of toEntities) {
                await this.nt.send(
                    "nodeIKernelMsgService/multiForwardMsgWithComment",
                    {
                        ...payload,
                        dstContact: decodeEntity(entity),
                    },
                    undefined,
                );
            }
        else
            await this.nt.send(
                "nodeIKernelMsgService/forwardMsgWithComment",
                {
                    ...payload,
                    dstContacts: toEntities.map((entity) =>
                        decodeEntity(entity),
                    ),
                },
                undefined,
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

    async getStickerSet(
        stickerCount: number,
        direction: "forward" | "backward",
        fromStickerId = "",
        forced = false,
    ): Promise<Sticker[]> {
        const res = await this.nt.send(
            "nodeIKernelMsgService/fetchFavEmojiList",
            {
                forceRefresh: forced,
                count: stickerCount,
                backwardFetch: direction === "backward",
                resId: fromStickerId,
            },
            undefined,
        );
        const stickersToBeDownloaded = (res.emojiInfoList as any[])
            .filter((item) => !item.isExist)
            .map((item) => ({ md5: item.md5, id: item.resId, url: item.url }));
        const downloadedStickers = this.media.downloadSticker(
            1,
            stickersToBeDownloaded,
        );
        return (res.emojiInfoList as any[]).map((item) => {
            const idx = stickersToBeDownloaded.findIndex(
                (value) => value.id === item.resId,
            );
            return decodeSticker(
                item,
                idx !== -1 ? downloadedStickers[idx] : item.emoPath,
            );
        });
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

    async getFriendsList(forced = false): Promise<User[]> {
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
                        ((payload?.data || []) as any[]).flatMap((category) =>
                            ((category?.buddyList || []) as any[]).map(
                                (friend) => encodeUser(friend),
                            ),
                        ),
                    );
                },
            ),
        );
    }

    async getMemberInfo(groupUid: string, memberUids: string[]): Promise<void> {
        this.nt.send(
            "nodeIKernelGroupService/getMemberInfo",
            {
                forceUpdate: false,
                groupCode: groupUid,
                uids: memberUids,
            },
            undefined,
        );
    }

    async getGroupsList(forced = false): Promise<Group[]> {
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

    async getGroupMentionEveryoneConfig(
        uid: string,
    ): Promise<GroupMentionEveryoneConfig> {
        const res = await this.nt.send(
            "nodeIKernelGroupService/getGroupRemainAtTimes",
            { groupCode: uid },
            undefined,
        );
        const group = await this.getGroupInfo(uid);
        return {
            hasPermission:
                res.atInfo.canAtAll &&
                (group.role === "master" || group.role === "moderator"),
            remainTimes: res.atInfo.RemainAtAllCountForUin,
        };
    }

    async switchToEntity(entity: Entity): Promise<string> {
        this.switchScenePromise = (async () => {
            if (this.switchScenePromise) await this.switchScenePromise;
            if (this.scene) {
                await this.nt.send(
                    "nodeIKernelGroupService/destroyMemberListScene",
                    {
                        sceneId: this.scene,
                    },
                    undefined,
                );
            }
            const scene =
                entity.type === "group"
                    ? await this.nt.send(
                          "nodeIKernelGroupService/createMemberListScene",
                          {
                              groupCode: entity.uid,
                              scene: "groupMemberList_MainWindow",
                          },
                          undefined,
                      )
                    : undefined;

            this.entity = entity;
            this.scene = scene;
            return scene;
        })();
        return this.switchScenePromise;
    }

    async searchMemberList(keyword: string): Promise<Map<string, User>> {
        if (
            !this.switchScenePromise ||
            !this.entity ||
            this.entity.type !== "group"
        )
            throw new Error("当前不处在任一群组对话中");
        await this.switchScenePromise;

        const group = await this.getGroupInfo(this.entity?.uid);
        await this.nt.send("nodeIKernelGroupService/getNextMemberList", {
            num: group.memberCount,
            sceneId: this.scene,
        });
        this.nt.send(
            "nodeIKernelGroupService/searchMember",
            {
                keyword: keyword,
                sceneId: this.scene,
            },
            undefined,
        );
        return await new Promise((resolve) =>
            this.nt.once(
                "nodeIKernelGroupListener/onSearchMemberChange",
                async (payload) => {
                    resolve(
                        new Map(
                            [...payload.infos].map(([uid, user]) => [
                                uid,
                                encodeUser(user),
                            ]),
                        ),
                    );
                },
            ),
        );
    }
}
