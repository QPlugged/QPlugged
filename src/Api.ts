import { createContext } from "react";

export interface Api {
    login: Login;
    messaging: Messaging;
    fs: Filesystem;
}

// @ts-expect-error
export const ApiContext = createContext<Api>(undefined);
