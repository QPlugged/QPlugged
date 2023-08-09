import {
    Fragment,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { ApiContext } from "../../Api";
import { Virtuoso } from "react-virtuoso";
import {
    Avatar,
    Box,
    CircularProgress,
    Stack,
    Typography,
} from "@mui/material";
import { css } from "@emotion/react";
import dayjs from "dayjs";
import toURL from "../../utils/toURL";
import { messageElementsToString } from "../../backend/messaging/converter";

function MessageItemElementReply({
    element,
    entity,
    getMessageBySeq,
}: {
    element: MessageElementReply;
    entity: Entity;
    getMessageBySeq: (seq: string) => Promise<Message>;
}) {
    const api = useContext(ApiContext);
    const [sourceMessage, setSourceMessage] = useState<Message>();

    useEffect(() => {
        (async () => {
            console.log(element.raw.replyElement.sourceMsgIdInRecords);
            api.messaging
                .getPreviousMessages(
                    entity,
                    7,
                    element.raw.replyElement.sourceMsgIdInRecords,
                    false,
                )
                .then((msg) => console.log(msg));
            // const sourceMessage = await getMessageBySeq(element.messageSeq);
            // setSourceMessage(sourceMessage);
        })();
    }, [element, entity, api]);

    return (
        <Stack>
            {sourceMessage && (
                <Typography variant="body1">
                    {sourceMessage.sender.memberName ||
                        sourceMessage.sender.name}
                    {`${messageElementsToString(sourceMessage.elements)}seq${
                        sourceMessage.seq
                    }realseq${element.messageSeq}`}
                    {JSON.stringify(element.raw)}
                </Typography>
            )}
        </Stack>
    );
}

function MessageItemElementText({ element }: { element: MessageElementText }) {
    return (
        <Typography component="span" variant="body1">
            {element.content}
        </Typography>
    );
}

function MessageItemElementImage({
    element,
}: { element: MessageElementImage }) {
    const [currentFile, setCurrentFile] = useState<number>(0);
    const [failed, setFailed] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => setCurrentFile(0), [element]);

    return (
        <Stack
            borderRadius={8}
            width={`${Math.min(element.width!, 300)}px`}
            height={
                loading || failed
                    ? `${Math.min(element.width!, 300) * 0.9}px`
                    : "auto"
            }
            position="relative"
        >
            <Box
                position="absolute"
                left="50%"
                top="50%"
                sx={{ transform: "translate(-50%,-50%)" }}
            >
                {loading ? (
                    <CircularProgress />
                ) : failed ? (
                    <Typography>加载失败</Typography>
                ) : null}
            </Box>

            <img
                src={element.files[currentFile]}
                alt="图片"
                css={css({
                    width: "100%",
                    borderRadius: 8,
                    opacity: loading || failed ? 0 : 1,
                    transition: "opacity 0.1s ease",
                })}
                onLoad={() => setLoading(false)}
                onError={() => {
                    setCurrentFile((oldCurrentFile) => {
                        const currentFile = oldCurrentFile + 1;
                        if (!element.files[currentFile]) {
                            setLoading(false);
                            setFailed(true);
                            return 0;
                        } else return currentFile;
                    });
                }}
            />
        </Stack>
    );
}

function MessageItemElementFace({
    element,
    faceResourceDir,
}: { element: MessageElementFace; faceResourceDir: string }) {
    const url = useMemo(
        () => toURL(`${faceResourceDir}/gif/s${element.faceId}.gif`),
        [element, faceResourceDir],
    );
    return (
        <img
            src={url}
            alt="表情"
            css={css({ width: 28, height: 28, verticalAlign: "middle" })}
        />
    );
}

