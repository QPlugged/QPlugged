import { ApiContext } from "../../Api";
import RemoteAvatar from "../../components/RemoteAvatar";
import RemoteFixedSizeImage from "../../components/RemoteFixedSizeImage";
import Scrollbar from "../../components/Scrollbar";
import ChatBox from "./ChatBox";
import { css } from "@emotion/react";
import { ArrowDownward } from "@mui/icons-material";
import {
    Box,
    Button,
    CircularProgress,
    Fab,
    Grow,
    Link,
    Stack,
    Typography,
    useColorScheme,
} from "@mui/material";
import dayjs from "dayjs";
import equal from "fast-deep-equal";
import hljs from "highlight.js";
import Lottie from "lottie-react";
import MarkdownIt from "markdown-it";
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
                element.sourceMessageSeq,
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

            <Button
                color="inherit"
                onClick={() => sourceMessage && jumpToMessage(sourceMessage)}
                sx={{
                    textTransform: "none",
                    textAlign: "left",
                    flex: 1,
                    justifyContent: "flex-start",
                }}
            >
                <Stack direction="column" gap={0.1} alignItems="flex-start">
                    <Typography variant="body2" color="secondary.main">
                        {sourceMessage
                            ? sourceMessage.sender.memberName ||
                              sourceMessage.sender.name
                            : "-"}
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
                        {element.sourceMessageText}
                    </Typography>
                </Stack>
            </Button>
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
                    </Typography>{" "}
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

const markdownIt: MarkdownIt = new MarkdownIt({
    linkify: true,
    highlight(str, lang, _) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return `<pre class="hljs"><code>${
                    hljs.highlight(str, {
                        language: lang,
                        ignoreIllegals: true,
                    }).value
                }</code></pre>`;
            } catch (__) {}
        }

        return `<pre class="hljs"><code>${markdownIt.utils.escapeHtml(
            str,
        )}</code></pre>`;
    },
});
markdownIt.renderer.rules.paragraph_open = () => "<span>";
markdownIt.renderer.rules.paragraph_close = (tokens, idx) =>
    `</span>${idx !== tokens.length - 1 ? "<br>" : ""}`;

