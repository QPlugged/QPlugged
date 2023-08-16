import { isProduction } from "../main";
import { deserialize, serialize } from "@ungap/structured-clone";
import EventEmitter from "eventemitter3";
import { nanoid } from "nanoid";

type WSMessageWithoutId<T> = Omit<T, "id">;

export class WSApi extends EventEmitter {
    private ws: WebSocket;
    private api: string;
    private pendingCalls: Record<
        string,
        (status: ResponseStatus, ret: any) => void
    > = {};
    private initPromise: Promise<void[]>;
    constructor(ws: WebSocket, api: string, events: string[]) {
        super();
        this.ws = ws;
        this.api = api;
        this.ws.addEventListener("message", (e) => {
            const data = deserialize(JSON.parse(e.data.toString())) as
                | WSLog
                | WSEvent
                | WSResponse;
            if (!isProduction)
                console.debug(
                    "[backend/ws]",
                    "DOWN",
                    ...Object.entries(data).flat(2),
                );
            if (data.type === "event") this.emit(data.cmd, data.payload);
            else if (data.type === "response")
                this.pendingCalls?.[data.id]?.(data.status, data.ret);
        });

        this.initPromise = new Promise<void>((resolve, reject) => {
            if (this.ws.readyState === this.ws.CONNECTING) {
                this.ws.addEventListener("open", () => resolve());
                this.ws.addEventListener("error", () => reject());
            }
        }).then(() =>
            Promise.all(events?.map((event) => this.listen(event)) || []),
        );
    }
    public up(data: WSMessageWithoutId<WSRequest | WSShowLoginWindow>) {
        const id = nanoid();
        const _data = {
            ...data,
            id: id,
        };
        if (!isProduction)
            console.debug(
                "[backend/ws]",
                "UP",
                ...Object.entries(data).flat(2),
            );
        this.ws.send(JSON.stringify(serialize(_data)));
        return new Promise<any>((resolve, reject) => {
            this.pendingCalls[id] = (status, ret) => {
                if (status === "fulfilled") resolve(ret);
                else reject(ret);
            };
        });
    }
    public send(cmd: string, ...args: any[]) {
        const data: WSMessageWithoutId<WSRequest> = {
            type: "call",
            api: this.api,
            cmd: cmd,
            args: args,
        };
        return this.initPromise.then(() => this.up(data));
    }
    public listen(event?: string | undefined) {
        const data: WSMessageWithoutId<WSRequest> = {
            type: "call",
            api: `${this.api}-register`,
            cmd: event,
            args: [],
        };
        return this.up(data);
    }
}

export class WS extends WebSocket {
    constructor(url: string) {
        super(url);
        this.binaryType = "blob";
    }
    public useApi(api: string, events: string[] = []) {
        return new WSApi(this, api, events);
    }
}
