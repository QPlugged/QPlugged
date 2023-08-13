import Resizer from "../../components/Resizer";
import MessageList from "./MessageList";
import RecentContactList from "./RecentContactList";
import { Stack } from "@mui/material";
import { LogicalSize, getCurrent } from "@tauri-apps/plugin-window";
import { useEffect, useState } from "react";

export function MainPage() {
    const [leftPanelWidth, setLeftPanelWidth] = useState<number>(300);
    const [selectedEntity, setSelectedEntity] = useState<Entity>();

    useEffect(() => {
        const win = getCurrent();
        win.setSize(new LogicalSize(1000, 700));
        win.setResizable(true);
    }, []);

    return (
        <Stack direction="row" width="100%" height="100%" overflow="hidden">
            <Stack
                direction="column"
                style={{ width: leftPanelWidth }}
                position="relative"
            >
                <RecentContactList
                    entity={selectedEntity}
                    onSelectEntity={setSelectedEntity}
                />
                <Resizer
                    initalSize={400}
                    onResize={(size) => setLeftPanelWidth(size)}
                    axis="x"
                    resizerSize={16}
                    position="end"
                />
            </Stack>
            <Stack
                direction="column"
                width="100%"
                height="100%"
                overflow="hidden"
                sx={{
                    borderTopLeftRadius: 12,
                }}
            >
                {selectedEntity && <MessageList entity={selectedEntity} />}
            </Stack>
        </Stack>
    );
}
