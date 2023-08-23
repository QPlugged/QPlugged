export function decodeReplyElement(element: MessageSendableElementReply) {
    return {
        elementType: 7,
        elementId: "",
        replyElement: {
            replayMsgId: element.messageId,
            replayMsgSeq: element.sourceMessageSeq,
            sourceMsgText: element.messageSummary,
            senderUid: element.sender,
            senderUidStr: element.sender,
            replyMsgClientSeq: "",
            replyMsgTime: "",
            replyMsgRevokeType: 0,
            sourceMsgTextElems: [],
            sourceMsgIsIncPic: false,
            sourceMsgExpired: false,
        },
    };
}

export function decodeTextElement(element: MessageSendableElementText) {
    return {
        elementType: 1,
        elementId: "",
        textElement: {
            content: element.content,
            atType: 0,
            atUid: "",
            atTinyId: "",
            atNtUid: "",
        },
    };
}

export function decodeMentionElement(element: MessageSendableElementMention) {
    const uid = element.mentionType === "everyone" ? "all" : element.uid;
    return {
        elementType: 1,
        elementId: "",
        textElement: {
            content: element.content,
            atType:
                { user: 2, everyone: 1 }[element.mentionType] ||
                element.mentionType,
            atUid: uid,
            atTinyId: "",
            atNtUid: uid,
        },
    };
}

export function decodeImageElement(data: any) {
    return {
        elementType: 2,
        elementId: "",
        picElement: data,
    };
}

export function decodeFileElement(data: any) {
    return {
        elementType: 3,
        elementId: "",
        fileElement: data,
    };
}

export function decodeFaceElement(element: MessageSendableElementFace) {
    return {
        elementType: 6,
        elementId: "",
        faceElement: {
            faceType:
                {
                    "typcial-1": 1,
                    "typcial-2": 2,
                    big: 3,
                }[element.faceType] || element.faceType,
            faceIndex: element.faceId,
            ...(element.faceType === "big" && {
                packId: "1",
                stickerId: (element.faceBigId || "0").toString(),
                stickerType: 1,
                sourceType: 1,
                resultId: "",
                superisedId: "",
                randomType: 1,
            }),
        },
    };
}

export function decodeRawElement(element: MessageSendableElementRaw) {
    return element.raw;
}

export function decodeEntity(data: Entity): any {
    return {
        chatType: { user: 1, group: 2 }[data.type] || data.type,
        peerUid: data.uid,
        guildId: "",
    };
}

export async function decodeElement(
    element: MessageSendableElement,
    media: MessagingMedia,
) {
    return await {
        reply: decodeReplyElement,
        text: decodeTextElement,
        mention: decodeMentionElement,
        image: async (element: MessageSendableElementImage) =>
            decodeImageElement(
                await media.prepareImageElement(
                    element.file,
                    element.imageType,
                    element.imageSubType,
                ),
            ),
        file: async (element: MessageSendableElementFile) =>
            decodeFileElement(await media.prepareFileElement(element.file)),
        face: decodeFaceElement,
        raw: decodeRawElement,
    }[element.type](element as any);
}
