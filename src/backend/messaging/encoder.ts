export function encodeReplyElement(ele: any): MessageNonSendableElementReply {
    return {
        type: "reply",
        id: ele.elementId,
        sourceMessageSeq: ele.replyElement.replayMsgSeq,
        sourceMessageText: ele.replyElement.sourceMsgTextElems
            .map((ele: any) =>
                ele.replyAbsElemType === 1 ? ele.textElemContent : "[表情]",
            )
            .join(""),
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

export function encodeMentionElement(
    ele: any,
): MessageNonSendableElementMention {
    return {
        type: "mention",
        id: ele.elementId,
        mentionType:
            { 2: "user", 1: "everyone" }[ele.textElement.atType as number] ||
            ele.textElement.atType,
        content: ele.textElement.content,
        uid:
            ele.textElement.atType === "1"
                ? undefined
                : ele.textElement.atNtUid,
        raw: ele,
    };
}

export function encodeImageElement(
    ele: any,
    media: MessagingMedia,
    messageId: string,
    entity: Entity,
): MessageNonSendableElementImage {
    const type: MessageElementImageType =
        { 1001: "typical", 1000: "sticker" }[
            ele.picElement.picType as number
        ] || ele.picElement.picType;
    const isDownloadRawImage = type === "sticker";
    return {
        type: "image",
        id: ele.elementId,
        imageType: type,
        imageSubType: ele.picElement.picSubType,
        progress: media.downloadMedia(
            messageId,
            ele.elementId,
            isDownloadRawImage ? 1 : 2,
            entity,
            isDownloadRawImage
                ? ele.picElement.sourcePath
                : ele.picElement.thumbPath.get(0),
        ),
        width: ele.picElement.picWidth,
        height: ele.picElement.picHeight,
        raw: ele,
    };
}

export function encodeFileElement(ele: any): MessageNonSendableElementFile {
    return {
        type: "file",
        id: ele.elementId,
        name: ele.fileElement.fileName,
        file: ele.fileElement.filePath,
        size: parseInt(ele.fileElement.fileSize) || 0,
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

    const progress: Promise<string>[] = [];
    const elements = (raw.elements as any[]).map(
        (ele): MessageNonSendableElement => {
            return (
                {
                    1: (ele: any) =>
                        ele.textElement.atType !== 0
                            ? encodeMentionElement(ele)
                            : encodeTextElement(ele),
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
                    3: encodeFileElement,
                    6: encodeFaceElement,
                    7: encodeReplyElement,
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
        avatarUrl: raw.avatarUrl,
        avatarFile: raw.avatarPath,
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
