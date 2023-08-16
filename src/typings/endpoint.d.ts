interface Endpoint extends Endpoint.EventEmitter {
    send<T = any>(
        data: Endpoint.MessageWithoutId<Endpoint.IncomingMessage>,
    ): Promise<T>;
}

interface WebSocketEndpoint extends Endpoint {
    connection:WebSocket;
}


declare namespace Endpoint {
    type EventEmitter = import("eventemitter3").EventEmitter<Events>;
    interface Events {
        event: (data: EndpointMessageEvent) => void;
    }

    type IncomingMessage =
        | Message.ShowLoginWindow
        | Message.GetLastWebContentsId
        | Message.Call;
    type OutgoingMessage = Message.Log | Message.Response | Message.Event;
    type MessageWithoutId<T> = Omit<T, "id">;
    declare namespace Message {
        declare interface ShowLoginWindow {
            type: "show-login-window";
            id: string;
        }

        declare interface GetLastWebContentsId {
            type: "get-last-webcontents-id";
            id: string;
        }

        declare interface Log {
            type: "log";
            raw: any;
        }

        declare interface Call {
            type: "call";
            id: string;
            api: string;
            cmd: string | undefined;
            args: any[];
        }

        declare type ResponseStatus = "fulfilled" | "rejected";

        declare interface Response {
            type: "response";
            id: string;
            status: ResponseStatus;
            ret: any;
        }

        declare interface Event {
            type: "event";
            api: string;
            cmd: string;
            payload: any;
        }
    }
}