function MessageItem({
    lastMessage,
    message,
    nextMessage,
    entity,
    avatar,
    loggedInAccount,
    faceResourceDir,
    getMessageBySeq,
}: {
    lastMessage?: Message;
    message: Message;
    nextMessage?: Message;
    entity: Entity;
    avatar: string;
    loggedInAccount: Account;
    faceResourceDir: string;
    getMessageBySeq: (seq: string) => Promise<Message>;
}) {
    const isFirstMessageSent = useMemo(
        () => !lastMessage || lastMessage.sender.uid !== message.sender.uid,
        [lastMessage, message],
    );
    const isLastMessageSent = useMemo(
        () => !nextMessage || nextMessage.sender.uid !== message.sender.uid,
        [nextMessage, message],
    );
    const isSelf = useMemo(
        () => loggedInAccount.uid === message.sender.uid,
        [],
    );
    const senderName = useMemo(
        () => message.sender.memberName || message.sender.name,
        [message],
    );
    const showAvatar = useMemo(
        () => isLastMessageSent && !isSelf,
        [isLastMessageSent, isSelf],
    );
    const showAvatarPlaceholder = useMemo(
        () => !isLastMessageSent && !isSelf,
        [isLastMessageSent, isSelf],
    );
    const showName = useMemo(
        () => isFirstMessageSent && !isSelf && senderName,
        [isFirstMessageSent, isSelf],
    );
    const timeStr = useMemo(
        () => dayjs.unix(message.timestamp).format("HH:mm"),
        [message],
    );
    const isMessageSizeLimited = useMemo(
        () =>
            message.elements.length === 1 &&
            (message.elements[0].type === "text" ||
                message.elements[0].type === "face"),
        [message],
    );
    const isTimeFloat = useMemo(
        () =>
            message.elements[message.elements.length - 1].type !== "text" &&
            message.elements[message.elements.length - 1].type !== "face",
        [message],
    );

    const RADIUS_BIG = 18;
    const RADIUS_SMALL = 6;
    return (
        <Stack
            width="100%"
            direction="row"
            alignItems="flex-end"
            justifyContent={isSelf ? "flex-end" : "flex-start"}
            padding={0.5}
            paddingTop={isFirstMessageSent ? 0.5 : 0.25}
            paddingBottom={isLastMessageSent ? 0.5 : 0.25}
            gap={1}
        >
            {showAvatar && (
                <Avatar
                    src={avatar}
                    sx={{ width: 32, height: 32, flexShrink: 0 }}
                >
                    {(message.sender.memberName || message.sender.name).slice(
                        0,
                        1,
                    ) || null}
                </Avatar>
            )}
            {showAvatarPlaceholder && <Box width={32} flexShrink={0} />}
            <Stack
                direction="column"
                bgcolor="background.paper"
                sx={{
                    borderTopLeftRadius: isSelf
                        ? RADIUS_BIG
                        : isFirstMessageSent
                        ? RADIUS_BIG
                        : RADIUS_SMALL,
                    borderBottomLeftRadius: isSelf
                        ? RADIUS_BIG
                        : isLastMessageSent
                        ? RADIUS_BIG
                        : RADIUS_SMALL,
                    borderTopRightRadius: isSelf
                        ? isLastMessageSent
                            ? RADIUS_BIG
                            : RADIUS_SMALL
                        : RADIUS_BIG,
                    borderBottomRightRadius: isSelf
                        ? isLastMessageSent
                            ? RADIUS_BIG
                            : RADIUS_SMALL
                        : RADIUS_BIG,
                }}
                maxWidth="60%"
                overflow="hidden"
                position="relative"
            >
                {showName && (
                    <Typography
                        color="primary.main"
                        variant="body2"
                        fontSize={15}
                        padding={1.25}
                        paddingBottom={0}
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                    >
                        {senderName}
                    </Typography>
                )}
                <Box
                    padding={1.5}
                    paddingTop={showName ? 0.35 : 1.5}
                    paddingBottom={isTimeFloat ? 1 : 2}
                    minWidth={isMessageSizeLimited ? 100 : "auto"}
                >
                    {message.elements.map((element) => {
                        let child: React.ReactNode;
                        if (element.type === "text")
                            child = (
                                <MessageItemElementText element={element} />
                            );
                        else if (element.type === "image")
                            child = (
                                <MessageItemElementImage element={element} />
                            );
                        else if (element.type === "face")
                            child = (
                                <MessageItemElementFace
                                    element={element}
                                    faceResourceDir={faceResourceDir}
                                />
                            );
                        else if (element.type === "reply") {
                            child = (
                                <MessageItemElementReply
                                    element={element}
                                    entity={entity}
                                    getMessageBySeq={getMessageBySeq}
                                />
                            );
                        } else child = JSON.stringify(element);
                        return <Fragment key={element.id!}>{child}</Fragment>;
                    })}
                    {message.id}
                    <Stack
                        position="absolute"
                        right={0}
                        bottom={0}
                        fontSize={10}
                        width={50}
                        height={20}
                        direction="column"
                        alignItems="center"
                        justifyContent="center"
                        color="text.secondary"
                        sx={{
                            ...(isTimeFloat && {
                                bgcolor: "rgb(0,0,0,0.5)",
                                backdropFilter: "blur(10px)",
                                borderTopLeftRadius: 8,
                            }),
                        }}
                    >
                        {timeStr}
                    </Stack>
                </Box>
            </Stack>
        </Stack>
    );
}

