export function userToEntity(user: User): Entity {
    return { type: "user", uid: user.uid };
}

export function groupToEntity(group: Group): Entity {
    return { type: "group", uid: group.uid };
}

export function filterEntities(entities: Entity[], type: EntityType): string[] {
    return entities
        .filter((entity) => entity.type === type)
        .map((entity) => entity.uid);
}

export function messageElementsToString(elements: MessageNonSendableElement[]) {
    return elements
        .map((element) => {
            if (element.type === "text")
                return element.content.replaceAll("\n", " ");
            else if (element.type === "image") return "[图片]";
            else if (element.type === "face") return "[表情]";
            else return "";
        })
        .join("");
}
