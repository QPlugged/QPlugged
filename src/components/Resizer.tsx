import { Box } from "@mui/material";
import { grey } from "@mui/material/colors";
import { useCallback, useEffect, useState } from "react";

export default function Resizer({
    initalSize,
    minSize = 0,
    maxSize = Infinity,
    onResize,
    axis,
    resizerSize = 8,
    position,
}: {
    initalSize: number;
    minSize?: number;
    maxSize?: number;
    onResize: (size: number) => void;
    axis: "x" | "y";
    resizerSize: number;
    position: "start" | "end";
}) {
    const [isResizing, setIsResizing] = useState(false);
    const [currentSize, setCurrentSize] = useState(initalSize);
    const [_, setRealSize] = useState(currentSize);

    const resize = useCallback(
        (e: MouseEvent) => {
            setRealSize((oldRealSize) => {
                const newSize =
                    oldRealSize + (axis === "x" ? e.movementX : e.movementY);
                if (
                    (!minSize || newSize >= minSize) &&
                    (!maxSize || newSize <= maxSize)
                )
                    setCurrentSize(newSize);
                return newSize;
            });
        },
        [axis, minSize, maxSize],
    );

    const stopResize = useCallback(() => {
        setRealSize(currentSize);
        setIsResizing(false);
    }, [currentSize]);

    useEffect(() => {
        if (!isResizing) return;

        document.body.style.userSelect = "none";
        document.body.style.cursor = CURSOR_TYPE;

        document.addEventListener("mousemove", resize);
        document.addEventListener("mouseup", stopResize);

        return () => {
            document.body.style.userSelect = "";
            document.body.style.cursor = "";

            document.removeEventListener("mousemove", resize);
            document.removeEventListener("mouseup", stopResize);
        };
    }, [resize, stopResize, isResizing]);

    useEffect(() => onResize(currentSize), [currentSize]);
    const CURSOR_TYPE = axis === "x" ? "ew-resize" : "ns-resize";

    return (
        <Box
            position="absolute"
            width={axis === "x" ? resizerSize : "100%"}
            height={axis === "x" ? "100%" : resizerSize}
            top={
                axis === "x" ? 0 : position === "start" ? -resizerSize : "auto"
            }
            bottom={
                axis === "x" ? 0 : position === "start" ? "auto" : -resizerSize
            }
            left={
                axis === "x"
                    ? position === "start"
                        ? -resizerSize
                        : "auto"
                    : 0
            }
            right={
                axis === "x"
                    ? position === "start"
                        ? "auto"
                        : -resizerSize
                    : 0
            }
            zIndex={1}
            onMouseDown={() => setIsResizing(true)}
            sx={{
                cursor: CURSOR_TYPE,
                // "&:hover": {
                //     borderLeft:
                //         axis === "x" && position === "end" ? border : "none",
                //     borderRight:
                //         axis === "x" && position === "start" ? border : "none",
                //     borderTop:
                //         axis === "y" && position === "end" ? border : "none",
                //     borderBottom:
                //         axis === "y" && position === "start" ? border : "none",
                // },
            }}
        />
    );
}
