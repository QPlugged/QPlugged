import { useCallback, useEffect, useState } from "react";

export default function useResize(
    defaultSize: number,
    axis: "x" | "y",
    minSize?: number,
    maxSize?: number,
): [number, (value: boolean) => void] {
    const [isResizing, setIsResizing] = useState(false);
    const [size, setSize] = useState(defaultSize);
    const [_, setRealSize] = useState(defaultSize);

    const resize = useCallback(
        (e: MouseEvent) => {
            if (isResizing) {
                setRealSize((oldRealSize) => {
                    const newSize =
                        oldRealSize +
                        (axis === "x" ? e.movementX : e.movementY);
                    if (
                        (!minSize || newSize >= minSize) &&
                        (!maxSize || newSize <= maxSize)
                    )
                        setSize(newSize);
                    return newSize;
                });
            }
        },
        [minSize, maxSize, isResizing],
    );

    useEffect(() => {
        const stopResize = () => {
            setRealSize(size);
            setIsResizing(false);
        };
        document.addEventListener("mousemove", resize);
        document.addEventListener("mouseup", stopResize);

        return () => {
            document.removeEventListener("mousemove", resize);
            document.removeEventListener("mouseup", stopResize);
        };
    }, [resize]);

    return [size, setIsResizing];
}
