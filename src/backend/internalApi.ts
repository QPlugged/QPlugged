import EventEmitter from "eventemitter3";

export class InternalApiImpl extends EventEmitter<
    InternalApi.Events
> implements InternalApi {
    private endpoint: Endpoint;
    private api: string;
    private initPromise: Promise<void>;
    constructor(endpoint: Endpoint, api: string, events: string[] = []) {
        super();
        this.endpoint = endpoint;
        this.endpoint.on("event", (data) => {
            if (data.api === api) this.emit(data.cmd, data.payload);
        });
        this.api = api;
        this.initPromise = Promise.all(
            events.map((event) => this.listen(event)),
        ).then(() => undefined);
    }
     async send(cmd: string, ...args: any[]):Promise<any> {
        await this.initPromise;
        const data: Endpoint.MessageWithoutId<Endpoint.Message.Call> = {
            type: "call",
            api: this.api,
            cmd: cmd,
            args: args,
        };
        return await this.endpoint.send(data);
    }
     async listen(event?: string | undefined):Promise<void> {
        const data: Endpoint.MessageWithoutId<Endpoint.Message.Call> = {
            type: "call",
            api: `${this.api}-register`,
            cmd: event,
            args: [],
        };
         await this.endpoint.send(data);
    }
}

export class InternalApisImpl implements InternalApis  {
    public business: InternalApi;
    public nt: InternalApi;
    public fs: InternalApi;
    public endpoint: Endpoint;
    constructor(endpoint: Endpoint) {
        this.endpoint = endpoint;
        this.business = new InternalApiImpl(this.endpoint, "BusinessApi");
        this.nt = new InternalApiImpl(this.endpoint, "ntApi", [
            "nodeIKernelMsgListener/onRichMediaDownloadComplete",
        ]);
        this.fs = new InternalApiImpl(this.endpoint, "fsApi");
    }
}
