import debug, { Debugger } from "debug";
import EventEmitter from "eventemitter3";

export class InternalApiImpl
    extends EventEmitter<InternalApi.Events>
    implements InternalApi
{
    private endpoint: Endpoint;
    private api: string;
    private initPromise: Promise<void>;
    private logger: Debugger;
    constructor(endpoint: Endpoint, api: string, events: string[] = []) {
        super();
        this.api = api;
        this.logger = debug(`iapi-${this.api}`);

        this.logger("注册 API");
        this.endpoint = endpoint;
        this.endpoint.on("event", (data) => {
            if (data.api === this.api) {
                this.logger("on(%o) -> %o", data.cmd, data.payload);
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
        this.logger(
            `%s(${new Array(args.length).fill("%o").join(", ")}) -> %o`,
            cmd.replaceAll("/", "."),
            ...args,
            res,
        );
        return res;
    }
    async listen(event?: string | undefined): Promise<void> {
        this.logger("注册监听器 %s", event);
        const data: Endpoint.MessageWithoutId<Endpoint.Message.Call> = {
            type: "call",
            api: `${this.api}-register`,
            cmd: event,
            args: [],
        };
        await this.endpoint.send(data);
    }
    async unlisten(event?: string | undefined): Promise<void> {
        this.logger("注销监听器 %s", event);
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
