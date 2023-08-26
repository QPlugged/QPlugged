import { ApiContext } from "../Api";
import { css } from "@emotion/react";
import { BrokenImageTwoTone } from "@mui/icons-material";
import { Skeleton, Stack } from "@mui/material";
import axios from "axios";
import { atom, useAtom } from "jotai";
import { memo, useContext, useEffect, useMemo, useState } from "react";

const cachedImagesAtom = atom(new Map<string, string>());

const RemoteFixedSizeImage = memo(
    ({
        file,
        url,
        width,
        height,
        alt,
    }: {
        file?: string;
        url?: string;
        width: number;
        height: number;
        alt?: string;
    }) => {
        const MAX_CACHED_IMAGES_COUNT = 1000;
        const api = useContext(ApiContext);
        const [cachedImages, setCachedImages] = useAtom(cachedImagesAtom);

        const cachedImageObjectURL = useMemo(
            () => cachedImages.get((file || url)!),
            [cachedImages, file, url],
        );
        const [imageObjectURL, setImageObjectURL] = useState<string>();
        const [loaded, setLoaded] = useState<boolean>(false);
        const [failed, setFailed] = useState<boolean>(false);

        useEffect(() => {
            (async () => {
                if (imageObjectURL || (!url && !file)) return;
                if (cachedImageObjectURL)
                    setImageObjectURL(cachedImageObjectURL);
                else {
                    const data = file
                        ? await api.fs.readBinaryFile(file)
                        : url
                        ? (await axios.get(url)).data
                        : undefined;
                    if (!data) throw new Error("图片加载失败");
                    const blob = new Blob([data]);
                    const objectURL = URL.createObjectURL(blob);
                    setImageObjectURL(objectURL);
                }
            })().catch(() => {
                setFailed(true);
                setLoaded(true);
            });
        }, [file, url, api, imageObjectURL, cachedImageObjectURL]);

        useEffect(() => {
            return () => {
                if (imageObjectURL)
                    setCachedImages((oldCachedImages) => {
                        const map = oldCachedImages.set(
                            (file || url)!,
                            imageObjectURL,
                        );
                        for (const [key, objectURL] of map) {
                            if (map.size <= MAX_CACHED_IMAGES_COUNT) break;
                            URL.revokeObjectURL(objectURL);
                            map.delete(key);
                        }
                        return new Map(map);
                    });
            };
        }, [imageObjectURL]);

        return (
            <Stack
                position="relative"
                display="inline-flex"
                component="span"
                width={`${width}px`}
                height={`${height}px`}
                maxWidth="100%"
                overflow="hidden"
                direction="column"
                alignItems="center"
                justifyContent="center"
                sx={{ verticalAlign: "bottom" }}
            >
                {failed && <BrokenImageTwoTone />}
                {!loaded && (
                    <Skeleton
                        width="100%"
                        height="100%"
                        variant="rectangular"
                        sx={{ transform: "none" }}
                    />
                )}
                <img
                    src={imageObjectURL}
                    alt={alt}
                    css={css({
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        maxWidth: "100%",
                        maxHeight: "100%",
                        opacity: failed || !loaded ? 0 : 1,
                        zIndex: 1,
                        transform: "translate(-50%,-50%)",
                    })}
                    onLoad={() => setLoaded(true)}
                    onError={() => setFailed(true)}
                />
            </Stack>
        );
    },
);

export default RemoteFixedSizeImage;
