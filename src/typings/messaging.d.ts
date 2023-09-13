declare interface MessagingEvents {
    "new-messages": (messages: Message[]) => void;
}

type MessagingEventEmitter =
    import("eventemitter3").EventEmitter<MessagingEvents>;

declare interface MessagingMediaEvents {
    "download-progress-update": (
        elementId: string,
        current: number,
        total: number,
    ) => void;
    "download-finish": (elementId: string) => void;
}

type MessagingMediaEventEmitter =
    import("eventemitter3").EventEmitter<MessagingMediaEvents>;

declare interface MessagingMedia extends MessagingMediaEventEmitter {
    downloadSticker(
        downloadType: number,
        list: { md5: string; id: string; url: string }[],
    ): Promise<string>[];
    downloadMedia(
        msgId: string,
        elementId: string,
        downloadType: number,
        entity: Entity,
        filePath: string,
    ): Promise<string>;
    cancelDownloadMedia(
        msgId: string,
        elementId: string,
        downloadType: number,
        entity: Entity,
        filePath: string,
    ): Promise<void>;
    prepareFileElement(file: string): Promise<any>;
    prepareImageElement(
        file: string,
        imageType: MessageElementImageType,
        imageSubType: number,
    ): Promise<any>;
}

declare interface Messaging extends MessagingEventEmitter {
    media: MessagingMedia;
    getFaceResourceDir(): Promise<string>;
    getLottieResourceDir(): Promise<string>;
    getPreviousMessages(
        entity: Entity,
        messageCount: number,
        fromMessageId?: string,
        queryOrder?: boolean,
    ): Promise<Message[]>;
    getPreviousMessagesBySeq(
        entity: Entity,
        messageCount: number,
        messageSeq: string,
        queryOrder = true,
    ): Promise<Message[]>;
    sendMessage(
        entity: Entity,
        elements: MessageSendableElement[],
    ): Promise<string>;
    forwardMessage(
        fromEntity: Entity,
        toEntities: Entity[],
        messages: [MessageEntity, string][],
        extraElements: MessageSendableElement[],
        combine: boolean,
    ): Promise<void>;
    getAvatars(entities: Entity[]): Promise<Map<Entity, string>>;
    getStickerSet(
        stickerCount: number,
        direction: "forward" | "backward",
        fromStickerId?: string,
        forced?: boolean,
    ): Promise<Sticker[]>;
    getUserInfo(uid: string): Promise<User>;
    getGroupInfo(uid: string): Promise<Group>;
    getFriendsList(forced?: boolean): Promise<User[]>;
    getGroupsList(forced?: boolean): Promise<Group[]>;
    getGroupMentionEveryoneConfig(
        uid: string,
    ): Promise<GroupMentionEveryoneConfig>;
    switchToEntity(entity: Entity): Promise<string>;
    searchMemberList(keyword: string): Promise<Map<string, User>>;
}

declare interface Message {
    id: string;
    seq: string;
    entity: Entity;
    sender: MessageEntity;
    timestamp: number;
    elements: MessageNonSendableElement[];
    progress: Promise<string[]>;
    raw: any;
}

declare type MessageNonSendableElement =
    | MessageNonSendableElementReply
    | MessageNonSendableElementRevoke
    | MessageNonSendableElementText
    | MessageNonSendableElementMention
    | MessageNonSendableElementImage
    | MessageNonSendableElementFile
    | MessageNonSendableElementVideo
    | MessageNonSendableElementFace
    | MessageNonSendableElementRaw;

declare type MessageSendableElement =
    | MessageSendableElementReply
    | MessageSendableElementText
    | MessageSendableElementMention
    | MessageSendableElementImage
    | MessageSendableElementFile
    | MessageSendableElementFace
    | MessageSendableElementRaw;

declare interface MessageNonSendableElementBase {
    id: string;
    raw: any;
}

declare type MessageSendableElementBase = {};

interface MessageCommonElementReply {
    type: "reply";
    sender: string;
    sourceMessageSeq: string;
}

