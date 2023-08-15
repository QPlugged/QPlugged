import { WS, WSApi } from "./ws";

export class InternalApi extends WS {
    public business: WSApi;
    public nt: WSApi;
    public fs: WSApi;
    public preload: WSApi;
    public preloadReady: WSApi;
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
