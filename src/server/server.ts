import { isInspectorMode, isProduction, listenPort } from "./env";
import { defineModule } from "./modules";
import { deserialize, serialize } from "@ungap/structured-clone";
import {
    BrowserWindow,
    BrowserWindowConstructorOptions,
    app,
    ipcMain,
} from "electron";
import { WebSocketServer } from "ws";

let loginWindowStatus: "opened" | "destroyed" | "never-shown" = "never-shown";
let loginWindow: BrowserWindow | undefined;

function patchBrowserWindow() {
    const wss = new WebSocketServer({ port: listenPort });
    wss.on("error", () => undefined);
    wss.on("connection", (client) => {
        client.on("close", () => {
            setTimeout(
                () => wss.clients.size === 0 && app.quit(),
                isProduction ? 1000 : 5000,
            );
        });
        client.on("message", (_data) => {
            const wrapPromise = (id: string, promise: Promise<any>) => {
                promise
                    .then((ret) => {
                        const res: WSResponse = {
                            type: "response",
                            id: id,
                            status: "fulfilled",
                            ret: ret,
                        };
                        client.send(JSON.stringify(res), () => undefined);
                    })
                    .catch((reason) => {
                        const res: WSResponse = {
                            type: "response",
                            id: id,
                            status: "rejected",
                            ret: reason,
                        };
                        client.send(JSON.stringify(res), () => undefined);
                    });
            };
            const data: WSRequest | WSShowLoginWindow | WSGetLastWebContentsId =
                deserialize(JSON.parse(_data.toString()));
            if (data.type === "call") {
                const windows = BrowserWindow.getAllWindows();
                const window = windows[windows.length - 1];
                const webContent = window.webContents;
                const registerSuffix = "-register";
                const isRegister = data.api.endsWith(registerSuffix);
                const msg = [
                    {
                        returnValue: undefined,
                        sender: webContent,
                    },
                    {
                        type: "request",
                        callbackId: `_!_${data.id}`,
                        eventName: `ns-${data.api.slice(
                            0,
                            isRegister
                                ? data.api.lastIndexOf(registerSuffix)
                                : undefined,
                        )}-${webContent.id}${isRegister ? "-register" : ""}`,
                    },
                    [data.cmd, ...data.args],
                ];
                ipcMain
                    .listeners(`IPC_UP_${webContent.id}`)
                    // @ts-expect-error
                    .map((func) => !func.__internal && func(...msg));
            } else if (data.type === "show-login-window") {
                wrapPromise(
                    data.id,
                    new Promise<void>((resolve, reject) => {
                        const resolveOnClose = () => {
                            // @ts-expect-error
                            loginWindow!._show();
                            loginWindow!.on("closed", () => resolve());
                        };
                        if (loginWindowStatus === "opened") resolveOnClose();
                        else if (loginWindowStatus === "destroyed")
                            reject(new Error("登录窗口已被关闭"));
                        else if (loginWindowStatus === "never-shown") {
                            let timeout = 10;
                            const timer = setInterval(() => {
                                timeout--;
                                if (loginWindowStatus === "opened") {
                                    resolveOnClose();
                                    clearInterval(timer);
                                }
                                if (timeout <= 0) {
                                    clearInterval(timer);
                                    reject(new Error("登录窗口加载超时"));
                                }
                            }, 1000);
                        }
                    }),
                );
            } else if (data.type === "get-last-webcontents-id") {
                wrapPromise(
                    data.id,
                    (async () => {
                        const windows = BrowserWindow.getAllWindows();
                        const window = windows[windows.length - 1];
                        const webContent = window.webContents;
                        return webContent.id;
                    })(),
                );
            }
        });
    });

    return new Proxy(BrowserWindow, {
        construct(
            target,
            [options]: [BrowserWindowConstructorOptions],
            newTarget,
        ) {
            const patchedOptions: BrowserWindowConstructorOptions = {
                ...options,
                show: !isInspectorMode ? options.show : false,
                webPreferences: {
                    ...options.webPreferences,
                    // preload:
                    //     !isInspectorMode && loginWindowStatus !== "never-shown"
                    //         ? options.webPreferences?.preload &&
                    //           dirname(options.webPreferences.preload)
                    //         : options.webPreferences?.preload,
                    nodeIntegration: true,
                },
            };

            const win = Reflect.construct(
                target,
                [patchedOptions],
                newTarget,
            ) as BrowserWindow;

            if (loginWindowStatus === "never-shown") {
                loginWindow = win;
                win.on("closed", () => {
                    loginWindowStatus = "destroyed";
                    loginWindow = undefined;
                });
            }

            const send = win.webContents.send;
            win.webContents.send = (channel: string, ...args: any[]) => {
                if (args?.[0]?.eventName?.startsWith("ns-LoggerApi")) return;
                if (channel.startsWith("IPC_")) {
                    let data:
                        | WSLog
                        | WSEvent
                        | WSRequest
                        | WSResponse
                        | undefined;
                    if (args?.[0]?.type === "request") {
                        const eventName = args?.[0]?.eventName as
                            | string
                            | undefined;
                        const prefix = "ns-";
                        const subfix = `-${win.webContents.id.toString()}`;
                        const api =
                            eventName?.substring(
                                eventName.indexOf(prefix) + prefix.length,
                                eventName.lastIndexOf(subfix),
                            ) || "unknown";
                        if (args?.[1]?.[0]?.cmdType === "event") {
                            data = {
                                type: "event",
                                api: api,
                                cmd: args?.[1]?.[0]?.cmdName,
                                payload: args?.[1]?.[0]?.payload,
                            };
                        } else {
                            data = {
                                type: "call",
                                id: args?.[0]?.callbackId,
                                api: api,
                                cmd: args?.[1]?.[0],
                                args: args?.[1]?.slice(1) || [],
                            };
                        }
                    } else if (
                        args?.[0]?.type === "response" &&
                        args?.[0]?.callbackId?.startsWith("_!_")
                    ) {
                        data = {
                            type: "response",
                            id: args[0].callbackId.replace("_!_", ""),
                            status:
                                args?.[0]?.promiseStatue === "full"
                                    ? "fulfilled"
                                    : "rejected",
                            ret: args?.[1],
                        };
                    } else if (isInspectorMode) {
                        data = {
                            type: "log",
                            raw: args,
                        };
                    }
                    if (data)
                        for (const client of wss.clients) {
                            client.send(
                                JSON.stringify(serialize(data)),
                                () => undefined,
                            );
                        }
                }
                return send.call(win.webContents, channel, ...args);
            };

            const upChannel = `IPC_UP_${win.webContents.id}`;
            const listener = (_: Electron.IpcMainEvent, ...args: any[]) => {
                if (isInspectorMode)
                    if (!args?.[0]?.eventName?.startsWith("ns-LoggerApi")) {
                        const data: WSLog = {
                            type: "log",
                            raw: args,
                        };
                        for (const client of wss.clients) {
                            client.send(
                                JSON.stringify(serialize(data)),
                                () => undefined,
                            );
                        }
                    }
            };
            listener.__internal = true;

            ipcMain.on(upChannel, listener);
            win.on("closed", () => ipcMain.off(upChannel, listener));

            if (loginWindowStatus === "never-shown") {
                // @ts-expect-error
                win._show = win.show;
                // @ts-expect-error
                win._showInactive = win.showInactive;
            } else if (!isInspectorMode) {
                win.webContents.insertCSS("*{display:none;}");
            }
            if (!isInspectorMode) {
                win.show = () => undefined;
                win.showInactive = () => undefined;
            }
            win.webContents.on("before-input-event", (_, input) => {
                if (input.key === "F5") win.webContents.reload();
            });

            loginWindowStatus = "opened";

            return win;
        },
    });
}

export function registerPatch() {
    defineModule("electron", {
        ...require("electron"),
        BrowserWindow: patchBrowserWindow(),
    });
    // defineModule("vm", {
    //     ...require("vm"),
    //     Script: new Proxy(Script, {
    //         construct(target, argArray: [string, ScriptOptions], newTarget) {
    //             if (argArray[1]?.filename && argArray[1]?.cachedData)
    //                 writeFileSync(
    //                     `C:/Users/Flysoft/Desktop/${basename(
    //                         argArray[1].filename,
    //                     )}`,
    //                     argArray[1].cachedData,
    //                 );
    //             return Reflect.construct(target, argArray, newTarget);
    //         },
    //     }),
    // });
}
