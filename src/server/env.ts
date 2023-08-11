import { findFreePort } from "./freePort";

// @ts-expect-error
export const isProduction: boolean = IS_PROD;
export const isInspectorMode =
    (process.env.QP_INSPECTOR && !!parseInt(process.env.QP_INSPECTOR)) || true;
export const listenPort =
    (process.env.QP_PORT && parseInt(process.env.QP_PORT)) || isProduction
        ? findFreePort()
        : 15321;