declare interface MessageNonSendableElementReply
    extends MessageNonSendableElementBase,
        MessageCommonElementReply {
    sourceMessageText: string;
}

declare interface MessageSendableElementReply
    extends MessageSendableElementBase,
        MessageCommonElementReply {
    messageId: string;
    messageSummary: string;
}

interface MessageCommonElementRevoke {
    type: "revoke";
    operator: MessageEntity;
    sender: MessageEntity;
    isRevokedBySelf: boolean;
}

declare interface MessageNonSendableElementRevoke
    extends MessageNonSendableElementBase,
        MessageCommonElementRevoke {}

interface MessageCommonElementText {
    type: "text";
    content: string;
}

declare interface MessageNonSendableElementText
    extends MessageNonSendableElementBase,
        MessageCommonElementText {}

declare interface MessageSendableElementText
    extends MessageSendableElementBase,
        MessageCommonElementText {}

type MessageElementMentionType = "user" | "everyone" | number;

interface MessageCommonElementMention {
    type: "mention";
    mentionType: MessageElementMentionType;
    content: string;
    uid?: string;
}

declare interface MessageNonSendableElementMention
    extends MessageNonSendableElementBase,
        MessageCommonElementMention {}

declare interface MessageSendableElementMention
    extends MessageSendableElementBase,
        MessageCommonElementMention {}

declare type MessageElementImageType = "typcial" | "sticker" | number;

interface MessageCommonElementImage {
    type: "image";
    imageType: MessageElementImageType;
    imageSubType: number;
}

declare interface MessageNonSendableElementImage
    extends MessageNonSendableElementBase,
        MessageCommonElementImage {
    progress: Promise<string>;
    width: number;
    height: number;
}

declare interface MessageSendableElementImage
    extends MessageSendableElementBase,
        MessageCommonElementImage {
    file: string;
}

declare type MessageElementFileType = "typical" | "video";

interface MessageCommonElementFile {
    type: "file";
    size: number;
    file: string;
}

declare interface MessageNonSendableElementFile
    extends MessageNonSendableElementBase,
        MessageCommonElementFile {
    fileType: MessageElementFileType;
    name: string;
    thumb?: {
        file: string;
        width: number;
        height: number;
    };
}

declare interface MessageSendableElementFile
    extends MessageSendableElementBase,
        MessageCommonElementFile {}

declare type MessageElementFaceType =
    | "typcial-1"
    | "typcial-2"
    | "big"
    | number;

interface MessageCommonElementFace {
    type: "face";
    faceType: MessageElementFaceType;
    faceId: number;
    faceBigId?: number;
}

declare interface MessageNonSendableElementFace
    extends MessageNonSendableElementBase,
        MessageCommonElementFace {}

declare interface MessageSendableElementFace
    extends MessageSendableElementBase,
        MessageCommonElementFace {}

interface MessageCommonElementRaw {
    type: "raw";
    raw: any;
}

declare interface MessageNonSendableElementRaw
    extends MessageNonSendableElementBase,
        MessageCommonElementRaw {}

declare interface MessageSendableElementRaw
    extends MessageSendableElementBase,
        MessageCommonElementRaw {
    type: "raw";
    raw: any;
}

declare interface MessageEntity {
    uid: string;
    name: string;
    memberName: string;
}

declare interface Sticker {
    id: string;
    progress: Promise<string> | string;
    raw: any;
}

declare interface User extends Account {
    qid: string;
    avatarUrl?: string;
    avatarFile?: string;
    name: string;
    bio: string;
    sex: "male" | "female" | "unset" | number;
    raw: any;
}

declare interface Group {
    uid: string;
    avatar: string;
    name: string;
    role: "master" | "moderator" | "member" | number;
    memberLimit: number;
    memberCount: number;
    raw: any;
}

declare interface GroupMentionEveryoneConfig {
    hasPermission: boolean;
    remainTimes: number;
}

declare type EntityType = "user" | "group" | number;
declare interface Entity {
    type: EntityType;
    uid: string;
}
