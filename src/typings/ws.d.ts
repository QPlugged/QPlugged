declare type ResponseStatus = "fulfilled" | "rejected";

declare interface WSShowLoginWindow {
    type: "show-login-window";
    id: string;
}

declare interface WSGetLastWebContentsId {
    type: "get-last-webcontents-id";
    id: string;
}

declare interface WSLog {
    type: "log";
    raw: any;
}

declare interface WSRequest {
    type: "call";
    id: string;
    api: string;
    cmd: string | undefined;
    args: any[];
}

declare interface WSResponse {
    type: "response";
    id: string;
    status: ResponseStatus;
    ret: any;
}

declare interface WSEvent {
    type: "event";
    api: string;
    cmd: string;
    payload: any;
}
