import ckeditor5 from "@ckeditor/vite-plugin-ckeditor5";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import react from "@vitejs/plugin-react";
import { internalIpV4 } from "internal-ip";
import { createRequire } from "module";
import rollupNodePolyFill from "rollup-plugin-polyfill-node";
import { defineConfig } from "vite";
import obfuscatorPlugin from "vite-plugin-javascript-obfuscator";

const require = createRequire(import.meta.url);

const mobile = !!/android|ios/.exec(process.env.TAURI_PLATFORM);

// https://vitejs.dev/config/
export default defineConfig(async (env) => ({
    plugins: [
        react(),
        ckeditor5({ theme: require.resolve("@ckeditor/ckeditor5-theme-lark") }),
        env.mode === "production" &&
            obfuscatorPlugin({
                options: {
                    compact: true,
                    controlFlowFlattening: false,
                    deadCodeInjection: true,
                    deadCodeInjectionThreshold: 0.1,
                    debugProtection: false,
                    debugProtectionInterval: 0,
                    disableConsoleOutput: false,
                    identifierNamesGenerator: "hexadecimal",
                    log: false,
                    numbersToExpressions: false,
                    renameGlobals: false,
                    selfDefending: true,
                    simplify: true,
                    splitStrings: true,
                    stringArray: true,
                    stringArrayCallsTransform: false,
                    stringArrayEncoding: [],
                    stringArrayIndexShift: true,
                    stringArrayRotate: true,
                    stringArrayShuffle: true,
                    stringArrayWrappersCount: 1,
                    stringArrayWrappersChainedCalls: true,
                    stringArrayWrappersParametersMaxCount: 2,
                    stringArrayWrappersType: "variable",
                    stringArrayThreshold: 0.75,
                    unicodeEscapeSequence: false,
                },
            }),
    ],
    build: {
        chunkSizeWarningLimit: Infinity,
        outDir: "dist/vite",
        emptyOutDir: true,
        // rollupOptions: {
        //     // plugins: [rollupNodePolyFill()],
        // },
    },
    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: "globalThis",
            },
            // Enable esbuild polyfill plugins
            plugins: [
                // NodeGlobalsPolyfillPlugin({
                //     buffer: true,
                // }),
                NodeModulesPolyfillPlugin(),
            ],
        },
    },

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
        host: mobile ? "0.0.0.0" : false,
        port: 1420,
        hmr: mobile
            ? {
                  protocol: "ws",
                  host: await internalIpV4(),
                  port: 1421,
              }
            : undefined,
        strictPort: true,
    },
    // 3. to make use of `TAURI_DEBUG` and other env variables
    // https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
    envPrefix: ["VITE_", "TAURI_"],
}));
