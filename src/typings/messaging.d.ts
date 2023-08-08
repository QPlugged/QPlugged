declare interface MessagingEvents {
    "new-messages": (messages: Message[]) => void;
}

type MessagingEventEmitter =
    import("eventemitter3").EventEmitter<MessagingEvents>;

declare interface Messaging extends MessagingEventEmitter {
    getPreviousMessages(
        entity: Entity,
        messageCount: number,
        fromMessageId?: string,
    ): Promise<Message[]>;
    sendMessage(entity: Entity, elements: MessageElement[]): Promise<string>;
    getAvatars(entities: Entity[]): Promise<Map<Entity, string>>;
    getUserInfo(uid: string): Promise<User>;
    getGroupInfo(uid: string): Promise<Group>;
    getFriendsList(forced: boolean): Promise<User[]>;
    getGroupsList(forced: boolean): Promise<Group[]>;
}

declare interface Message {
    id: string;
    entity: Entity;
    sender: Sender;
    timestamp: number;
    elements: MessageElement[];
    progress: Promise<void[]>;
    raw: any;
}

declare type MessageElement =
    | MessageElementText
    | MessageElementImage
    | MessageElementFace
    | MessageElementRaw;

declare interface MessageElementBase {
    raw?: any;
}

declare interface MessageElementText extends MessageElementBase {
    type: "text";
    content: string;
}

declare interface MessageElementImage extends MessageElementBase {
    type: "image";
    filePath: string;
    progress?: Promise<void>;
}

declare interface MessageElementFace extends MessageElementBase {
    type: "face";
    faceType: "typcial-1" | "typcial-2" | "big" | number;
    faceId: number;
    faceBigId?: number;
}

declare interface MessageElementRaw extends MessageElementBase {
    type: "raw";
    raw: any;
}

declare interface Sender {
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
