const compile = require("innosetup-compiler");

async function buildWinSetup() {
    if (process.platform !== "win32") return;
    await compile("./build/setup.iss");
}

buildWinSetup();
