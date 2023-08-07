import { Ipc, IpcApi } from "./ipc";

export class InternalApi extends Ipc {
    public business: IpcApi;
    public nt: IpcApi;
    public fs: IpcApi;
    public preload: IpcApi;
    public preloadReady: IpcApi;
    constructor(url: string) {
        super(url);
        this.business = this.useApi("BusinessApi");
        this.nt = this.useApi("ntApi", [
            "nodeIKernelMsgListener/onRichMediaDownloadComplete",
        ]);
        this.fs = this.useApi("fsApi");
        this.preload = this.useApi("preload");
        this.preloadReady = this.useApi("preload-client-ready");
    }
}
