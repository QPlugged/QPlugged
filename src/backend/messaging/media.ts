import { decodeEntity } from "./decoder";

export class MessagingMedia {
    private nt: InternalApi;
    private fs: Filesystem;
    private pendingDownloads: Record<string, (payload: any) => void> = {};
    constructor({ nt }: InternalApis, fs: Filesystem) {
        this.nt = nt;
        this.fs = fs;
        this.nt.on(
            "nodeIKernelMsgListener/onRichMediaDownloadComplete",
            (payload: any) => {
                if (this.pendingDownloads[payload?.notifyInfo?.msgElementId]) {
                    this.pendingDownloads[payload.notifyInfo.msgElementId](
                        payload,
                    );
                    delete this.pendingDownloads[
                        payload.notifyInfo.msgElementId
                    ];
                }
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
        downloadType: number,
        entity: Entity,
        filePath: string,
    ): Promise<string> {
        if (await this.fs.pathExist(filePath)) return filePath;
        const peer = decodeEntity(entity);
        // rome-ignore lint/performance/noDelete: <explanation>
        delete peer.guildId;
        this.nt.send(
            "nodeIKernelMsgService/downloadRichMedia",
            {
                getReq: {
                    ...peer,
                    msgId: msgId,
                    elementId: elementId,
                    thumbSize: 0,
                    downloadType: downloadType,
                    filePath: filePath,
                },
            },
            undefined,
        );
        return await new Promise<string>((resolve) => {
            this.pendingDownloads[elementId] = (payload) =>
                resolve(payload.notifyInfo.filePath || filePath);
        });
    }
}
