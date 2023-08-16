declare interface InternalApi extends InternalApi.EventEmitter{
    send(cmd: string, ...args: any[]):Promise<any>;
    listen(event?: string | undefined):Promise<void>;
}

declare namespace InternalApi{
    type EventEmitter=import("eventemitter3").EventEmitter<Events>;
    type Events=Record<string, (payload: any) => void>;
}

declare interface InternalApis{
    business: InternalApi;
    nt: InternalApi;
    fs: InternalApi;
    endpoint: Endpoint;
}