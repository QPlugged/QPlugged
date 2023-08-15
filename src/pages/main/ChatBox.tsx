import { ApiContext } from "../../Api";
import { Attachment, EmojiEmotions, Send } from "@mui/icons-material";
import { Box, IconButton, Stack, TextareaAutosize } from "@mui/material";
import { useCallback, useContext, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export default function ChatBox({
    entity,
    scrollToBottom,
}: { entity: Entity; scrollToBottom: () => void }) {
    const api = useContext(ApiContext);
    const [plainText, setPlainText] = useState<string>("");
    const isEmpty = useMemo(() => plainText.trim() === "", [plainText]);

    const sendMessage = useCallback(async () => {
        if (isEmpty) return;
        setPlainText("");
        await api.messaging.sendMessage(entity, [
            { type: "text", content: plainText },
        ]);
        scrollToBottom();
    }, [api, entity, plainText]);

    const textareaRef = useHotkeys<HTMLTextAreaElement>(
        ["alt+s", "enter"],
        (e) => {
            e.preventDefault();
            sendMessage();
        },
        [sendMessage],
        { enableOnFormTags: true },
    );

    return (
        <Stack
            direction="column"
            bgcolor="background.paper"
            zIndex={10}
            sx={{
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
            }}
        >
            <Stack direction="row" alignItems="flex-end" padding={0.5}>
                <IconButton>
                    <Attachment />
                </IconButton>
                <Box padding={1} lineHeight={0} flex={1}>
                    <TextareaAutosize
                        ref={textareaRef}
                        value={plainText}
                        onChange={(e) => setPlainText(e.target.value)}
                        css={{
                            width: "100%",
                            background: "none",
                            border: "none",
                            outline: "none",
                            resize: "none",
                            fontFamily: "inherit",
                            fontSize: 15,
                            lineHeight: 1.2,
                        }}
                        placeholder="输入消息..."
                    />
                </Box>
                <IconButton>
                    <EmojiEmotions />
                </IconButton>
                {plainText && (
                    <IconButton color="primary" onClick={sendMessage}>
                        <Send />
                    </IconButton>
                )}
            </Stack>
        </Stack>
    );
}
