declare interface MessagingEvents {
    "new-messages": (messages: Message[]) => void;
}

type MessagingEventEmitter =
    import("eventemitter3").EventEmitter<MessagingEvents>;

declare interface Messaging extends MessagingEventEmitter {
    getFaceResourceDir(): Promise<string>;
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
        elements: SendableMessageElement[],
    ): Promise<string>;
    getAvatars(entities: Entity[]): Promise<Map<Entity, string>>;
    getUserInfo(uid: string): Promise<User>;
    getGroupInfo(uid: string): Promise<Group>;
    getFriendsList(forced: boolean): Promise<User[]>;
    getGroupsList(forced: boolean): Promise<Group[]>;
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
    | MessageNonSendableElementFace
    | MessageNonSendableElementRaw;

declare type MessageSendableElement =
    | MessageSendableElementReply
    | MessageSendableElementText
    | MessageSendableElementMention
    | MessageSendableElementImage
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
    messageSeq: string;
}

declare interface MessageNonSendableElementReply
    extends MessageNonSendableElementBase,
        MessageCommonElementReply {}

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

interface MessageCommonElementMention {
    type: "mention";
    content: string;
    uid: string;
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

declare interface User extends Account {
    qid: string;
    avatar: string;
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

declare type EntityType = "user" | "group" | number;
declare interface Entity {
    type: EntityType;
    uid: string;
}
