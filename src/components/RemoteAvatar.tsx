import RemoteFixedSizeImage from "./RemoteFixedSizeImage";
import { Avatar, SxProps, Theme } from "@mui/material";

export default function RemoteAvatar({
    name,
    file,
    url,
    size,
    sx,
}: {
    name: string;
    file?: string;
    url?: string;
    size: number;
    sx?: SxProps<Theme>;
}) {
    return (
        <Avatar sx={{ width: `${size}px`, height: `${size}px`, ...sx }}>
            {file || url ? (
                <RemoteFixedSizeImage
                    width={size}
                    height={size}
                    file={file}
                    url={url}
                    alt={`${name} 的头像`}
                />
            ) : (
                name.slice(0, 1) || null
            )}
        </Avatar>
    );
}
