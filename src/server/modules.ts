import { Module } from "module";

export const modules: Record<string, any> = {};

export function defineModule(name: string, api: any) {
    if (modules[name]) throw new Error("模块已经存在");
    modules[name] = api;
}

export function patchModuleLoader() {
    const originalModuleLoad = (Module as any)._load as Function;
    (Module as any)._load = (
        request: string,
        parent: NodeModule,
        isMain: boolean,
        ...rest: any[]
    ) => {
        return (
            modules[request] ||
            originalModuleLoad.call(Module, request, parent, isMain, ...rest)
        );
    };
}
