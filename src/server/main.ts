import { initDebugger } from "./debugger";
import { listenPort } from "./env";
import { patchModuleLoader } from "./modules";
import { registerPatch } from "./server";
import { app } from "electron";

console.log(`[QPLUGGED_INIT_PORT]${listenPort}[/]`);

app.disableHardwareAcceleration();

console.log = () => undefined;
console.info = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;

initDebugger();
patchModuleLoader();
registerPatch();
