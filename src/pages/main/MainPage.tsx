import { Api, ApiContext } from "../../Api";
import { groupToEntity, userToEntity } from "../../backend/messaging/converter";
import useResize from "../../hooks/useResize";
import {
    Avatar,
    Box,
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    Stack,
    Typography,
} from "@mui/material";
import { LogicalSize, getCurrent } from "@tauri-apps/plugin-window";
import dayjs from "dayjs";
import { useContext, useEffect, useState } from "react";

interface RecentContact {
    entity: Entity;
    avatar: string;
    name: string;
    latestMessage?: Message;
}

function useRecentContactList(api: Api) {
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

    return recentContacts;
}

function messageToString(elements: MessageElement[]) {
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

export function MainPage() {
    const api = useContext(ApiContext);
    const recentContacts = useRecentContactList(api);
    const [recentContactListWidth, recentContactListSetResizing] = useResize(
        300,
        "x",
        80,
        380,
    );

    useEffect(() => {
        const win = getCurrent();
        win.setSize(new LogicalSize(1000, 700));
        win.setResizable(true);
    }, []);

    return (
        <Stack direction="row" width="100%" height="100%" overflow="hidden">
            <Stack direction="column">
                <Box>Placeholder</Box>
                <Box
                    position="relative"
                    height="100%"
                    style={{ width: recentContactListWidth }}
                >
                    <List
                        sx={{
                            position: "absolute",
                            overflowY: "auto",
                            overflowX: "hidden",
                            inset: 0,
                        }}
                        dense
                    >
                        {recentContacts.map((item) => (
                            <ListItem key={item.entity.uid} disablePadding>
                                <ListItemButton sx={{ height: 72 }}>
                                    <ListItemAvatar>
                                        <Avatar src={item.avatar} />
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <>
                                                <span
                                                    css={{
                                                        flex: 1,
                                                        textOverflow:
                                                            "ellipsis",
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
                                                                item
                                                                    .latestMessage
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
                                                            item.latestMessage
                                                                .sender
                                                                .memberName ||
                                                            item.latestMessage
                                                                .sender.name
                                                        }: `}
                                                    </Typography>
                                                    {messageToString(
                                                        item.latestMessage
                                                            .elements,
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
                    <Box
                        position="absolute"
                        top={0}
                        bottom={0}
                        right={-8}
                        width={8}
                        sx={{ cursor: "e-resize" }}
                        onMouseDown={() => recentContactListSetResizing(true)}
                    />
                </Box>
            </Stack>
            <Stack direction="column">Chat box</Stack>
        </Stack>
    );
}
