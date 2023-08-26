import { ApiContext } from "../../Api";
import { messageElementsToHTMLAndPlainText } from "../../backend/messaging/converter";
import ContextMenu from "../../components/ContextMenu";
import RemoteAvatar from "../../components/RemoteAvatar";
import RemoteFixedSizeImage from "../../components/RemoteFixedSizeImage";
import Scrollbar from "../../components/Scrollbar";
import { css } from "@emotion/react";
import {
    ArrowDownward,
    Close,
    CopyAll,
    Done,
    Download,
    Folder,
    Share,
} from "@mui/icons-material";
import {
    Box,
    Button,
    CircularProgress,
    Fab,
    Grow,
    Link,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Stack,
    Typography,
    useColorScheme,
} from "@mui/material";
import { dirname } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-shell";
import dayjs from "dayjs";
import equal from "fast-deep-equal";
import hljs from "highlight.js";
import { atom, useAtom } from "jotai";
import Lottie from "lottie-react";
import MarkdownIt from "markdown-it";
import { escapeHtml } from "markdown-it/lib/common/utils";
import prettyBytes from "pretty-bytes";
import {
    Fragment,
    forwardRef,
    useCallback,
    useContext,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from "react";
import { useNavigate } from "react-router-dom";
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
        <Stack direction="row" paddingBottom={0.5}>
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
            } catch {}
        }

        return `<pre class="hljs"><code>${markdownIt.utils.escapeHtml(
            str,
        )}</code></pre>`;
    },
});
markdownIt.renderer.rules.paragraph_open = () => "<span>";
markdownIt.renderer.rules.paragraph_close = (tokens, idx) =>
    `</span>${tokens.length - 1 === idx ? "" : "<br>"}`;

