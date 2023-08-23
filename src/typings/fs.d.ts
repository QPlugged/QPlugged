declare interface Filesystem {
    getFileMD5Hash(path: string): Promise<string>;
    readTextFile(path: string): Promise<string>;
    readBinaryFile(path: string): Promise<Uint8Array>;
    copyFile(from: string, to: string): Promise<void>;
    getImageSize(path: string): Promise<[number, number]>;
    getFileSize(path: string): Promise<number>;
    getFileInfo(path: string): Promise<{ extension: string }>;
    pathExist(path: string): Promise<boolean>;
}
