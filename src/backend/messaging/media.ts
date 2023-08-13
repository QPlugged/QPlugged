import { InternalApi } from "../api";
import { IpcApi } from "../ipc";
import { decodeEntity } from "./decoder";

export class MessagingMedia {
    private nt: IpcApi;
    private fs: IpcApi;
    private pendingDownloads: Record<string, (payload: any) => void> = {};
    constructor({ nt, fs }: InternalApi) {
        this.nt = nt;
        this.fs = fs;
        this.nt.on(
            "nodeIKernelMsgListener/onRichMediaDownloadComplete",
            (payload) => {
                this.pendingDownloads[payload?.notifyInfo?.msgElementId]?.(
                    payload,
                );
            },
        );
    }
    public async prepareImageElement(
        file: string,
        imageType: MessageElementImageType,
        imageSubType: number,
    ): Promise<any> {
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
            picType:
                { typical: 1001, sticker: 1000 }[imageType as string] ||
                imageType,
            picSubType: imageSubType,
            fileUuid: "",
            fileSubId: "",
            thumbFileSize: 0,
            summary: "",
        };
    }
    public async downloadMedia(
        msgId: string,
        elementId: string,
        entity: Entity,
        filePath: string,
    ): Promise<string> {
        if (await this.fs.send("isFileExist", filePath)) return filePath;
        this.nt.send(
            "nodeIKernelMsgService/downloadRichMedia",
            {
                getReq: {
                    ...decodeEntity(entity),
                    msgId: msgId,
                    elementId: elementId,
                    thumbSize: 0,
                    downloadType: 1,
                    filePath: filePath,
                },
            },
            undefined,
        );
        return new Promise<string>((resolve) => {
            this.pendingDownloads[elementId] = (ret) =>
                resolve(ret.notifyInfo.filePath || filePath);
        });
    }
}
