const compile = require("innosetup-compiler");
const { get } = require("axios");
const { zip } = require("compressing");
const { F_OK } = require("fs");
const { writeFile, mkdtemp, mkdir, access, copyFile, readFile } = require("fs/promises");
const { tmpdir } = require("os");
const { spawn } = require("child_process");
const rcedit = require("rcedit");

process.chdir(`${__dirname}/..`);
const executableFileExt = process.platform === "win32" ? ".exe" : "";
const target = process.env.TAURI_TARGET_TRIPLE;
const platform = target.includes("windows")
    ? "win32"
    : target.includes("linux")
    ? "linux"
    : "unknown";

async function buildWin32Setup(executable, version) {
    await writeFile(
        "./build/setup.generated.iss",
        (await readFile("./build/setup.iss"))
            .toString()
            .replace("$APP_VERSION", version)
            .replace("$APP_EXE", executable)
    );

    for (let i = 0; i < 2; i++) {
        try {
            console.log("正在打包安装包 (Win32)");
            await compile("./build/setup.generated.iss");
            return;
        } catch {
            console.warn(`打包失败 (Win32)，正在进行第 ${i + 1} 次重试`);
        }
    }
    throw new Error("打包失败 (Win32)");
}

async function writeWin32Metadata(executable, version) {
    const win32Version = version.split(".").slice(0, 3).join(".").split("-")[0];

    await rcedit(executable, {
        "file-version": win32Version,
        "product-version": win32Version,
        "version-string": { LegalCopyright: "Copyright 2023 The QPlugged Authors." },
    });
}

async function getExecutable() {
    const possibleTargetPaths = [
        `${target}/QPlugged${executableFileExt}`,
        `QPlugged${executableFileExt}`,
        `${target}/q-plugged${executableFileExt}`,
        `q-plugged${executableFileExt}`,
    ];
    for (const targetPath of possibleTargetPaths) {
        const path = `./src-tauri/target/release/${targetPath}`;
        try {
            await access(path, F_OK);
            return path;
        } catch {}
    }
    throw new Error("未找到输出的可执行文件");
}

async function compressExecutable(executable) {
    const upxVersion = "4.1.0";
    const upxPlatforms = {
        win32: "win32",
        win32_ia32: "win32",
        win32_x64: "win64",
        linux: "i386_linux",
        linux_ia32: "i386_linux",
        linux_x64: "amd64_linux",
        linux_arm: "arm_linux",
        linux_arm64: "arm64_linux",
        linux_mips: "mips_linux",
        linux_mipsel: "mipsel_linux",
        linux_ppc: "powerpc_linux",
        linux_ppc64: "powerpc64le_linux",
    };
    const upxArchiveFileExt = process.platform === "win32" ? ".zip" : ".tar.xz";
    const upxPlatform =
        upxPlatforms[`${process.platform}_${process.arch}`] ||
        upxPlatforms[process.platform];
    const upxEdition = `upx-${upxVersion}-${upxPlatform}`;

    const upxDir = "./.tools/upx";
    mkdir(upxDir, { recursive: true });
    const upxExecutable = `${upxDir}/${upxEdition}/upx${executableFileExt}`;
    try {
        await access(upxExecutable, F_OK);
    } catch {
        const upxArchiveFile = `${await mkdtemp(
            `${tmpdir()}/qplugged-upx-`
        )}/archive${upxArchiveFileExt}`;
        await writeFile(
            upxArchiveFile,
            (
                await get(
                    `https://github.com/upx/upx/releases/download/v${upxVersion}/${upxEdition}${upxArchiveFileExt}`,
                    { responseType: "arraybuffer" }
                )
            ).data
        );
        if (upxArchiveFileExt === ".zip") await zip.uncompress(upxArchiveFile, upxDir);
        else
            await new Promise((resolve, reject) =>
                spawn("tar", ["-xvJf", upxArchiveFile, "-C", upxDir], {
                    stdio: "inherit",
                })
                    .on("exit", () => resolve())
                    .on("error", (err) => reject(err))
            );
    }

    for (let i = 0; i < 2; i++) {
        try {
            console.log("正在压缩可执行文件");
            await new Promise((resolve, reject) =>
                spawn(
                    upxExecutable,
                    ["-9q", "--lzma", "--compress-icons=0", executable],
                    { stdio: "inherit" }
                )
                    .on("exit", () => resolve())
                    .on("error", (err) => reject(err))
            );
            return;
        } catch {
            console.warn(`压缩失败，正在进行第 ${i + 1} 次重试`);
        }
    }
    throw new Error("压缩失败");
}

async function main() {
    const version = require("../package.json").version;
    const executable = await getExecutable();
    if (platform === "win32") await writeWin32Metadata(executable, version);
    await compressExecutable(executable);
    if (platform === "win32") await buildWin32Setup(executable, version);
}

main();
