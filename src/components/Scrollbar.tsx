import { css } from "@emotion/react";
import { grey } from "@mui/material/colors";
import CustomScrollbar from "react-scrollbars-custom";

export default function Scrollbar({ children }: { children: React.ReactNode }) {
    return (
        <CustomScrollbar
            noDefaultStyles
            css={css({
                width: "100%",
                height: "100%",
                "& > .ScrollbarsCustom-Wrapper": {
                    position: "absolute",
                    overflow: "hidden",
                    inset: 0,
                },
                "& > .ScrollbarsCustom-Track": {
                    opacity: 0,
                    position: "absolute",
                    overflow: "hidden",
                    borderRadius: 3.75,
                    userSelect: "none",
                    width: 7.5,
                    height: "100%",
                    right: 2,
                    transition: "opacity 0.1s ease",
                },
                "&:hover > .ScrollbarsCustom-Track, &:active > .ScrollbarsCustom-Track":
                    {
                        opacity: 1,
                    },
                "& > .ScrollbarsCustom-Track > .ScrollbarsCustom-Thumb": {
                    opacity: 0.5,
                    borderRadius: "inherit",
                    width: "100%",
                    background: grey[700],
                    transition: "opacity 0.1s ease",
                    "&:hover, &:active": {
                        opacity: 1,
                    },
                },
            })}
        >
            {children}
        </CustomScrollbar>
    );
}
