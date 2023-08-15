import { InternalApi } from "../api";
import { WSApi } from "../ws";
import { decodeEntity } from "./decoder";

export class MessagingMedia {
    private nt: WSApi;
    private fs: Filesystem;
    private pendingDownloads: Record<string, (payload: any) => void> = {};
    constructor({ nt }: InternalApi, fs: Filesystem) {
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
        const type = await this.fs.getFileInfo(file);
        const md5 = await this.fs.getFileMD5Hash(file);
        const fileName = `${md5}.${type.extension}`;
        const filePath = await this.nt.send(
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
        await this.fs.copyFile(file, filePath);
        const [imageWidth, imageHeight] = await this.fs.getImageSize(file);
        const fileSize = await this.fs.getFileSize(file);
        return {
            md5HexStr: md5,
            fileSize: fileSize,
            picWidth: imageWidth,
            picHeight: imageHeight,
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
        if (await this.fs.pathExist(filePath)) return filePath;
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
