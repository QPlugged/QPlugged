import { Api, ApiContext } from "./Api";
import { FilesystemImpl } from "./backend/fs";
import { LoginImpl } from "./backend/login";
import { MessagingImpl } from "./backend/messaging";
import LoginPage from "./pages/login/LoginPage";
import { MainPage } from "./pages/main/MainPage";
import {
    Alert,
    Box,
    CircularProgress,
    CssBaseline,
    Experimental_CssVarsProvider,
    Stack,
    experimental_extendTheme,
} from "@mui/material";
import { zhCN } from "@mui/material/locale";
import { useEffect, useMemo, useState } from "react";
import { RouterProvider, createHashRouter } from "react-router-dom";
import { tauri } from "@tauri-apps/api";
import IndexPage from "./pages/IndexPage";
import { WebSocketEndpointImpl } from "./backend/endpoint";
import { InternalApisImpl } from "./backend/internalApi";

declare module "@mui/material/styles" {
    interface MessageColor {
        text: string;
        background: string;
    }

    interface Message {
        self: MessageColor;
        others: MessageColor;
    }

    interface Palette {
        message: Message;
    }

    interface PaletteOptions {
        message: Message;
    }
}

const titleFontFamily =
    "'Segoe UI Variable Display', 'Segoe UI Variable', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif";
const theme = experimental_extendTheme(
    {
        shadows: [
            "none",
            "0px 2px 1px -1px rgba(0,0,0,0.08),0px 1px 1px 0px rgba(0,0,0,0.08),0px 1px 3px 0px rgba(0,0,0,0.05)",
            "0px 3px 1px -2px rgba(0,0,0,0.08),0px 2px 2px 0px rgba(0,0,0,0.08),0px 1px 5px 0px rgba(0,0,0,0.05)",
            "0px 3px 3px -2px rgba(0,0,0,0.08),0px 3px 4px 0px rgba(0,0,0,0.08),0px 1px 8px 0px rgba(0,0,0,0.05)",
            "0px 2px 4px -1px rgba(0,0,0,0.08),0px 4px 5px 0px rgba(0,0,0,0.08),0px 1px 10px 0px rgba(0,0,0,0.05)",
            "0px 3px 5px -1px rgba(0,0,0,0.08),0px 5px 8px 0px rgba(0,0,0,0.08),0px 1px 14px 0px rgba(0,0,0,0.05)",
            "0px 3px 5px -1px rgba(0,0,0,0.08),0px 6px 10px 0px rgba(0,0,0,0.08),0px 1px 18px 0px rgba(0,0,0,0.05)",
            "0px 4px 5px -2px rgba(0,0,0,0.08),0px 7px 10px 1px rgba(0,0,0,0.08),0px 2px 16px 1px rgba(0,0,0,0.05)",
            "0px 5px 5px -3px rgba(0,0,0,0.08),0px 8px 10px 1px rgba(0,0,0,0.08),0px 3px 14px 2px rgba(0,0,0,0.05)",
            "0px 5px 6px -3px rgba(0,0,0,0.08),0px 9px 12px 1px rgba(0,0,0,0.08),0px 3px 16px 2px rgba(0,0,0,0.05)",
            "0px 6px 6px -3px rgba(0,0,0,0.08),0px 10px 14px 1px rgba(0,0,0,0.08),0px 4px 18px 3px rgba(0,0,0,0.05)",
            "0px 6px 7px -4px rgba(0,0,0,0.08),0px 11px 15px 1px rgba(0,0,0,0.08),0px 4px 20px 3px rgba(0,0,0,0.05)",
            "0px 7px 8px -4px rgba(0,0,0,0.08),0px 12px 17px 2px rgba(0,0,0,0.08),0px 5px 22px 4px rgba(0,0,0,0.05)",
            "0px 7px 8px -4px rgba(0,0,0,0.08),0px 13px 19px 2px rgba(0,0,0,0.08),0px 5px 24px 4px rgba(0,0,0,0.05)",
            "0px 7px 9px -4px rgba(0,0,0,0.08),0px 14px 21px 2px rgba(0,0,0,0.08),0px 5px 26px 4px rgba(0,0,0,0.05)",
            "0px 8px 9px -5px rgba(0,0,0,0.08),0px 15px 22px 2px rgba(0,0,0,0.08),0px 6px 28px 5px rgba(0,0,0,0.05)",
            "0px 8px 10px -5px rgba(0,0,0,0.08),0px 16px 24px 2px rgba(0,0,0,0.08),0px 6px 30px 5px rgba(0,0,0,0.05)",
            "0px 8px 11px -5px rgba(0,0,0,0.08),0px 17px 26px 2px rgba(0,0,0,0.08),0px 6px 32px 5px rgba(0,0,0,0.05)",
            "0px 9px 11px -5px rgba(0,0,0,0.08),0px 18px 28px 2px rgba(0,0,0,0.08),0px 7px 34px 6px rgba(0,0,0,0.05)",
            "0px 9px 12px -6px rgba(0,0,0,0.08),0px 19px 29px 2px rgba(0,0,0,0.08),0px 7px 36px 6px rgba(0,0,0,0.05)",
            "0px 10px 13px -6px rgba(0,0,0,0.08),0px 20px 31px 3px rgba(0,0,0,0.08),0px 8px 38px 7px rgba(0,0,0,0.05)",
            "0px 10px 13px -6px rgba(0,0,0,0.08),0px 21px 33px 3px rgba(0,0,0,0.08),0px 8px 40px 7px rgba(0,0,0,0.05)",
            "0px 10px 14px -6px rgba(0,0,0,0.08),0px 22px 35px 3px rgba(0,0,0,0.08),0px 8px 42px 7px rgba(0,0,0,0.05)",
            "0px 11px 14px -7px rgba(0,0,0,0.08),0px 23px 36px 3px rgba(0,0,0,0.08),0px 9px 44px 8px rgba(0,0,0,0.05)",
            "0px 11px 15px -7px rgba(0,0,0,0.08),0px 24px 38px 3px rgba(0,0,0,0.08),0px 9px 46px 8px rgba(0,0,0,0.05)",
        ],
        typography: {
            h1: {
                fontFamily: titleFontFamily,
            },
            h2: {
                fontFamily: titleFontFamily,
            },
            h3: {
                fontFamily: titleFontFamily,
            },
            h4: {
                fontFamily: titleFontFamily,
            },
            h5: {
                fontFamily: titleFontFamily,
            },
            h6: {
                fontFamily: titleFontFamily,
            },
        },
        colorSchemes: {
            light: {
                palette: {
                    background: {
                        default: "#ffffff00",
                    },
                    message: {
                        self: {
                            text: "#111",
                            background: "#def1fd",
                        },
                        others: {
                            text: "#111",
                            background: "#fff",
                        },
                    },
                },
            },
            dark: {
                palette: {
                    background: {
                        default: "#00000000",
                    },
                    message: {
                        self: {
                            text: "#fff",
                            background: "#456993ff",
                        },
                        others: {
                            text: "#fff",
                            background: "#1c2633ff",
                        },
                    },
                },
            },
        },
    },
    zhCN,
);
const router = createHashRouter([
    {
        path: "/",
        element: <IndexPage />,
        children: [
            {
                path: "login",
                element: <LoginPage />,
            },
            {
                path: "main",
                element: <MainPage />,
            },
        ],
    },
]);

