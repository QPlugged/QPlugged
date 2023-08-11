export function initDebugger() {
    (process as any)._debugProcess(process.pid);
    console.warn(`已在端口 ${process.debugPort} 上启动 Node.js 调试器`);
}
