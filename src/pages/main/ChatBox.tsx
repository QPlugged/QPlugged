import { ApiContext } from "../../Api";
import RemoteAvatar from "../../components/RemoteAvatar";
import { MessageListHandle } from "./MessageList";
import { Autoformat } from "@ckeditor/ckeditor5-autoformat";
import { Bold, Italic } from "@ckeditor/ckeditor5-basic-styles";
import { Editor, EditorConfig } from "@ckeditor/ckeditor5-core";
import { BalloonEditor } from "@ckeditor/ckeditor5-editor-balloon";
import { Element } from "@ckeditor/ckeditor5-engine";
import { Essentials } from "@ckeditor/ckeditor5-essentials";
import { Heading } from "@ckeditor/ckeditor5-heading";
import { Link } from "@ckeditor/ckeditor5-link";
import { List } from "@ckeditor/ckeditor5-list";
import html2markdown from "@ckeditor/ckeditor5-markdown-gfm/src/html2markdown/html2markdown";
import { Mention, MentionConfig } from "@ckeditor/ckeditor5-mention";
import { Paragraph } from "@ckeditor/ckeditor5-paragraph";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import { Attachment, EmojiEmotions, Send } from "@mui/icons-material";
import { Box, IconButton, Stack } from "@mui/material";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import FacePanel from "./FacePanel";

function MentionCustomization(editor: Editor) {
    editor.conversion.for("upcast").elementToAttribute({
        view: {
            name: "mention",
            key: "data-id",
            attributes: {
                "data-id": true,
                "data-mentionType": true,
                "data-uid": true,
                "data-name": true,
            },
        },
        model: {
            key: "mention",
            value: (viewItem: Element) => {
                const mentionAttribute = (
                    editor.plugins.get("Mention") as Mention
                ).toMentionAttribute(viewItem, {
                    id: viewItem.getAttribute("data-id"),
                    mentionType: viewItem.getAttribute("data-mention-type"),
                    uid: viewItem.getAttribute("data-uid"),
                    name: viewItem.getAttribute("data-name"),
                } as any);

                return mentionAttribute;
            },
        },
        converterPriority: "high",
    });

    editor.conversion.for("downcast").attributeToElement({
        model: "mention",
        view: (modelAttributeValue, { writer }) => {
            if (!modelAttributeValue) return;

            return writer.createAttributeElement(
                "mention",
                {
                    "data-id": modelAttributeValue.id,
                    "data-mention-type": modelAttributeValue.mentionType,
                    "data-uid": modelAttributeValue.uid,
                    "data-name": modelAttributeValue.name,
                },
                {
                    priority: 20,
                    id: modelAttributeValue.uid,
                },
            );
        },
        converterPriority: "high",
    });
}
const domParse = new DOMParser();

