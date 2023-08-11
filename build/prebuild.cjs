const { build } = require("esbuild");
const { obfuscate } = require("javascript-obfuscator");
const { writeFile } = require("fs/promises");

const isProduction = process.env.NODE_ENV === "production";

function obfuscateJS(code) {
    return isProduction
        ? obfuscate(code, {
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
              selfDefending: false,
              simplify: false,
              splitStrings: false,
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
          }).getObfuscatedCode()
        : code;
}

async function buildServer() {
    const result = await build({
        target: "node18",
        platform: "node",
        bundle: true,
        sourcemap: false,
        minify: isProduction,
        treeShaking: isProduction,
        external: ["electron"],
        write: false,
        entryPoints: ["./src/server/main.ts"],
        define: {
            IS_PROD: JSON.stringify(isProduction),
        },
    });
    const code = obfuscateJS(result.outputFiles[0].text);
    await writeFile("./dist/qplugged-server.js", code);
}

buildServer();
