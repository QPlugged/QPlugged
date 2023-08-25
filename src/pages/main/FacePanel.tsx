import {
    forwardRef,
    memo,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import { ApiContext } from "../../Api";
import { VirtuosoGrid } from "react-virtuoso";
import { css } from "@emotion/react";
import RemoteFixedSizeImage from "../../components/RemoteFixedSizeImage";
import { Box, Paper, Stack, Tab, Tabs, Unstable_Grid2 } from "@mui/material";
import Scrollbar from "../../components/Scrollbar";
import { Favorite, History } from "@mui/icons-material";

const StickerItem = memo(({ file }: { file: string | undefined }) => {
    return <RemoteFixedSizeImage width={55} height={55} file={file} />;
});

const StickerList = memo(() => {
    const api = useContext(ApiContext);

    const [stickers, setStickers] = useState<Sticker[]>([]);
    const [stickerFiles, setStickerFiles] = useState<Map<string, string>>(
        new Map(),
    );

    const fetchMoreStickers = useCallback(() => {
        setStickers((oldStickers) => {
            (async () => {
                const moreStickers = await api.messaging.getStickerSet(
                    60,
                    "backward",
                    oldStickers[oldStickers.length - 1]?.id || "",
                    false,
                );
                for (const sticker of moreStickers) {
                    const file =
                        typeof sticker.progress === "string"
                            ? sticker.progress
                            : await sticker.progress;
                    setStickerFiles(
                        (oldStickerFiles) =>
                            new Map(oldStickerFiles.set(sticker.id, file)),
                    );
                }
                setStickers((oldStickers) => [...oldStickers, ...moreStickers]);
            })();
            return oldStickers;
        });
    }, [api]);

    useEffect(() => {
        fetchMoreStickers();
    }, [fetchMoreStickers]);

    return (
        <VirtuosoGrid
            data={stickers}
            css={css({ width: "100%", height: "100%" })}
            overscan={100}
            components={{
                List: forwardRef((props, ref) => (
                    <Unstable_Grid2
                        {...props}
                        container
                        ref={ref}
                        spacing={0.5}
                    />
                )),
                Item: (props) => <Unstable_Grid2 {...props} />,
                Scroller: Scrollbar,
            }}
            endReached={() => {
                console.log("trigger");
                fetchMoreStickers();
            }}
            itemContent={(_, sticker) => (
                <StickerItem file={stickerFiles.get(sticker.id)} />
            )}
        />
    );
});

type SelectedTab = "favourite" | "sysface" | "recent";

export default function FacePanel() {
    const [selectedTab, setSelectedTab] = useState<SelectedTab>("favourite");

    return (
        <Paper
            elevation={6}
            sx={{
                width: 300,
                height: 400,
                position: "absolute",
                right: 0,
                bottom: "calc(100% + 5px)",
                zIndex: 100,
            }}
        >
            <Stack direction="column" width="100%" height="100%">
                <Tabs
                    value={selectedTab}
                    onChange={(_, value) => setSelectedTab(value)}
                >
                    <Tab
                        icon={<History />}
                        value="recent"
                        aria-label="最近使用"
                    />
                    <Tab
                        icon={<Favorite />}
                        value="favourite"
                        aria-label="收藏的贴纸"
                    />
                </Tabs>
                <Box width="100%" height="100%">
                    <StickerList />
                </Box>
            </Stack>
        </Paper>
    );
}