export default function ChatBox({
    entity,
    listRef,
}: { entity: Entity; listRef: React.RefObject<MessageListHandle> }) {
    const api = useContext(ApiContext);
    const getIsEmpty = useCallback(
        (content: string) => content.trim() === "",
        [],
    );
    const [content, setContent] = useState<string>("");
    const isEmpty = useMemo(() => getIsEmpty(content), [content]);
    const [forceRemountEditor, setForceRemountEditor] = useState<number>(0);

    const sendMessage = useCallback(
        async (content: string) => {
            if (getIsEmpty(content)) return;
            setContent("");
            const dom = domParse.parseFromString(content, "text/html").body;
            const elements: MessageSendableElement[] = [];
            const pushText = (content: string) => {
                const lastElement = elements[elements.length - 1];
                if (lastElement?.type === "text")
                    lastElement.content += content;
                else elements.push({ type: "text", content: content });
            };
            const pushElement = (element: Node) =>
                pushText(
                    html2markdown(
                        (element as HTMLElement).outerHTML ||
                            element.nodeValue ||
                            "",
                    ),
                );
            for (const block of dom.childNodes) {
                if ((block as HTMLElement).tagName === "P") {
                    for (const inline of block.childNodes) {
                        if ((inline as HTMLElement).tagName === "MENTION")
                            elements.push({
                                type: "mention",
                                mentionType: (parseInt(
                                    (inline as HTMLElement).getAttribute(
                                        "data-mention-type",
                                    )!,
                                ) ||
                                    (inline as HTMLElement).getAttribute(
                                        "data-mention-type",
                                    ) ||
                                    "") as MessageElementMentionType,
                                content:
                                    (inline as HTMLElement).getAttribute(
                                        "data-id",
                                    ) || "",
                                uid:
                                    (inline as HTMLElement).getAttribute(
                                        "data-uid",
                                    ) || "",
                            });
                        else pushElement(inline);
                    }
                } else pushElement(block);

                pushText("\n\n");
            }
            const lastElement = elements[elements.length - 1];
            if (
                lastElement.type === "text" &&
                lastElement.content.endsWith("\n")
            )
                lastElement.content = lastElement.content.slice(
                    0,
                    lastElement.content.length - 1,
                );
            await api.messaging.sendMessage(entity, elements);
            listRef.current?.scrollToBottom();
        },
        [api, entity, getIsEmpty],
    );

    const sendFile = useCallback(() => {
        // TODO: 由于 issue https://github.com/tauri-apps/plugins-workspace/issues/571 而暂时搁置
        // open({ multiple: true }).then((file) => {
        //     console.log(file);
        // });
    }, []);

    const getMemberByQuery = useCallback(
        async (keyword: string) => {
            const members = await api.messaging.searchMemberList(keyword);
            const entries: any[] = [...members]
                .map(([uid, user]) => ({
                    id: `@${user.name}`,
                    mentionType: "user",
                    uid: uid,
                    uin: user.uin,
                    name: user.name,
                    avatarUrl: user.avatarUrl,
                    avatarFile: user.avatarFile,
                }))
                .slice(0, 8);
            if (keyword.trim() === "") {
                const mentionEveryoneConfig =
                    await api.messaging.getGroupMentionEveryoneConfig(
                        entity.uid,
                    );
                if (
                    mentionEveryoneConfig.hasPermission &&
                    mentionEveryoneConfig.remainTimes !== 0
                )
                    entries.unshift({
                        id: "@全体成员",
                        mentionType: "everyone",
                        name: `全体成员 (剩余 ${mentionEveryoneConfig.remainTimes} 次)`,
                    });
            }
            return entries;
        },
        [api, entity],
    );

    const forceRemountCKEditor = () => {
        setForceRemountEditor((oldValue) => (oldValue === 0 ? 1 : 0));
    };

    useEffect(() => forceRemountCKEditor(), [getMemberByQuery, sendMessage]);

    return (
        <Stack
            position="relative"
            margin={1}
            marginTop={0}
            direction="column"
            bgcolor="background.paper"
            zIndex={10}
            boxShadow={3}
            borderRadius={2}
            sx={{
                transition: "all 0.2s ease",
                "&:hover, &:focus-within": {
                    boxShadow: 5,
                },
            }}
        >
            <FacePanel />
            <Stack direction="row" alignItems="flex-end" padding={0.5}>
                <IconButton onClick={sendFile}>
                    <Attachment />
                </IconButton>
                <Box
                    padding={1}
                    flex={1}
                    sx={{
                        "& > .ck": {
                            minHeight: "24px",
                            border: "none !important",
                            boxShadow: "none !important",
                            padding: "0 !important",
                            "& h1, & h2, & h3, & h4, & h5, & h6, & p, & ol, & ul":
                                {
                                    margin: "0 !important",
                                },
                            "& ol, & ul": {
                                paddingLeft: 4,
                            },
                            "& mention": {
                                color: "primary.main",
                            },
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
                        },
                    }}
                >
                    <CKEditor
                        key={forceRemountEditor}
                        editor={BalloonEditor}
                        config={
                            {
                                plugins: [
                                    Essentials,
                                    Autoformat,
                                    Bold,
                                    Italic,
                                    // BlockQuote,
                                    Heading,
                                    Link,
                                    List,
                                    Heading,
                                    Paragraph,
                                    Mention,
                                    MentionCustomization,
                                ],
                                toolbar: {
                                    items: [
                                        "bold",
                                        "italic",
                                        "link",
                                        "bulletedList",
                                        "numberedList",
                                        // 'blockQuote',
                                        // 'undo',
                                        // 'redo'
                                    ],
                                },
                                mention: {
                                    feeds: [
                                        {
                                            marker: "@",
                                            feed: getMemberByQuery,
                                            itemRenderer: (item: any) => {
                                                const element =
                                                    document.createElement(
                                                        "button",
                                                    );
                                                element.style.height = "48px";
                                                const node = (
                                                    <ApiContext.Provider
                                                        value={api}
                                                    >
                                                        <Stack
                                                            direction="row"
                                                            className="ck-reset_all-excluded"
                                                            alignItems="center"
                                                            gap={1}
                                                            color="inherit !important"
                                                        >
                                                            <RemoteAvatar
                                                                file={
                                                                    item.avatarFile
                                                                }
                                                                url={
                                                                    item.avatarUrl
                                                                }
                                                                size={32}
                                                                name={item.name}
                                                            />
                                                            <Stack
                                                                direction="column"
                                                                lineHeight={1}
                                                                gap={0.5}
                                                            >
                                                                <span>
                                                                    {item.name}
                                                                </span>
                                                                {item.uin && (
                                                                    <span
                                                                        css={{
                                                                            fontSize:
                                                                                "12px",
                                                                            ".ck-button:not(.ck-on) &":
                                                                                {
                                                                                    color: "var(--mui-palette-text-secondary)",
                                                                                },
                                                                        }}
                                                                    >
                                                                        {
                                                                            item.uin
                                                                        }
                                                                    </span>
                                                                )}
                                                            </Stack>
                                                        </Stack>
                                                    </ApiContext.Provider>
                                                );
                                                createRoot(element).render(
                                                    node,
                                                );
                                                return element;
                                            },
                                            minimumCharacters: 0,
                                        },
                                    ],
                                },
                                language: "zh-cn",
                            } as EditorConfig & {
                                mention: MentionConfig;
                            }
                        }
                        onReady={(editor) => {
                            editor.keystrokes.set("Ctrl+Enter", () =>
                                sendMessage(editor.getData()),
                            );
                        }}
                        data={content}
                        onChange={(_, editor) => setContent(editor.getData())}
                    />
                </Box>
                <IconButton>
                    <EmojiEmotions />
                </IconButton>
                {!isEmpty && (
                    <IconButton
                        color="primary"
                        onClick={() => sendMessage(content)}
                    >
                        <Send />
                    </IconButton>
                )}
            </Stack>
        </Stack>
    );
}
