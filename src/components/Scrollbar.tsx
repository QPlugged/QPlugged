import { css } from "@emotion/react";
import { grey } from "@mui/material/colors";
import { forwardRef, useCallback } from "react";
import CustomScrollbar from "react-scrollbars-custom";

const Scrollbar = forwardRef<
    HTMLDivElement,
    { children?: React.ReactNode; style?: React.CSSProperties }
>(({ children, style }, ref) => {
    const refSetter = useCallback(
        (scrollbarsRef: HTMLElement | null) => {
            if (scrollbarsRef && ref) {
                const scrollbarElement =
                    scrollbarsRef.querySelector<HTMLDivElement>(
                        ".ScrollbarsCustom-Scroller",
                    )!;
                scrollbarElement.dataset.virtuosoScroller = "true";
                scrollbarElement.dataset.testId = "virtuoso-scroller";
                // @ts-expect-error
                ref.current = scrollbarElement;
            }
        },
        [ref],
    );

    return (
        <CustomScrollbar
            elementRef={refSetter}
            noDefaultStyles
            style={style}
            css={css({
                width: "100%",
                height: "100%",
                "& > .ScrollbarsCustom-Wrapper": {
                    position: "absolute",
                    overflow: "hidden",
                    inset: 0,
                },
                "& > .ScrollbarsCustom-Track": {
                    "--size": "3px",
                    opacity: 0.5,
                    position: "absolute",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    overflow: "hidden",
                    width: 16,
                    userSelect: "none",
                    height: "100%",
                    right: 2,
                    transition: "all 0.1s ease",
                },
                "& > .ScrollbarsCustom-Track:hover, & > .ScrollbarsCustom-Track:active":
                    {
                        "--size": "8px",
                        opacity: 1,
                    },
                "& > .ScrollbarsCustom-Track > .ScrollbarsCustom-Thumb": {
                    opacity: 0.7,
                    borderRadius: "calc(var(--size) / 2)",
                    width: "var(--size)",
                    background: grey[700],
                    transition: "all 0.1s ease",
                    "&:hover": {
                        opacity: 0.8,
                    },
                    "&:active": {
                        opacity: 1,
                    },
                },
            })}
        >
            {children}
        </CustomScrollbar>
    );
});
export default Scrollbar;
