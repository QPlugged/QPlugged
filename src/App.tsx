import { useEffect, useMemo, useState } from "react";
import { LoginImpl } from "./backend/login";
import { InternalApi } from "./backend/api";
import { Api, ApiContext } from "./Api";
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
import { Navigate, RouterProvider, createHashRouter } from "react-router-dom";
import LoginPage from "./pages/login/LoginPage";
import { LogicalSize, getCurrent } from "@tauri-apps/plugin-window";

const titleFontFamily =
	"'Segoe UI Variable Display', 'Segoe UI Variable', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif";
const theme = experimental_extendTheme(
	{
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
			dark: {
				palette: {
					background: {
						default: "#00000000",
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
		children: [
			{
				index: true,
				element: <Navigate to="login" />,
			},
			{
				path: "login",
				element: <LoginPage />,
			},
		],
	},
]);

function App() {
	const [internalApiState, setInternalApiState] = useState<
		"connected" | "disconnected" | "connecting" | undefined
	>();
	const [internalApiError, setInternalApiError] = useState<[number, string]>();
	const [internalApi, _setInternalApi] = useState<InternalApi | undefined>(
		new InternalApi("ws://127.0.0.1:15341"),
	);

	useEffect(() => {
		getCurrent().setSize(new LogicalSize(600, 300));
	}, []);

	useEffect(() => {
		const listener = (event?: CloseEvent) => {
			if (event?.code) {
				setInternalApiError([event?.code, event?.reason]);
			}
			setInternalApiState(
				internalApi?.readyState === internalApi?.CONNECTING
					? "connecting"
					: internalApi?.readyState === internalApi?.OPEN
					? "connected"
					: internalApi?.readyState === internalApi?.CLOSING ||
					  internalApi?.readyState === internalApi?.CLOSED
					? "disconnected"
					: undefined,
			);
		};

		listener();

		if (internalApi) {
			// @ts-expect-error
			internalApi.addEventListener("open", listener);

			// @ts-expect-error
			internalApi.addEventListener("error", listener);

			internalApi.addEventListener("close", listener);

			return () => {
				// @ts-expect-error
				internalApi.removeEventListener("open", listener);

				// @ts-expect-error
				internalApi.removeEventListener("error", listener);

				internalApi.removeEventListener("close", listener);
			};
		}
	}, [internalApi]);

	const api = useMemo((): Api | undefined => {
		if (internalApiState === "connected")
			return {
				login: new LoginImpl(internalApi!),
			};
	}, [internalApiState]);

	return (
		<Experimental_CssVarsProvider theme={theme} defaultMode="system">
			<CssBaseline enableColorScheme />
			<Box sx={{ position: "fixed", inset: 0 }}>
				{internalApiState === "connected" ? (
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
						{internalApiState === "connecting" ? (
							<CircularProgress />
						) : (
							<Alert severity="warning">
								{internalApiState === "disconnected"
									? `已意外与 API 端点断开连接。${
											internalApiError?.[0]
												? `错误代码：${internalApiError?.[0]}`
												: ""
									  }${
											internalApiError?.[1]
												? ` 详细信息${internalApiError?.[1]}`
												: ""
									  }。`
									: "未配置 API 端点。"}
							</Alert>
						)}
					</Stack>
				)}
			</Box>
		</Experimental_CssVarsProvider>
	);
}

export default App;
