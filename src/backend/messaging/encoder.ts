import { MessagingMedia } from "./media";

export function encodeTextElement(ele: any): MessageElementText {
    return {
        type: "text",
        content: ele.textElement.content,
        raw: ele,
    };
}

export function encodeImageElement(
    ele: any,
    media: MessagingMedia,
    messageId: string,
    peer: Peer,
): MessageElementImage {
    return {
        type: "image",
        filePath: ele.picElement.sourcePath,
        progress: media.downloadMedia(
            messageId,
            ele.elementId,
            peer,
            ele.picElement.thumbPath.get(0),
            ele.picElement.sourcePath,
        ),
        raw: ele,
    };
}

export function encodeFaceElement(ele: any): MessageElementFace {
    return {
        type: "face",
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

export function encodeRawElement(ele: any): MessageElementRaw {
    return {
        type: "raw",
        raw: ele,
    };
}

export function encodeMessage(raw: any, media: MessagingMedia): Message {
    const id = raw.msgId;
    const peer = encodePeer(raw);
    const sender = {
        uid: raw.senderUid,
        name: raw.sendNickName,
        memberName: raw.sendMemberName || undefined,
    };

    const progress: Promise<void>[] = [];
    const elements = (raw.elements as any[]).map((ele): MessageElement => {
        return (
            {
                1: encodeTextElement,
                2: (ele: any) => {
                    const element = encodeImageElement(ele, media, id, peer);
                    progress.push(element.progress!);
                    return element;
                },
                6: encodeFaceElement,
            }[ele.elementType as number] || encodeRawElement
        )(ele);
    });
    return {
        id: id,
        peer: peer,
        sender: sender,
        elements: elements,
        progress: Promise.all(progress),
        raw: raw,
    };
}

export function encodePeer(raw: any): Peer {
    return {
        type: { 1: "pm", 2: "group" }[raw.chatType as number] || raw.chatType,
        uid: raw.peerUid,
        guildId: raw.guildId || undefined,
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
