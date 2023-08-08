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