function App() {
    const [endpointState, setEndpointState] = useState<
        | "connected"
        | "disconnected"
        | "connecting"
        | "not-configured"
        | "preparing"
    >("preparing");
    const [endpointError, setEndpointError] = useState<[number, string]>();
    const [internalApis, setInternalApis] = useState<
        InternalApis | undefined
    >();

    useEffect(() => {
        (async () => {
            setEndpointState("preparing");
            const url = await tauri.invoke<string>("get_server_url");
            if (url) {
                const endpoint = new WebSocketEndpointImpl(url);
                setInternalApis(new InternalApisImpl(endpoint));
            } else setEndpointState("not-configured");
        })();
    }, []);

    useEffect(() => {
        const endpoint = (
            internalApis?.endpoint as WebSocketEndpointImpl | undefined
        )?.connection;
        const listener = (event?: any) => {
            if (event?.code) setEndpointError([event?.code, event?.reason]);
            setEndpointState(
                endpoint
                    ? {
                          [endpoint.CONNECTING]: "connecting" as const,
                          [endpoint.OPEN]: "connected" as const,
                          [endpoint.CLOSING]: "disconnected" as const,
                      }[endpoint.readyState] || ("disconnected" as const)
                    : "preparing",
            );
        };
        listener();
        if (endpoint) {
            endpoint.addEventListener("open", listener);
            endpoint.addEventListener("error", listener);
            endpoint.addEventListener("close", listener);
            return () => {
                endpoint.removeEventListener("open", listener);
                endpoint.removeEventListener("error", listener);
                endpoint.removeEventListener("close", listener);
            };
        }
    }, [internalApis]);

    const api = useMemo((): Api | undefined => {
        if (endpointState === "connected" && internalApis) {
            const login = new LoginImpl(internalApis);
            const fs = new FilesystemImpl(internalApis);
            const messaging = new MessagingImpl(internalApis, fs);
            return {
                login,
                fs,
                messaging,
            };
        }
    }, [endpointState, internalApis]);

    return (
        <Experimental_CssVarsProvider theme={theme} defaultMode="system">
            <CssBaseline enableColorScheme />
            <Box sx={{ position: "fixed", inset: 0 }}>
                {endpointState === "connected" ? (
                    <ApiContext.Provider value={api!}>
                        <RouterProvider router={router} />
                    </ApiContext.Provider>
                ) : (
                    <Stack
                        alignItems="center"
                        justifyContent="center"
                        width="100%"
                        height="100%"
                    >
                        {endpointState === "connecting" ||
                        endpointState === "preparing" ? (
                            <CircularProgress />
                        ) : endpointState === "disconnected" ? (
                            <Alert severity="error">
                                {`已意外与 API 端点断开连接。${
                                    endpointError?.[0]
                                        ? `错误代码：${endpointError?.[0]}`
                                        : ""
                                }${
                                    endpointError?.[1]
                                        ? ` 详细信息${endpointError?.[1]}`
                                        : ""
                                }。`}
                            </Alert>
                        ) : endpointState === "not-configured" ? (
                            <Alert severity="info">未配置 API 端点。</Alert>
                        ) : null}
                    </Stack>
                )}
            </Box>
        </Experimental_CssVarsProvider>
    );
}

export default App;
