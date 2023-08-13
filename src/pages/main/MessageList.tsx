import { ApiContext } from "../../Api";
import { messageElementsToString } from "../../backend/messaging/converter";
import Scrollbar from "../../components/Scrollbar";
import toURL from "../../utils/toURL";
import { css } from "@emotion/react";
import {
    Avatar,
    Box,
    Button,
    CircularProgress,
    Link,
    Stack,
    Typography,
} from "@mui/material";
import { open } from "@tauri-apps/plugin-shell";
import dayjs from "dayjs";
import * as linkify from "linkifyjs";
import {
    Fragment,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";

type JumpToMessageFunc = (message: Message) => Promise<void>;
type ShowProfileFunc = (entity: Entity) => void;

function MessageItemElementReply({
    element,
    entity,
    jumpToMessage,
}: {
    element: MessageNonSendableElementReply;
    entity: Entity;
    jumpToMessage: JumpToMessageFunc;
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
        <Stack direction="row" paddingBottom={0.5} sx={{ cursor: "pointer" }}>
            <Box
                bgcolor="secondary.main"
                width="3px"
                borderRadius="1.5px"
                flexShrink={0}
                marginTop={0.5}
                marginBottom={0.5}
            />

            {sourceMessage && (
                <Button
                    color="inherit"
                    onClick={() => jumpToMessage(sourceMessage)}
                    sx={{ textTransform: "none" }}
                >
                    <Stack direction="column" gap={0.1} alignItems="flex-start">
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
                </Button>
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
        <Typography fontStyle="italic" fontSize={12} color="text.secondary">
            {element.operator.uid !== element.sender.uid ? (
                <>
                    <Typography
                        color="primary.main"
                        component="span"
                        fontSize="inherit"
                    >
                        {element.operator.memberName || element.operator.name}
                    </Typography>
                    撤回了{" "}
                    <Typography
                        color="secondary.main"
                        component="span"
                        fontSize="inherit"
                    >
                        {element.sender.memberName || element.sender.name}
                    </Typography>{" "}
                    的一条消息。
                </>
            ) : (
                "撤回了一条消息。"
            )}
        </Typography>
    );
}

function MessageItemElementText({
    element,
}: {
    element: MessageNonSendableElementText;
}) {
    const components = useMemo(() => {
        const components: (["text", string] | ["url", string, string])[] = [];
        let cursor = 0;
        const ret = linkify.find(element.content, { defaultProtocol: "https" });
        ret.map(({ start, href, end }) => {
            components.push(
                ["text", element.content.substring(cursor, start)],
                ["url", href, element.content.substring(start, end)],
            );
            cursor = end;
        });
        components.push(["text", element.content.substring(cursor)]);
        return components;
    }, [element]);

    return (
        <>
            {components.map(([type, ...args], idx) => (
                // rome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                <Fragment key={idx}>
                    {type === "text" ? (
                        args[0].split("\n").map((text, idx, array) => (
                            // rome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                            <Fragment key={idx}>
                                <span>{text}</span>
                                {idx !== array.length - 1 && <br />}
                            </Fragment>
                        ))
                    ) : type === "url" ? (
                        <Link component="button" onClick={() => open(args[0])}>
                            {args[1]}
                        </Link>
                    ) : null}
                </Fragment>
            ))}
        </>
    );
}

function MessageItemElementMention({
    element,
    showProfile,
}: {
    element: MessageNonSendableElementMention;
    showProfile: ShowProfileFunc;
}) {
    const onClick = useCallback(
        () => showProfile({ type: "user", uid: element.uid }),
        [element],
    );

    return (
        <Link component="button" underline="hover" onClick={onClick}>
            {element.content}
        </Link>
    );
}

function MessageItemElementImage({
    element,
    onlyHaveImage,
}: { element: MessageNonSendableElementImage; onlyHaveImage: boolean }) {
    const [failed, setFailed] = useState<boolean>(false);
    const [file, setFile] = useState<string>();
    const MAX_SIZE = 300;
    const size = useMemo<[number, number]>(() => {
        let width = element.width;
        let height = element.height;
        if (width > MAX_SIZE) {
            height = (height / width) * MAX_SIZE;
            width = MAX_SIZE;
        }
        if (height > MAX_SIZE) {
            width = (width / height) * MAX_SIZE;
            height = MAX_SIZE;
        }
        return [width, height];
    }, [element]);

    useEffect(() => {
        element.progress.then((file) => setFile(file));
    });

    return (
        <Stack
            borderRadius={onlyHaveImage ? 0 : 2}
            width={`${size[0]}px`}
            height={`${size[1]}px`}
            overflow="hidden"
            position="relative"
        >
            <Box
                position="absolute"
                left="50%"
                top="50%"
                sx={{ transform: "translate(-50%,-50%)" }}
            >
                {!file ? (
                    <CircularProgress />
                ) : failed ? (
                    <Typography>{JSON.stringify(element)}</Typography>
                ) : null}
            </Box>
            {file && (
                <img
                    src={file}
                    alt="图片"
                    css={css({
                        width: "100%",
                        height: "100%",
                        opacity: failed ? 0 : 1,
                        transition: "opacity 0.1s ease",
                    })}
                    onError={() => setFailed(true)}
                />
            )}
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
            css={css({ width: 22, height: 22, verticalAlign: "middle" })}
        />
    );
}

function MessageItem({
    lastMessage,
    message,
    nextMessage,
    highlighted,
    entity,
    avatar,
    loggedInAccount,
    faceResourceDir,
    jumpToMessage,
    showProfile,
}: {
    lastMessage?: Message;
    message: Message;
    nextMessage?: Message;
    highlighted: boolean;
    entity: Entity;
    avatar: string;
    loggedInAccount: Account;
    faceResourceDir: string;
    jumpToMessage: JumpToMessageFunc;
    showProfile: ShowProfileFunc;
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
            showName &&
            message.elements.length === 1 &&
            (message.elements[0].type === "text" ||
                message.elements[0].type === "face"),
        [message],
    );
    const onlyHaveImage = useMemo(
        () =>
            message.elements.length === 1 &&
            message.elements[0].type === "image",
        [message],
    );

    const RADIUS_BIG = 12;
    const RADIUS_SMALL = 6;

    return (
        <Stack
            bgcolor={highlighted ? "primary.main" : "transparent"}
            className="message-item"
            width="100%"
            direction={isSelf ? "row-reverse" : "row"}
            alignItems="flex-end"
            justifyContent="flex-start"
            padding={0.5}
            paddingTop={isFirstMessageSent ? 0.5 : 0.25}
            paddingBottom={isLastMessageSent ? 0.5 : 0.25}
            gap={1}
            sx={{
                transition: "all 0.2s ease",
                "&:hover .message-item-time": {
                    opacity: 1,
                },
            }}
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
                bgcolor={
                    isSelf
                        ? "message.self.background"
                        : "message.others.background"
                }
                boxShadow={1}
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
                        color="primary.main"
                        variant="body2"
                        fontSize={13}
                        padding={1}
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                    >
                        {senderName}
                    </Typography>
                )}
                <Box
                    color={isSelf ? "message.self.text" : "message.others.text"}
                    padding={onlyHaveImage ? 0 : 1.25}
                    paddingTop={
                        onlyHaveImage ? (showName ? 4 : 0) : showName ? 4 : 1.25
                    }
                    paddingBottom={onlyHaveImage ? 0 : 1.25}
                    minWidth={isMessageSizeLimited ? 100 : "auto"}
                    lineHeight={1.1}
                    fontSize={14}
                >
                    {message.elements.map((element) => {
                        let child: React.ReactNode;
                        if (element.type === "reply")
                            child = (
                                <MessageItemElementReply
                                    element={element}
                                    entity={entity}
                                    jumpToMessage={jumpToMessage}
                                />
                            );
                        else if (element.type === "revoke")
                            child = (
                                <MessageItemElementRevoke element={element} />
                            );
                        else if (element.type === "text")
                            child = (
                                <MessageItemElementText element={element} />
                            );
                        else if (element.type === "mention")
                            child = (
                                <MessageItemElementMention
                                    element={element}
                                    showProfile={showProfile}
                                />
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
                        else if (element.type === "raw")
                            child = `不支持渲染此元素: ${JSON.stringify(
                                element.raw,
                            )}`;
                        return <Fragment key={element.id!}>{child}</Fragment>;
                    })}
                </Box>
            </Stack>
            <Stack
                className="message-item-time"
                fontSize={10}
                direction="column"
                alignItems="center"
                justifyContent="center"
                color="text.secondary"
                sx={{ opacity: 0, transition: "opacity 0.1s ease" }}
            >
                {timeStr}
            </Stack>
        </Stack>
    );
}

const START_INDEX = Number.MAX_SAFE_INTEGER;
const MESSAGE_COUNT = 80;

export default function MessageList({ entity }: { entity: Entity }) {
    const api = useContext(ApiContext);
    const listRef = useRef<VirtuosoHandle>(null);
    const [authData, setAuthData] = useState<Account>();
    const [faceResourceDir, setFaceResourceDir] = useState<string>();
    const [messages, setMessages] = useState<[number, Message][]>([]);
    const [highlightedMessageId, setHighlightedMessageId] = useState<string>();
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

    const jumpToMessage = useCallback(
        async (message: Message) => {
            const MAX_TRIES = 3;
            const listHandle = listRef.current;
            if (!listHandle) throw new Error("列表未初始化");
            for (let i = 0; i < MAX_TRIES; i++) {
                const sourceMessage = messages.find(
                    ([_, curMessage]) => curMessage.id === message.id,
                );

                if (sourceMessage) {
                    return await new Promise<void>((resolve) =>
                        listHandle.scrollIntoView({
                            index: messages.length - sourceMessage[0] - 1,
                            behavior: "smooth",
                            align: "center",
                            done() {
                                setHighlightedMessageId(sourceMessage[1].id);
                                resolve();
                            },
                        }),
                    );
                }
                if (i !== MAX_TRIES - 1) await fetchMoreMessages();
                else throw new Error("源消息距离太远或已不存在");
            }
        },
        [fetchMoreMessages, messages],
    );

    useEffect(() => {
        if (!highlightedMessageId) return;
        const timer = setTimeout(
            () => setHighlightedMessageId(undefined),
            1000,
        );
        return () => clearTimeout(timer);
    }, [highlightedMessageId]);

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
        <Box
            width="100%"
            height="100%"
            sx={{
                background: `url("${toURL(
                    "C:\\Users\\Flysoft\\Desktop\\屏幕截图 2023-08-13 210354.png",
                )}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
            }}
        >
            <Virtuoso
                ref={listRef}
                components={{
                    Scroller: Scrollbar,
                }}
                data={messages}
                css={css({ width: "100%", height: "100%" })}
                overscan={800}
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
                        highlighted={highlightedMessageId === message.id}
                        entity={entity}
                        avatar={avatars[message.sender.uid]}
                        loggedInAccount={authData!}
                        faceResourceDir={faceResourceDir!}
                        jumpToMessage={jumpToMessage}
                        showProfile={() => undefined}
                    />
                )}
            />
        </Box>
    );
}