const START_INDEX = Number.MAX_SAFE_INTEGER;
const MESSAGE_COUNT = 80;

export default function MessageList({ entity }: { entity: Entity }) {
    const api = useContext(ApiContext);
    const [authData, setAuthData] = useState<Account>();
    const [faceResourceDir, setFaceResourceDir] = useState<string>();
    const [messages, setMessages] = useState<[number, Message][]>([]);
    const [messagesSeq, setMessagesSeq] = useState<string[]>([]);
    const [avatars, setAvatars] = useState<Record<string, string>>({});
    const [atTop, setAtTop] = useState<boolean>(false);
    const [firstItemIndex, setFirstItemIndex] = useState<number>(START_INDEX);

    const fetchMoreMessages = useCallback(async () => {
        if (atTop) return;
        setMessages((oldMessages) => {
            (async () => {
                const moreMessages = await api.messaging.getPreviousMessages(
                    entity,
                    oldMessages.length !== 0
                        ? MESSAGE_COUNT + 1
                        : MESSAGE_COUNT,
                    oldMessages?.[0]?.[1]?.id || "0",
                );
                if (oldMessages.length !== 0)
                    moreMessages.splice(moreMessages.length - 1);
                if (moreMessages.length === 0) {
                    setAtTop(true);
                    return;
                }

                setAvatars((oldAvatars) => {
                    (async () => {
                        const entities = moreMessages
                            .filter((message) => {
                                return !oldAvatars[message.sender.uid];
                            })
                            .map((message) => ({
                                type: "user" as const,
                                uid: message.sender.uid,
                            }));
                        const avatarsMap = await api.messaging.getAvatars(
                            entities,
                        );
                        for (const [entity, avatar] of avatarsMap)
                            setAvatars((oldAvatars) => ({
                                ...oldAvatars,
                                [entity.uid]: avatar,
                            }));
                    })();
                    return oldAvatars;
                });

                const newMessages = moreMessages.map(
                    (message, idx): [number, Message] => [
                        moreMessages.length -
                            idx +
                            (oldMessages?.length || 0) -
                            1,
                        message,
                    ],
                );
                setMessages((oldMessages) => [...newMessages, ...oldMessages]);
                setMessagesSeq((oldMessagesSeq) => [
                    ...newMessages.map(([_, message]) => message.seq),
                    ...oldMessagesSeq,
                ]);
                setFirstItemIndex(
                    (oldFirstItemIndex) => oldFirstItemIndex - MESSAGE_COUNT,
                );
            })();
            return oldMessages;
        });
    }, [entity, api, atTop]);

    const getMessageBySeq = useCallback(
        async (seq: string) => {
            const MAX_TRIES = 1;
            for (let i = 0; i < MAX_TRIES; i++) {
                const idx = messagesSeq.indexOf(seq);
                const message = messages?.[idx]?.[1];
                if (message) return message;
                else await fetchMoreMessages();
            }
            throw new Error(
                `无法通过 seq ${seq} 找到消息，已尝试 ${MAX_TRIES} 次`,
            );
        },
        [messagesSeq, messages, fetchMoreMessages],
    );

    useEffect(() => {
        (async () => {
            const authData = await api.login.getCurrentAccount();
            setAuthData(authData);
            const faceResourceDir = await api.messaging.getFaceResourceDir();
            setFaceResourceDir(faceResourceDir);
        })();
    }, [api]);

    useEffect(() => {
        setMessages([]);
        setMessagesSeq([]);
        setAvatars({});
        setAtTop(false);
        setFirstItemIndex(START_INDEX);
    }, [entity]);

    useEffect(() => {
        fetchMoreMessages();
    }, [entity, fetchMoreMessages]);

    console.log(messagesSeq);

    return (
        <Virtuoso
            data={messages}
            css={css({ width: "100%", height: "100%" })}
            overscan={MESSAGE_COUNT}
            firstItemIndex={firstItemIndex}
            initialTopMostItemIndex={MESSAGE_COUNT - 1}
            startReached={() => fetchMoreMessages()}
            followOutput={true}
            totalCount={MESSAGE_COUNT}
            itemContent={(_, [idx, message]) => (
                <MessageItem
                    lastMessage={messages[messages.length - idx - 2]?.[1]}
                    message={message}
                    nextMessage={messages[messages.length - idx]?.[1]}
                    entity={entity}
                    avatar={avatars[message.sender.uid]}
                    loggedInAccount={authData!}
                    faceResourceDir={faceResourceDir!}
                    getMessageBySeq={getMessageBySeq}
                />
            )}
        />
    );
}
