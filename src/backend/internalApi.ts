import debug from "debug";
import EventEmitter from "eventemitter3";

const logger = debug("internal-api");

export class InternalApiImpl
    extends EventEmitter<InternalApi.Events>
    implements InternalApi
{
    private endpoint: Endpoint;
    private api: string;
    private initPromise: Promise<void>;
    constructor(endpoint: Endpoint, api: string, events: string[] = []) {
        super();
        this.api = api;
        logger("注册 API: %s", this.api);
        this.endpoint = endpoint;
        this.endpoint.on("event", (data) => {
            if (data.api === this.api) {
                logger("%s.on(%o) -> %o", this.api, data.cmd, data.payload);
                this.emit(data.cmd, data.payload);
            }
        });

        this.initPromise = Promise.all(
            events.map((event) => this.listen(event)),
        ).then(() => undefined);
    }
    async send(cmd: string, ...args: any[]): Promise<any> {
        await this.initPromise;
        const data: Endpoint.MessageWithoutId<Endpoint.Message.Call> = {
            type: "call",
            api: this.api,
            cmd: cmd,
            args: args,
        };
        const res = await this.endpoint.send(data);
        logger(
            `res %s.%s(${new Array(args.length).fill("%o").join(", ")}) -> %o`,
            this.api,
            cmd.replaceAll("/", "."),
            ...args,
            res,
        );
        return res;
    }
    async listen(event?: string | undefined): Promise<void> {
        logger("注册监听器 %s.%s", this.api, event);
        const data: Endpoint.MessageWithoutId<Endpoint.Message.Call> = {
            type: "call",
            api: `${this.api}-register`,
            cmd: event,
            args: [],
        };
        await this.endpoint.send(data);
    }
    async unlisten(event?: string | undefined): Promise<void> {
        logger("注销监听器 %s.%s", this.api, event);
        const data: Endpoint.MessageWithoutId<Endpoint.Message.Call> = {
            type: "call",
            api: `${this.api}-unregister`,
            cmd: event,
            args: [],
        };
        await this.endpoint.send(data);
    }
}

export class InternalApisImpl implements InternalApis {
    public business: InternalApi;
    public nt: InternalApi;
    public fs: InternalApi;
    public endpoint: Endpoint;
    constructor(endpoint: Endpoint) {
        this.endpoint = endpoint;
        this.business = new InternalApiImpl(this.endpoint, "BusinessApi");
        this.nt = new InternalApiImpl(this.endpoint, "ntApi", [
            "nodeIKernelMsgListener/onRichMediaDownloadComplete",
            "nodeIKernelBuddyListener/onBuddyListChange",
            "nodeIKernelGroupListener/onGroupListUpdate",
            "nodeIKernelGroupListener/onSearchMemberChange",
            "nodeIKernelGroupListener/onGroupDetailInfoChange",
            "nodeIKernelGroupListener/onGroupBulletinChange",
            "nodeIKernelGroupListener/onMemberListChange",
        ]);
        this.fs = new InternalApiImpl(this.endpoint, "fsApi");
    }
}
