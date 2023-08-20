import { ClickAwayListener, MenuProps, Portal } from "@mui/material";
import { useCallback, useState } from "react";

export default function ContextMenu({
    children,
    menu,
}: {
    children: (
        handleContextMenu: (event: React.MouseEvent) => void,
        closeContextMenu: () => void,
    ) => React.ReactNode;
    menu: (
        MenuProps: MenuProps,
        closeContextMenu: () => void,
    ) => React.ReactNode;
}) {
    const [contextMenu, setContextMenu] = useState<{
        left: number;
        top: number;
    }>();

    const handleContextMenu = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault();
            setContextMenu({
                left: event.nativeEvent.pageX + 2,
                top: event.nativeEvent.pageY - 6,
            });
        },
        [contextMenu],
    );

    const closeContextMenu = useCallback(() => setContextMenu(undefined), []);

    return (
        <>
            {children(handleContextMenu, closeContextMenu)}
            {menu(
                {
                    open: !!contextMenu,
                    onClose: closeContextMenu,
                    anchorReference: "anchorPosition",
                    anchorPosition: contextMenu,
                    slots: {
                        root: (props) => (
                            <Portal>
                                <ClickAwayListener onClickAway={props.onClose}>
                                    {props.children}
                                </ClickAwayListener>
                            </Portal>
                        ),
                    },
                },
                closeContextMenu,
            )}
        </>
    );
}
