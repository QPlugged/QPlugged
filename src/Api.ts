import { createContext } from "react";

export interface Api {
	login: Login;
}

// @ts-expect-error
export const ApiContext = createContext<Api>(undefined);
