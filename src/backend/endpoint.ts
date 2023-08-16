import { deserialize, serialize } from "@ungap/structured-clone";
import debug from "debug";
import EventEmitter from "eventemitter3";
import { nanoid } from "nanoid";

const logger = debug("endpoint");
const qlogLogger = debug("endpoint-qlog");

export class WebSocketEndpointImpl
    extends EventEmitter<Endpoint.Events>
    implements WebSocketEndpointImpl
{
    public connection: WebSocket;
    private pendingCalls: Record<
        string,
        (status: Endpoint.Message.ResponseStatus, ret: any) => void
    > = {};
    private initPromise: Promise<void>;
    constructor(url: string) {
        super();
        this.connection = new WebSocket(url);
        logger("正在连接 %s", url);
        this.connection.binaryType = "blob";
        this.connection.addEventListener("message", (event) => {
            const data = deserialize(
                JSON.parse(event.data.toString()),
            ) as Endpoint.OutgoingMessage;
            if (data.type === "log")
                qlogLogger(
                    new Array(data.raw.length).fill("%o").join(" "),
                    ...data.raw,
                );
            else if (data.type === "response") {
                const id = data.id;
                if (this.pendingCalls[id]) {
                    this.pendingCalls[id](data.status, data.ret);
                    delete this.pendingCalls[id];
                }
            } else this.emit("event", data);
        });
        this.initPromise = new Promise<void>((resolve, reject) => {
            if (this.connection.readyState === this.connection.CONNECTING) {
                this.connection.addEventListener("open", () => resolve());
                this.connection.addEventListener("error", () => reject());
            }
        });
    }
    async send<T = any>(data: Endpoint.IncomingMessage): Promise<T> {
        await this.initPromise;
        const id = nanoid();
        const message = {
            ...data,
            id: id,
        };
        this.connection.send(JSON.stringify(serialize(message)));
        return await new Promise<any>((resolve, reject) => {
            this.pendingCalls[id] = (status, ret) => {
                if (status === "fulfilled") resolve(ret);
                else reject(ret);
            };
        });
    }
}
