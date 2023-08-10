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
}: {
    element: MessageNonSendableElementReply;
    entity: Entity;
}) {
    const api = useContext(ApiContext);
    const [sourceMessage, setSourceMessage] = useState<Message>();

    useEffect(() => {
        (async () => {
            const messages = await api.messaging.getPreviousMessagesBySeq(
                entity,
                7,
                element.raw.replyElement.replayMsgSeq,
                false,
            );
            setSourceMessage(messages[0]);
        })();
    }, [element, entity, api]);

    return (
        <Stack direction="row" gap={1} paddingBottom={1}>
            <Box
                bgcolor="secondary.main"
                width="3px"
                borderRadius="1.5px"
                flexShrink={0}
            />
            {sourceMessage && (
                <Stack direction="column" gap={0.5}>
                    <Typography variant="body2" color="secondary.main">
                        {sourceMessage.sender.memberName ||
                            sourceMessage.sender.name}
                    </Typography>
                    <Typography
                        variant="body2"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        sx={{
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: "2",
                        }}
                    >
                        {messageElementsToString(sourceMessage.elements)}
                    </Typography>
                </Stack>
            )}
        </Stack>
    );
}

function MessageItemElementRevoke({
    element,
}: {
    element: MessageNonSendableElementRevoke;
}) {
    return (
        <Typography fontStyle="italic">
            {element.operator.uid !== element.sender.uid ? (
                <>
                    <Typography color="primary.main" component="span">
                        {element.operator.memberName || element.operator.name}
                    </Typography>{" "}
                    撤回了{" "}
                    <Typography color="secondary.main" component="span">
                        {element.sender.memberName || element.sender.name}
                    </Typography>{" "}
                    的一条消息。
                </>
            ) : (
                <>
                    <Typography color="secondary.main" component="span">
                        {element.sender.memberName || element.sender.name}
                    </Typography>{" "}
                    撤回了一条消息。
                </>
            )}
        </Typography>
    );
}

function MessageItemElementText({
    element,
}: { element: MessageNonSendableElementText }) {
    return (
        <Typography component="span" variant="body1">
            {element.content}
        </Typography>
    );
}

function MessageItemElementImage({
    element,
    onlyHaveImage,
}: { element: MessageNonSendableElementImage; onlyHaveImage: boolean }) {
    const [currentFile, setCurrentFile] = useState<number>(0);
    const [failed, setFailed] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => setCurrentFile(0), [element]);

    return (
        <Stack
            borderRadius={onlyHaveImage ? 0 : 2}
            width={`${Math.min(element.width!, 300)}px`}
            height={
                loading || failed
                    ? `${Math.min(element.width!, 300) * 0.9}px`
                    : "auto"
            }
            overflow="hidden"
            position="relative"
        >
            {onlyHaveImage}
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
}: { element: MessageNonSendableElementFace; faceResourceDir: string }) {
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
}: {
    lastMessage?: Message;
    message: Message;
    nextMessage?: Message;
    entity: Entity;
    avatar: string;
    loggedInAccount: Account;
    faceResourceDir: string;
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
    const isTimeStatic = useMemo(
        () =>
            message.elements[message.elements.length - 1].type === "text" ||
            message.elements[message.elements.length - 1].type === "face" ||
            message.elements[message.elements.length - 1].type === "revoke",
        [message],
    );
    const onlyHaveImage = useMemo(
        () =>
            message.elements.length === 1 &&
            message.elements[0].type === "image",
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
                        position="absolute"
                        left={0}
                        right={0}
                        top={0}
                        height={32}
                        color="primary.main"
                        variant="body2"
                        fontSize={15}
                        padding={1.25}
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                    >
                        {senderName}
                    </Typography>
                )}
                <Box
                    padding={onlyHaveImage ? 0 : 1.5}
                    paddingTop={
                        onlyHaveImage
                            ? showName
                                ? 4.5
                                : 0
                            : showName
                            ? 4.35
                            : 1.5
                    }
                    paddingBottom={onlyHaveImage ? 0 : isTimeStatic ? 2 : 1}
                    minWidth={isMessageSizeLimited ? 150 : "auto"}
                >
                    {message.elements.map((element) => {
                        let child: React.ReactNode;
                        if (element.type === "text")
                            child = (
                                <MessageItemElementText element={element} />
                            );
                        else if (element.type === "image")
                            child = (
                                <MessageItemElementImage
                                    element={element}
                                    onlyHaveImage={onlyHaveImage}
                                />
                            );
                        else if (element.type === "face")
                            child = (
                                <MessageItemElementFace
                                    element={element}
                                    faceResourceDir={faceResourceDir}
                                />
                            );
                        else if (element.type === "reply")
                            child = (
                                <MessageItemElementReply
                                    element={element}
                                    entity={entity}
                                />
                            );
                        else if (element.type === "revoke")
                            child = (
                                <MessageItemElementRevoke element={element} />
                            );
                        else child = JSON.stringify(element);
                        return <Fragment key={element.id!}>{child}</Fragment>;
                    })}
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
                            ...(!isTimeStatic && {
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
                setFirstItemIndex(
                    (oldFirstItemIndex) => oldFirstItemIndex - MESSAGE_COUNT,
                );
            })();
            return oldMessages;
        });
    }, [entity, api, atTop]);

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
        setAvatars({});
        setAtTop(false);
        setFirstItemIndex(START_INDEX);
    }, [entity]);

    useEffect(() => {
        fetchMoreMessages();
    }, [entity, fetchMoreMessages]);

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
                />
            )}
        />
    );
}
