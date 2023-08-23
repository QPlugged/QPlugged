import Resizer from "../../components/Resizer";
import ChatBox from "./ChatBox";
import ContactList from "./ContactList";
import MessageList, { MessageListHandle } from "./MessageList";
import { Stack } from "@mui/material";
import { LogicalSize, getCurrent } from "@tauri-apps/plugin-window";
import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";

export function MainPage() {
    const [leftPanelWidth, setLeftPanelWidth] = useState<number>(300);
    const listRef = useRef<MessageListHandle>(null);
    const [selectedEntity, setSelectedEntity] = useState<Entity>();
    const [selectedMessages, setSelectedMessages] = useState<
        Map<string, Message>
    >(new Map());

    useEffect(() => {
        const win = getCurrent();
        win.setSize(new LogicalSize(1000, 700));
        win.setResizable(true);
    }, []);

    return (
        <>
            <Stack direction="row" width="100%" height="100%" overflow="hidden">
                <Stack
                    direction="column"
                    style={{ width: leftPanelWidth }}
                    position="relative"
                >
                    <ContactList
                        selectedEntities={
                            selectedEntity ? [selectedEntity] : []
                        }
                        onSelectEntities={(entities) =>
                            setSelectedEntity(entities[0])
                        }
                        showLatestMessage={true}
                        multiple={false}
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
                >
                    {selectedEntity && (
                        <>
                            <MessageList
                                entity={selectedEntity}
                                selectedMessages={selectedMessages}
                                onSelectMessages={setSelectedMessages}
                                ref={listRef}
                            />
                            <ChatBox
                                entity={selectedEntity}
                                listRef={listRef}
                            />
                        </>
                    )}
                </Stack>
            </Stack>
            <Outlet />
        </>
    );
}
