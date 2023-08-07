import { InternalApi } from "../api";
import { IpcApi } from "../ipc";
import { decodePeer } from "./decoder";

export class MessagingMedia {
    private nt: IpcApi;
    private fs: IpcApi;
    private pendingDownloads: Record<string, () => void> = {};
    constructor({ nt, fs }: InternalApi) {
        this.nt = nt;
        this.fs = fs;
        this.nt.on(
            "nodeIKernelMsgListener/onRichMediaDownloadComplete",
            (payload) => {
                this.pendingDownloads[payload?.notifyInfo?.msgElementId]?.();
            },
        );
    }
    public async prepareImageElement(file: string): Promise<any> {
        const type = await this.fs.send("getFileType", file);
        const md5 = await this.fs.send("getFileMd5", file);
        const fileName = `${md5}.${type.ext}`;
        const filePath = await this.fs.send(
            "nodeIKernelMsgService/getRichMediaFilePath",

            {
                md5HexStr: md5,
                fileName: fileName,
                elementType: 2,
                elementSubType: 0,
                thumbSize: 0,
                needCreate: true,
                fileType: 1,
            },
        );
        await this.fs.send("copyFile", { fromPath: file, toPath: filePath });
        const imageSize = await this.fs.send("getImageSizeFromPath", file);
        const fileSize = await this.fs.send("getFileSize", file);
        return {
            md5HexStr: md5,
            fileSize: fileSize,
            picWidth: imageSize.width,
            picHeight: imageSize.height,
            fileName: fileName,
            sourcePath: filePath,
            original: true,
            picType: 1001,
            picSubType: 0,
            fileUuid: "",
            fileSubId: "",
            thumbFileSize: 0,
            summary: "",
        };
    }
    public async downloadMedia(
        msgId: string,
        elementId: string,
        peer: Peer,
        filePath: string,
        originalFilePath: string,
    ): Promise<void> {
        if (await this.fs.send("isFileExist", originalFilePath)) return;
        this.nt.send(
            "nodeIKernelMsgService/downloadRichMedia",
            {
                getReq: {
                    ...decodePeer(peer),
                    msgId: msgId,
                    elementId: elementId,
                    thumbSize: 0,
                    downloadType: 2,
                    filePath: filePath,
                },
            },
            undefined,
        );
        return new Promise<void>((resolve) => {
            this.pendingDownloads[elementId] = () => resolve();
        });
    }
}
