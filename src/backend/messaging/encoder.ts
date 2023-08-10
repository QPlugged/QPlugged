import toURL from "../../utils/toURL";
import { MessagingMedia } from "./media";

export function encodeReplyElement(
    ele: any,
    msg: any,
): MessageNonSendableElementReply {
    return {
        type: "reply",
        id: ele.elementId,
        messageSeq: msg.msgSeq,
        sender: ele.replyElement.senderUidStr,
        raw: ele,
    };
}

export function encodeRevokeElement(ele: any): MessageNonSendableElementRevoke {
    return {
        type: "revoke",
        id: ele.elementId,
        operator: {
            name: ele.grayTipElement.revokeElement.operatorNick || "",
            memberName:
                ele.grayTipElement.revokeElement.operatorMemRemark || "",
            uid: ele.grayTipElement.revokeElement.operatorUid,
        },
        sender: {
            name: ele.grayTipElement.revokeElement.origMsgSenderNick,
            memberName:
                ele.grayTipElement.revokeElement.origMsgSenderMemRemark || "",
            uid: ele.grayTipElement.revokeElement.origMsgSenderUid,
        },
        isRevokedBySelf: ele.grayTipElement.revokeElement.isSelfOperate,
        raw: ele,
    };
}

export function encodeTextElement(ele: any): MessageNonSendableElementText {
    return {
        type: "text",
        id: ele.elementId,
        content: ele.textElement.content,
        raw: ele,
    };
}

export function encodeImageElement(
    ele: any,
    media: MessagingMedia,
    messageId: string,
    entity: Entity,
): MessageNonSendableElementImage {
    return {
        type: "image",
        id: ele.elementId,
        files: [
            toURL(ele.picElement.sourcePath),
            ...[...(ele.picElement.thumbPath as Map<any, any>).values()].map(
                (path) => toURL(path),
            ),
        ],
        imageType:
            ele.picElement.picType === 1001 && ele.picElement.picSubType === 0
                ? "typcial"
                : ele.picElement.picType === 1000 &&
                  ele.picElement.picSubType === 1
                ? "sticker"
                : [ele.picElement.picType, ele.picElement.picSubType],
        progress: media.downloadMedia(
            messageId,
            ele.elementId,
            entity,
            ele.picElement.thumbPath.get(0),
            ele.picElement.sourcePath,
        ),
        width: ele.picElement.picWidth,
        raw: ele,
    };
}

export function encodeFaceElement(ele: any): MessageNonSendableElementFace {
    return {
        type: "face",
        id: ele.elementId,
        faceType:
            {
                1: "typcial-1",
                2: "typcial-2",
                3: "big",
            }[ele.faceElement.faceType as number] || ele.faceElement.faceType,
        faceId: ele.faceElement.faceIndex,
        faceBigId:
            ele.faceElement.stickerId && parseInt(ele.faceElement.stickerId),
        raw: ele,
    };
}

export function encodeRawElement(ele: any): MessageNonSendableElementRaw {
    return {
        type: "raw",
        id: ele.elementId,
        raw: ele,
    };
}

export function encodeMessage(raw: any, media: MessagingMedia): Message {
    const id = raw.msgId;
    const entity = encodeEntity(raw);
    const sender = {
        uid: raw.senderUid,
        name: raw.sendNickName,
        memberName: raw.sendMemberName || undefined,
    };

    const progress: Promise<void>[] = [];
    const elements = (raw.elements as any[]).map(
        (ele): MessageNonSendableElement => {
            return (
                {
                    1: encodeTextElement,
                    2: (ele: any) => {
                        const element = encodeImageElement(
                            ele,
                            media,
                            id,
                            entity,
                        );
                        progress.push(element.progress!);
                        return element;
                    },
                    6: encodeFaceElement,
                    7: (ele: any) => encodeReplyElement(ele, raw),
                    8: { 1: encodeRevokeElement }[
                        ele.grayTipElement?.subElementType as number
                    ],
                }[ele.elementType as number] || encodeRawElement
            )(ele);
        },
    );
    return {
        id: id,
        seq: raw.msgSeq,
        entity: entity,
        sender: sender,
        timestamp: parseInt(raw.msgTime) || 0,
        elements: elements,
        progress: Promise.all(progress),
        raw: raw,
    };
}

export function encodeEntity(raw: any): Entity {
    return {
        type: { 1: "user", 2: "group" }[raw.chatType as number] || raw.chatType,
        uid: raw.peerUid,
    };
}

export function encodeUser(raw: any): User {
    return {
        uid: raw.uid,
        uin: raw.uin,
        qid: raw.qid,
        avatar: raw.avatarUrl,
        name: raw.nick,
        bio: raw.longNick,
        sex:
            { 1: "male", 2: "female", 255: "unset", 0: "unset" }[
                raw.sex as number
            ] || raw.sex,
        raw: raw,
    };
}

export function encodeGroup(raw: any): Group {
    return {
        uid: raw.groupCode,
        avatar: raw.avatarUrl,
        name: raw.groupName,
        role:
            { 4: "master", 3: "moderator", 2: "member" }[
                raw.memberRole as number
            ] || raw.memberRole,
        memberLimit: raw.maxMember,
        memberCount: raw.memberCount,
        raw: raw,
    };
}
