import { InternalApi } from "./api";
import { IpcApi } from "./ipc";

export class FilesystemImpl implements Filesystem {
    private fs: IpcApi;
    constructor({ fs }: InternalApi) {
        this.fs = fs;
    }
    getFileMD5Hash(path: string): Promise<string> {
        return this.fs.send("getFileMd5", path);
    }
    private _readFile(
        path: string,
        encoding?: "utf-8" | undefined,
    ): Promise<any> {
        return this.fs.send("readFile", {
            encoding: encoding,
            path: path,
        });
    }
    readTextFile(path: string): Promise<string> {
        return this._readFile(path, "utf-8");
    }
    readBinaryFile(path: string): Promise<any> {
        return this._readFile(path);
    }
    copyFile(from: string, to: string): Promise<void> {
        return this.fs.send("copyFile", { fromPath: from, toPath: to });
    }
    async getImageSize(path: string): Promise<[number, number]> {
        const { width, height } = await this.fs.send(
            "getImageSizeFromPath",
            path,
        );
        return [width, height];
    }
    getFileSize(path: string): Promise<number> {
        return this.fs.send("getFileSize", path);
    }
    async getFileInfo(path: string): Promise<{ extension: string }> {
        const res = await this.fs.send("getFileType", path);
        return { extension: res.ext };
    }
    pathExist(path: string): Promise<boolean> {
        return this.fs.send("isFileExist", path);
    }
}