function MessageItemElementText({
    element,
}: {
    element: MessageNonSendableElementText;
}) {
    const html = useMemo(() => markdownIt.render(element.content), [element]);

    return (
        <>
            {/* rome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
            <span
                // rome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
                dangerouslySetInnerHTML={{ __html: html }}
                onClick={(event) => {
                    const element = event.target as HTMLLinkElement;
                    if (element.tagName === "A" && element.href) {
                        event.preventDefault();
                        open(element.href);
                    }
                }}
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
                    "& h1, & h2, & h3, & h4, & h5, & h6, & p, & ol, & ul": {
                        margin: "0 !important",
                    },
                    "& ol, & ul": {
                        paddingLeft: 20,
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
        () =>
            element.mentionType === "user" &&
            showProfile({ type: "user", uid: element.uid! }),
        [element],
    );

    return (
        <>
            <Link
                component="button"
                underline="hover"
                paddingRight={1}
                onClick={onClick}
                sx={{ verticalAlign: "inherit" }}
            >
                {element.content}
            </Link>
            &nbsp;
        </>
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

const downloadQueueAtom = atom<Map<string, [number, number] | true>>(new Map());

function MessageItemElementFile({
    element,
    message,
}: { element: MessageNonSendableElementFile; message: Message }) {
    const api = useContext(ApiContext);
    const size = useMemo(() => prettyBytes(element.size), [element]);
    const [downloadQueue, setDownloadQueue] = useAtom(downloadQueueAtom);
    const progress = useMemo(
        () => downloadQueue.get(element.id),
        [element, downloadQueue],
    );
    const [downloaded, setDownloaded] = useState<boolean>();

    const updateDownloadedState = useCallback(async () => {
        const downloaded = await api.fs.pathExist(element.file);
        setDownloaded(downloaded);
        return downloaded;
    }, [api, element]);

    const downloadFile = useCallback(async () => {
        if ((await updateDownloadedState()) !== false) return;
        setDownloadQueue(
            (oldDownloadQueue) =>
                new Map(oldDownloadQueue.set(element.id, true)),
        );
        await api.messaging.media.downloadMedia(
            message.id,
            element.id,
            1,
            message.entity,
            "",
        );
    }, [api, updateDownloadedState]);

    const cancelDownloadFile = useCallback(async () => {
        if (!progress) return;
        setDownloadQueue((oldDownloadQueue) => {
            oldDownloadQueue.delete(element.id);
            return new Map(oldDownloadQueue);
        });
        await api.messaging.media.cancelDownloadMedia(
            message.id,
            element.id,
            1,
            message.entity,
            "",
        );
        await updateDownloadedState();
    }, [api, progress, updateDownloadedState]);

    const openFileInFolder = useCallback(async () => {
        if ((await updateDownloadedState()) !== true) return;
        open(await dirname(element.file));
    }, [downloaded, element, updateDownloadedState]);

    useEffect(() => {
        const listener = (
            elementId: string,
            current: number,
            total: number,
        ) => {
            if (elementId !== element.id) return;
            setDownloadQueue(
                (oldDownloadQueue) =>
                    new Map(oldDownloadQueue.set(element.id, [current, total])),
            );
            updateDownloadedState();
        };
        api.messaging.media.on("download-progress-update", listener);
        return () => {
            api.messaging.media.off("download-progress-update", listener);
        };
    }, [api, element, updateDownloadedState]);

    useEffect(() => {
        const listener = (elementId: string) => {
            if (elementId !== element.id) return;
            setDownloadQueue((oldDownloadQueue) => {
                oldDownloadQueue.delete(element.id);
                return new Map(oldDownloadQueue);
            });
            updateDownloadedState();
        };
        api.messaging.media.on("download-finish", listener);
        return () => {
            api.messaging.media.off("download-finish", listener);
        };
    }, [api, element, updateDownloadedState]);

    useEffect(() => {
        updateDownloadedState();
    }, [updateDownloadedState]);

    return (
        <Stack
            direction="row"
            alignItems="center"
            gap={2}
            minWidth={200}
            padding={0.5}
        >
            <Box position="relative">
                <Fab
                    size="medium"
                    color="secondary"
                    onClick={
                        downloaded
                            ? openFileInFolder
                            : progress
                            ? cancelDownloadFile
                            : downloadFile
                    }
                >
                    {downloaded ? (
                        <Folder />
                    ) : progress ? (
                        <Close />
                    ) : (
                        <Download />
                    )}
                    <Grow in={progress === true}>
                        <Box
                            position="absolute"
                            top={-5}
                            left={-5}
                            zIndex={1}
                            width={58}
                            height={58}
                            sx={{ transform: "rotate(-90deg)" }}
                        >
                            <CircularProgress
                                variant="indeterminate"
                                size="100%"
                                color="secondary"
                                thickness={2}
                            />
                        </Box>
                    </Grow>
                    <Grow in={progress && progress !== true}>
                        <Box
                            position="absolute"
                            top={-5}
                            left={-5}
                            zIndex={1}
                            width={58}
                            height={58}
                            sx={{ transform: "rotate(-90deg)" }}
                        >
                            <CircularProgress
                                variant="determinate"
                                value={
                                    progress && progress !== true
                                        ? Math.max(
                                              Math.min(
                                                  progress[1] === 0
                                                      ? 0
                                                      : progress[0] /
                                                          progress[1],
                                                  1,
                                              ),
                                              0,
                                          ) * 100
                                        : 90
                                }
                                size="100%"
                                color="secondary"
                                thickness={2}
                            />
                        </Box>
                    </Grow>
                </Fab>
            </Box>
            <Stack direction="column">
                <Typography variant="h6" component="p" fontSize={16}>
                    {element.name}
                </Typography>
                <Typography
                    variant="body1"
                    component="span"
                    color="text.secondary"
                    fontSize={12}
                >
                    {size}
                </Typography>
            </Stack>
        </Stack>
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
                ? `${faceResourceDir}/static/s${element.faceId}.png`
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
    selected,
    onSelect,
    selectionMode,
    entity,
    avatar,
    loggedInAccount,
    faceResourceDir,
    lottieResourceDir,
    jumpToMessage,
    showProfile,
    handleContextMenu,
}: {
    lastMessage?: Message;
    message: Message;
    nextMessage?: Message;
    highlighted: boolean;
    selected: boolean;
    onSelect: () => void;
    selectionMode: boolean;
    entity: Entity;
    avatar: string;
    loggedInAccount: Account;
    faceResourceDir: string;
    lottieResourceDir: string;
    jumpToMessage: JumpToMessageFunc;
    showProfile: ShowProfileFunc;
    handleContextMenu: (event: React.MouseEvent<Element, MouseEvent>) => void;
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
        () => !showAvatar || isSelf,
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
    const rootRef = useRef<HTMLDivElement>(null);

    const RADIUS_BIG = 12;
    const RADIUS_SMALL = 4;

    useEffect(() => {
        if (highlighted && rootRef.current) rootRef.current.focus();
    }, [highlighted]);

    return (
        <Stack
            role="presentation"
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
            border="none"
            sx={{
                textAlign: "left",
                transition: "all 0.2s ease",
                "&:hover .message-item-time": {
                    opacity: 1,
                },
                background: selected
                    ? "rgba(var(--mui-palette-primary-mainChannel) / var(--mui-palette-action-selectedOpacity))"
                    : undefined,
            }}
            onContextMenu={handleContextMenu}
            onClick={onSelect}
            ref={rootRef}
            tabIndex={0}
        >
            {showAvatar && (
                <RemoteAvatar name={senderName} file={avatar} size={32} />
            )}
            {showAvatarPlaceholder && <Box width={32} />}
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
                    pointerEvents: selectionMode ? "none" : "auto",
                    userSelect: selectionMode ? "none" : "auto",
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
                        sx={{
                            userSelect: selectionMode ? "none" : "auto",
                            opacity: showName ? 1 : 0,
                            pointerEvents: selectionMode ? "none" : "auto",
                        }}
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
                        else if (element.type === "file")
                            child = (
                                <MessageItemElementFile
                                    element={element}
                                    message={message}
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
                sx={{
                    opacity: 0,
                    transition: "opacity 0.1s ease",
                    userSelect: "none",
                }}
            >
                {timeStr}
            </Stack>
        </Stack>
    );
}

const START_INDEX = Math.round(Number.MAX_SAFE_INTEGER / 2);
const MESSAGE_COUNT = 50;

export interface MessageListHandle {
    scrollToBottom: (isImmediately?: boolean) => void;
}

const MessageList = forwardRef<
    MessageListHandle,
    {
        entity: Entity;
        selectedMessages: Map<string, Message>;
        onSelectMessages: (messages: Map<string, Message>) => void;
    }
>(({ entity, selectedMessages, onSelectMessages }, ref) => {
    const api = useContext(ApiContext);
    const navigate = useNavigate();
    const key = useMemo(() => JSON.stringify(entity), [entity]);
    const listRef = useRef<VirtuosoHandle>(null);
    const [authData, setAuthData] = useState<Account>();
    const [faceResourceDir, setFaceResourceDir] = useState<string>();
    const [lottieResourceDir, setLottieResourceDir] = useState<string>();
    const [messages, setMessages] = useState<Map<string, Message>>(new Map());
    const [messagesId, setMessagesId] = useState<string[]>([]);
    const [highlightedMessageId, setHighlightedMessageId] = useState<string>();
    const [selectionMode, setSelectionMode] = useState<boolean>(false);
    const [avatars, setAvatars] = useState<Map<string, string>>(new Map());
    const [atTop, setAtTop] = useState<boolean>(false);
    const [atBottom, setAtBottom] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(true);
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

    const menuCopy = useCallback(async () => {
        if (!selectedMessages) return;
        const content: [Message, [string, string][]][] = await Promise.all(
            [...selectedMessages]
                .sort((a, b) => a[1].timestamp - b[1].timestamp)
                .map(
                    async ([_, message]) =>
                        [
                            message,
                            await messageElementsToHTMLAndPlainText(
                                message.elements,
                                message.entity,
                                api.messaging,
                                api.fs,
                                markdownIt,
                            ),
                        ] as [Message, [string, string][]],
                ),
        );

        const html = content
            .map(
                ([message, elements]) =>
                    `<p>${escapeHtml(
                        `${message.sender.memberName || message.sender.name}:`,
                    )}</p><p>${elements.map(([html]) => html).join("")}</p>`,
            )
            .join("");
        const text = content
            .map(
                ([message, elements]) =>
                    `${
                        message.sender.memberName || message.sender.name
                    }:\n${elements.map(([_, text]) => text).join("")}`,
            )
            .join("\n\n");

        await navigator.clipboard.write([
            new ClipboardItem({
                "text/html": new Blob([html], { type: "text/html" }),
                "text/plain": new Blob([text], { type: "text/plain" }),
            }),
        ]);
    }, [api, selectedMessages]);

    const menuForward = useCallback(() => {
        navigate("forward", {
            state: {
                messages: [...selectedMessages].map(([id, message]) => [
                    message.entity,
                    id,
                ]),
                fromEntity: entity,
            },
        });
    }, [selectedMessages]);

    const menuSelect = useCallback(() => {
        setSelectionMode(!selectionMode && selectedMessages.size === 1);
    }, [selectedMessages, selectionMode]);

    useImperativeHandle(
        ref,
        () => ({
            scrollToBottom: scrollToBottom,
        }),
        [scrollToBottom],
    );

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
            setLoading(false);
        })();
    }, [api]);

    useEffect(() => {
        setAvatars((oldAvatars) => {
            (async () => {
                const entities = [...messages]
                    .filter(([_, message]) => {
                        return !oldAvatars.get(message.sender.uid);
                    })
                    .map(([_, message]) => ({
                        type: "user" as const,
                        uid: message.sender.uid,
                    }));
                const avatarsMap = await api.messaging.getAvatars(entities);
                setAvatars((oldAvatars) => {
                    let map = oldAvatars;
                    for (const [{ uid }, avatar] of avatarsMap) {
                        map = map.set(uid, avatar);
                    }
                    return new Map(map);
                });
            })();
            return oldAvatars;
        });
    }, [api, messages]);

    useEffect(() => {
        const listener = (messages: Message[]) => {
            setMessages((oldMessages) => {
                const moreMessages = messages.filter(
                    (message) =>
                        equal(message.entity, entity) &&
                        !oldMessages.has(message.id),
                );
                let map = oldMessages;
                for (const message of moreMessages) {
                    map = map.set(message.id, message);
                }
                setMessagesId((oldMessagesId) => [
                    ...oldMessagesId,
                    ...moreMessages.map((message) => message.id),
                ]);
                return new Map(map);
            });

            if (atBottom) setTimeout(() => scrollToBottom(), 0);
        };
        api.messaging.on("new-messages", listener);
        return () => {
            api.messaging.off("new-messages", listener);
        };
    }, [api, entity, atBottom, scrollToBottom]);

    useEffect(() => {
        setMessages(new Map());
        setMessagesId([]);
        setAvatars(new Map());
        setAtTop(false);
        setAtBottom(true);
        setFirstItemIndex(START_INDEX);
        onSelectMessages(new Map());
        setSelectionMode(false);
        api.messaging.switchToEntity(entity);
    }, [entity, api]);

    useEffect(() => {
        if (!loading) fetchMoreMessages().then(() => scrollToBottom(true));
    }, [entity, fetchMoreMessages, scrollToBottom, loading]);

    return (
        <ContextMenu
            menu={(props, closeContextMenu) => (
                <Menu {...props}>
                    <MenuItem
                        onClick={() => {
                            menuCopy();
                            closeContextMenu();
                        }}
                    >
                        <ListItemIcon>
                            <CopyAll />
                        </ListItemIcon>
                        <ListItemText>复制</ListItemText>
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            menuForward();
                            closeContextMenu();
                        }}
                    >
                        <ListItemIcon>
                            <Share />
                        </ListItemIcon>
                        <ListItemText>转发</ListItemText>
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            menuSelect();
                            closeContextMenu();
                        }}
                    >
                        <ListItemIcon>
                            <Done />
                        </ListItemIcon>
                        <ListItemText>
                            {!selectionMode ? "选择" : "取消选择"}
                        </ListItemText>
                    </MenuItem>
                </Menu>
            )}
        >
            {(handleContextMenu, closeContextMenu) => (
                <Box position="relative" flex={1} className="message-list">
                    {!loading ? (
                        <Virtuoso
                            ref={listRef}
                            components={{
                                Scroller: Scrollbar,
                            }}
                            css={css({
                                width: "100%",
                                height: "100%",
                            })}
                            key={key}
                            increaseViewportBy={{ top: 800, bottom: 800 }}
                            firstItemIndex={firstItemIndex}
                            initialTopMostItemIndex={MESSAGE_COUNT - 1}
                            startReached={() => fetchMoreMessages()}
                            atBottomStateChange={(atBottom) =>
                                setAtBottom(atBottom)
                            }
                            data={messagesId}
                            isScrolling={(isScrolling) => {
                                if (isScrolling) closeContextMenu();
                            }}
                            itemContent={(_, id) => {
                                const message = messages.get(id)!;
                                const selected =
                                    selectionMode && selectedMessages.has(id);

                                return (
                                    message && (
                                        <MessageItem
                                            lastMessage={messages.get(
                                                messagesId[
                                                    messagesId.indexOf(id) - 1
                                                ],
                                            )}
                                            message={message}
                                            nextMessage={messages.get(
                                                messagesId[
                                                    messagesId.indexOf(id) + 1
                                                ],
                                            )}
                                            highlighted={
                                                highlightedMessageId === id
                                            }
                                            selected={selected}
                                            onSelect={() => {
                                                if (selectionMode)
                                                    if (selected) {
                                                        selectedMessages.delete(
                                                            id,
                                                        );
                                                        onSelectMessages(
                                                            new Map(
                                                                selectedMessages,
                                                            ),
                                                        );
                                                    } else
                                                        onSelectMessages(
                                                            new Map(
                                                                selectedMessages.set(
                                                                    id,
                                                                    message,
                                                                ),
                                                            ),
                                                        );
                                            }}
                                            selectionMode={selectionMode}
                                            entity={entity}
                                            avatar={
                                                avatars.get(message.sender.uid)!
                                            }
                                            loggedInAccount={authData!}
                                            faceResourceDir={faceResourceDir!}
                                            lottieResourceDir={
                                                lottieResourceDir!
                                            }
                                            jumpToMessage={jumpToMessage}
                                            showProfile={() => undefined}
                                            handleContextMenu={(event) => {
                                                if (!selectionMode)
                                                    onSelectMessages(
                                                        new Map().set(
                                                            id,
                                                            message,
                                                        ),
                                                    );
                                                handleContextMenu(event);
                                            }}
                                        />
                                    )
                                );
                            }}
                        />
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
                    <Grow in={!atBottom}>
                        <Fab
                            color="primary"
                            size="small"
                            sx={{
                                position: "absolute",
                                right: 12,
                                bottom: 12,
                            }}
                            onClick={() => scrollToBottom(false)}
                        >
                            <ArrowDownward />
                        </Fab>
                    </Grow>
                </Box>
            )}
        </ContextMenu>
    );
});

export default MessageList;
