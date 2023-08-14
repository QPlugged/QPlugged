import RemoteFixedSizeImage from "./RemoteFixedSizeImage";
import { Avatar } from "@mui/material";

export default function RemoteAvatar({
    name,
    file,
    url,
    size,
}: { name: string; file?: string; url?: string; size: number }) {
    return (
        <Avatar sx={{ width: `${size}px`, height: `${size}px` }}>
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
