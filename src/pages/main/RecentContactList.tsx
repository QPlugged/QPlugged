import { ApiContext } from "../../Api";
import {
    groupToEntity,
    messageElementsToString,
    userToEntity,
} from "../../backend/messaging/converter";
import RemoteAvatar from "../../components/RemoteAvatar";
import Scrollbar from "../../components/Scrollbar";
import {
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    Typography,
} from "@mui/material";
import dayjs from "dayjs";
import equal from "fast-deep-equal";
import { useContext, useEffect, useState } from "react";

interface RecentContact {
    entity: Entity;
    avatar: string;
    name: string;
    latestMessage?: Message;
}

export default function RecentContactList({
    entity,
    onSelectEntity,
}: { entity: Entity | undefined; onSelectEntity: (entity: Entity) => void }) {
    const api = useContext(ApiContext);
    const [entities, setEntities] = useState<
        Record<string, [string, "user", User] | [string, "group", Group]>
    >({});
    const [recentContacts, setRecentContacts] = useState<RecentContact[]>([]);

    useEffect(() => {
        (async () => {
            const entitiesList: Record<
                string,
                [string, "user", User] | [string, "group", Group]
            > = {};
            const users = await api.messaging.getFriendsList(false);
            const groups = await api.messaging.getGroupsList(false);
            const entities = [
                ...users.map((user) => userToEntity(user)),
                ...groups.map((group) => groupToEntity(group)),
            ];
            const avatars = await api.messaging.getAvatars(entities);
            for (const entity of entities)
                if (entity.type === "user")
                    entitiesList[JSON.stringify(entity)] = [
                        avatars.get(entity)!,
                        entity.type,
                        users.find((user) => user.uid === entity.uid)!,
                    ];
                else if (entity.type === "group")
                    entitiesList[JSON.stringify(entity)] = [
                        avatars.get(entity)!,
                        entity.type,
                        groups.find((groups) => groups.uid === entity.uid)!,
                    ];
            setEntities(entitiesList);
        })();
    }, [api]);

    useEffect(() => {
        (async () => {
            const list = await Promise.all(
                Object.keys(entities).map(
                    async (_entity): Promise<RecentContact> => {
                        const [avatar, _, info] = entities[_entity];
                        const entity: Entity = JSON.parse(_entity);
                        return {
                            entity: entity,
                            avatar: avatar,
                            name: info.name,
                            latestMessage: (
                                await api.messaging.getPreviousMessages(
                                    entity,
                                    1,
                                )
                            )[0],
                        };
                    },
                ),
            );
            const sortedList = list.sort((a, b) => {
                if (a.latestMessage && b.latestMessage)
                    return (
                        b.latestMessage.timestamp - a.latestMessage.timestamp
                    );
                else return a.latestMessage ? -1 : b.latestMessage ? 1 : 0;
            });
            setRecentContacts(sortedList);
        })();
    }, [entities]);

    useEffect(() => {
        const listener = async (messages: Message[]) => {
            const filteredMessages = messages.filter(
                (message) => !entities[JSON.stringify(message.entity)],
            );
            const avatars = await api.messaging.getAvatars(
                filteredMessages.map((message) => message.entity),
            );
            for (const message of filteredMessages) {
                const _entity = JSON.stringify(message.entity);
                const avatar = avatars.get(message.entity)!;
                if (message.entity.type === "user") {
                    const info = await api.messaging.getUserInfo(
                        message.entity.uid,
                    );
                    setEntities((entities) => {
                        return {
                            ...entities,
                            [_entity]: [avatar, "user", info],
                        };
                    });
                }
                if (message.entity.type === "group") {
                    const info = await api.messaging.getGroupInfo(
                        message.entity.uid,
                    );
                    setEntities((entities) => {
                        return {
                            ...entities,
                            [_entity]: [avatar, "group", info],
                        };
                    });
                }
            }
        };
        api.messaging.on("new-messages", listener);
        return () => {
            api.messaging.off("new-messages", listener);
        };
    }, [api]);

    return (
        <Scrollbar>
            <List
                sx={{
                    overflowX: "hidden",
                }}
                dense
            >
                {recentContacts.map((item) => (
                    <ListItem key={item.entity.uid} disablePadding>
                        <ListItemButton
                            sx={{ height: 72 }}
                            selected={equal(item.entity, entity)}
                            onClick={() => onSelectEntity(item.entity)}
                        >
                            <ListItemAvatar>
                                <RemoteAvatar
                                    name={item.name}
                                    file={item.avatar}
                                    size={40}
                                />
                            </ListItemAvatar>
                            <ListItemText
                                primary={
                                    <>
                                        <span
                                            css={{
                                                flex: 1,
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                                width: "100%",
                                                overflow: "hidden",
                                            }}
                                        >
                                            {item.name}
                                        </span>
                                        {item.latestMessage && (
                                            <Typography
                                                sx={{
                                                    display: "inline",
                                                }}
                                                component="span"
                                                variant="body2"
                                                color="text.secondary"
                                                fontSize="6px"
                                                flexShrink={0}
                                            >
                                                {dayjs
                                                    .unix(
                                                        item.latestMessage
                                                            .timestamp,
                                                    )
                                                    .format("HH:mm")}
                                            </Typography>
                                        )}
                                    </>
                                }
                                primaryTypographyProps={{
                                    sx: {
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 1,
                                    },
                                }}
                                secondary={
                                    item.latestMessage && (
                                        <>
                                            <Typography
                                                sx={{
                                                    display: "inline",
                                                }}
                                                component="span"
                                                variant="body2"
                                                color="text.primary"
                                            >
                                                {`${
                                                    item.latestMessage.sender
                                                        .memberName ||
                                                    item.latestMessage.sender
                                                        .name
                                                }: `}
                                            </Typography>
                                            {messageElementsToString(
                                                item.latestMessage.elements,
                                            )}
                                        </>
                                    )
                                }
                                secondaryTypographyProps={{
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    width: "100%",
                                    overflow: "hidden",
                                }}
                            />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </Scrollbar>
    );
}