function MessageItemElementText({
    element,
}: {
    element: MessageNonSendableElementText;
}) {
    const html = useMemo(() => markdownIt.render(element.content), [element]);

    return (
        <>
            <span
                // rome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
                dangerouslySetInnerHTML={{ __html: html }}
                css={{
                    "& a": {
                        margin: 0,
                        fontFamily: "inherit",
                        fontWeight: "inherit",
                        fontSize: "inherit",
                        lineHeight: "inherit",
                        letterSpacing: "inherit",
                        color: "var(--mui-palette-primary-main)",
                        textDecoration: "underline",
                        textDecorationColor:
                            "rgba(var(--mui-palette-primary-mainChannel) / 0.4)",
                        "&:hover": {
                            textDecorationColor: "inherit",
                        },
                    },
                    "& pre": {
                        margin: "2px 0",
                        background: "none",
                    },
                    "& pre, & code": {
                        fontFamily:
                            "ui-monospace,SFMono-Regular,SF Mono,Menlo,Consolas,Liberation Mono,monospace",
                    },
                }}
            />
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
    const MAX_SIZE = 300;
    const [width, height] = useMemo<[number, number]>(() => {
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
    const [file, setFile] = useState<string>();

    useEffect(() => {
        (async () => {
            const file = await element.progress;
            setFile(file);
        })();
    }, [element]);

    return (
        <Box
            borderRadius={onlyHaveImage ? 0 : 2}
            overflow="hidden"
            width="fit-content"
        >
            <RemoteFixedSizeImage
                width={width}
                height={height}
                file={file}
                alt="图片"
            />
        </Box>
    );
}

function MessageItemElementFace({
    element,
    faceResourceDir,
    lottieResourceDir,
}: {
    element: MessageNonSendableElementFace;
    faceResourceDir: string;
    lottieResourceDir: string;
}) {
    const api = useContext(ApiContext);
    const file = useMemo(
        () =>
            element.faceType === "typcial-1"
                ? `${faceResourceDir}/gif/s${element.faceId}.gif`
                : `${faceResourceDir}/apng/s${element.faceId}.png`,
        [faceResourceDir, element],
    );
    const [lottieRes, setLottieRes] = useState<any>();

    useEffect(() => {
        if (element.faceType === "big")
            (async () => {
                const file = `${lottieResourceDir}/1/${element.faceBigId}/${element.faceBigId}.json`;
                const res = JSON.parse(await api.fs.readTextFile(file));
                setLottieRes(res);
            })();
    }, [element, api, lottieResourceDir]);

    return element.faceType === "big" ? (
        <Box sx={{ width: "160px", height: "160px", margin: "-12px" }}>
            {lottieRes ? (
                <Lottie animationData={lottieRes} />
            ) : (
                <Box
                    position="absolute"
                    left="50%"
                    top="50%"
                    sx={{ transform: "translate(-50%,-50%)" }}
                >
                    <CircularProgress />
                </Box>
            )}
        </Box>
    ) : (
        <RemoteFixedSizeImage
            width={22}
            height={22}
            file={file}
            alt="动画表情"
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
    lottieResourceDir,
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
    lottieResourceDir: string;
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
        [message, loggedInAccount],
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
    const RADIUS_SMALL = 4;

    return (
        <Stack
            bgcolor={highlighted ? "primary.main" : "transparent"}
            className="message-item"
            width="100%"
            direction={isSelf ? "row-reverse" : "row"}
            alignItems="flex-end"
            justifyContent="flex-start"
            padding={1.1}
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
                <RemoteAvatar name={senderName} file={avatar} size={32} />
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
                        ? isFirstMessageSent
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
                                    lottieResourceDir={lottieResourceDir}
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
const MESSAGE_COUNT = 50;

export default function MessageList({ entity }: { entity: Entity }) {
    const api = useContext(ApiContext);
    const listRef = useRef<VirtuosoHandle>(null);
    const [authData, setAuthData] = useState<Account>();
    const [faceResourceDir, setFaceResourceDir] = useState<string>();
    const [lottieResourceDir, setLottieResourceDir] = useState<string>();
    const [messages, setMessages] = useState<Map<string, Message>>(new Map());
    const [messagesId, setMessagesId] = useState<string[]>([]);
    const [highlightedMessageId, setHighlightedMessageId] = useState<string>();
    const [avatars, setAvatars] = useState<Record<string, string>>({});
    const [atTop, setAtTop] = useState<boolean>(false);
    const [atBottom, setAtBottom] = useState<boolean>(true);
    const [firstItemIndex, setFirstItemIndex] = useState<number>(START_INDEX);
    const { colorScheme } = useColorScheme();

    const fetchMoreMessages = useCallback(async () => {
        if (atTop) return;
        return await new Promise<Map<string, Message> | undefined>(
            (resolve) => {
                setMessages((oldMessages) => {
                    setMessagesId((oldMessagesId) => {
                        (async () => {
                            const moreMessages =
                                await api.messaging.getPreviousMessages(
                                    entity,
                                    oldMessages.size !== 0
                                        ? MESSAGE_COUNT + 1
                                        : MESSAGE_COUNT,
                                    oldMessagesId[0] || "0",
                                );
                            if (oldMessages.size !== 0)
                                moreMessages.splice(moreMessages.length - 1);
                            if (moreMessages.length === 0) {
                                setAtTop(true);
                                resolve(undefined);
                                return;
                            }

                            setFirstItemIndex(
                                (oldFirstItemIndex) =>
                                    oldFirstItemIndex - moreMessages.length,
                            );
                            setMessages((oldMessages) => {
                                let map = oldMessages;
                                for (const message of moreMessages) {
                                    map = map.set(message.id, message);
                                }
                                resolve(messages);
                                return new Map(map);
                            });
                            setMessagesId((oldMessagesId) => [
                                ...moreMessages.map((message) => message.id),
                                ...oldMessagesId,
                            ]);
                        })();
                        return oldMessagesId;
                    });
                    return oldMessages;
                });
            },
        );
    }, [entity, api, atTop]);

    const jumpToMessage = useCallback(
        async (message: Message) => {
            const MAX_TRIES = 3;
            const listHandle = listRef.current;
            if (!listHandle) throw new Error("列表未初始化");
            let _messages = messages;
            for (let i = 0; i < MAX_TRIES; i++) {
                const sourceMessage = _messages.get(message.id);
                if (sourceMessage) {
                    return await new Promise<void>((resolve) =>
                        listHandle.scrollIntoView({
                            index: messagesId.indexOf(sourceMessage.id),
                            behavior: "smooth",
                            align: "center",
                            done() {
                                setHighlightedMessageId(sourceMessage.id);
                                resolve();
                            },
                        }),
                    );
                }
                if (i !== MAX_TRIES - 1) {
                    const messages = await fetchMoreMessages();
                    if (!messages) throw new Error("源消息已不存在");
                    _messages = messages;
                } else throw new Error("源消息距离太远或已不存在");
            }
        },
        [fetchMoreMessages, messages, messagesId],
    );

    const scrollToBottom = useCallback((isImmediately?: boolean) => {
        setMessagesId((oldMessagesId) => {
            const listHandle = listRef.current;
            if (!listHandle) throw new Error("列表未初始化");
            const lastMessageIdx = oldMessagesId.length - 1;
            if (lastMessageIdx < 0) return oldMessagesId;
            listHandle.scrollIntoView({
                index: lastMessageIdx,
                align: "end",
                behavior: isImmediately ? "auto" : "smooth",
            });
            return oldMessagesId;
        });
    }, []);

    useEffect(() => {
        let tag: HTMLElement;
        (async () => {
            let css: string;
            if (colorScheme === "light")
                css = (await import("highlight.js/styles/github.css?raw"))
                    .default;
            else
                css = (await import("highlight.js/styles/github-dark.css?raw"))
                    .default;
            tag = document.createElement("style");
            tag.innerHTML = css;
            document.head.appendChild(tag);
        })();
        return () => {
            tag?.remove();
        };
    }, [colorScheme]);

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
            const faceResourceDir = await api.messaging.getFaceResourceDir();
            const lottieResourceDir =
                await api.messaging.getLottieResourceDir();
            setAuthData(authData);
            setFaceResourceDir(faceResourceDir);
            setLottieResourceDir(lottieResourceDir);
        })();
    }, [api]);

    useEffect(() => {
        setAvatars((oldAvatars) => {
            (async () => {
                const entities = [...messages]
                    .filter(([_, message]) => {
                        return !oldAvatars[message.sender.uid];
                    })
                    .map(([_, message]) => ({
                        type: "user" as const,
                        uid: message.sender.uid,
                    }));
                const avatarsMap = await api.messaging.getAvatars(entities);
                for (const [entity, avatar] of avatarsMap)
                    setAvatars((oldAvatars) => ({
                        ...oldAvatars,
                        [entity.uid]: avatar,
                    }));
            })();
            return oldAvatars;
        });
    }, [api, messages]);

    useEffect(() => {
        const listener = (messages: Message[]) => {
            const moreMessages = messages.filter(
                (message) =>
                    equal(message.entity, entity) &&
                    !messagesId.includes(message.id),
            );
            setFirstItemIndex(
                (oldFirstItemIndex) => oldFirstItemIndex - moreMessages.length,
            );
            setMessages((oldMessages) => {
                let map = oldMessages;
                for (const message of moreMessages) {
                    map = map.set(message.id, message);
                }
                return new Map(map);
            });
            setMessagesId((oldMessagesId) => [
                ...oldMessagesId,
                ...moreMessages.map((message) => message.id),
            ]);
            if (atBottom) scrollToBottom();
        };
        api.messaging.on("new-messages", listener);
        return () => {
            api.messaging.off("new-messages", listener);
        };
    }, [api, entity, messagesId, atBottom, scrollToBottom]);

    useEffect(() => {
        setMessages(new Map());
        setMessagesId([]);
        setAvatars({});
        setAtTop(false);
        setAtBottom(true);
        setFirstItemIndex(START_INDEX);
    }, [entity]);

    useEffect(() => {
        fetchMoreMessages().then(() => scrollToBottom(true));
    }, [entity, fetchMoreMessages, scrollToBottom]);

    return (
        <Stack width="100%" height="100%" direction="column">
            <Box position="relative" flex={1}>
                <Virtuoso
                    ref={listRef}
                    components={{
                        Scroller: Scrollbar,
                    }}
                    css={css({ width: "100%", height: "100%" })}
                    increaseViewportBy={{ top: 800, bottom: 800 }}
                    firstItemIndex={firstItemIndex}
                    initialTopMostItemIndex={MESSAGE_COUNT - 1}
                    startReached={() => fetchMoreMessages()}
                    atBottomStateChange={(atBottom) => setAtBottom(atBottom)}
                    data={messagesId}
                    itemContent={(_, id) => {
                        const message = messages.get(id)!;

                        return (
                            <MessageItem
                                lastMessage={messages.get(
                                    messagesId[messagesId.indexOf(id) - 1],
                                )}
                                message={message}
                                nextMessage={messages.get(
                                    messagesId[messagesId.indexOf(id) + 1],
                                )}
                                highlighted={
                                    highlightedMessageId === message.id
                                }
                                entity={entity}
                                avatar={avatars[message.sender.uid]}
                                loggedInAccount={authData!}
                                faceResourceDir={faceResourceDir!}
                                lottieResourceDir={lottieResourceDir!}
                                jumpToMessage={jumpToMessage}
                                showProfile={() => undefined}
                            />
                        );
                    }}
                />
                <Grow in={!atBottom}>
                    <Fab
                        color="primary"
                        size="small"
                        sx={{ position: "absolute", right: 12, bottom: 12 }}
                        onClick={() => scrollToBottom(false)}
                    >
                        <ArrowDownward />
                    </Fab>
                </Grow>
            </Box>
            <ChatBox entity={entity} scrollToBottom={scrollToBottom} />
        </Stack>
    );
}
