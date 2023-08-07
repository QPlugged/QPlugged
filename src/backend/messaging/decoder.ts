export function decodeTextElement(element: MessageElementText) {
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

export function decodeImageElement(data: any) {
    return {
        elementType: 2,
        elementId: "",
        picElement: data,
    };
}

export function decodeFaceElement(element: MessageElementFace) {
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

export function decodeRawElement(element: MessageElementRaw) {
    return element.raw;
}

export function decodePeer(data: Peer): any {
    return {
        chatType: { pm: 1, group: 1 }[data.type] || data.type,
        peerUid: data.uid,
        guildId: data.guildId || "",
    };
}
