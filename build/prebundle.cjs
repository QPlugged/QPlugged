const compile = require("innosetup-compiler");
const { get } = require("axios");
const { zip } = require("compressing");
const { F_OK } = require("fs");
const { writeFile, mkdtemp, mkdir, access } = require("fs/promises");
const { tmpdir } = require("os");
const { spawn } = require("child_process");

async function buildWinSetup() {
    if (process.platform !== "win32") return;
    await compile("./build/setup.iss");
}

async function compressExecutable() {
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
    const executableFileExt = process.platform === "win32" ? ".exe" : "";

    const upxDir = "./.tools/upx";
    mkdir(upxDir, { recursive: true });
    const upxExecutable = `${upxDir}/${upxEdition}/upx${executableFileExt}`;
    try {
        await access(upxExecutable, F_OK);
    } catch {
        const upxArchiveFile = `${await mkdtemp(
            `${tmpdir()}/qplugged-upx-`,
        )}/archive${upxArchiveFileExt}`;
        await writeFile(
            upxArchiveFile,
            (
                await get(
                    `https://github.com/upx/upx/releases/download/v${upxVersion}/${upxEdition}${upxArchiveFileExt}`,
                    { responseType: "arraybuffer" },
                )
            ).data,
        );
        if (upxArchiveFileExt === ".zip")
            await zip.uncompress(upxArchiveFile, upxDir);
        else
            await new Promise((resolve, reject) =>
                spawn("tar", ["-xvJf", "-C", upxDir, upxArchiveFile], {
                    stdio: "inherit",
                })
                    .on("exit", () => resolve())
                    .on("error", (err) => reject(err)),
            );
    }

    let executablePath;
    const possibleTargetPaths = [
        `${process.env.TAURI_TARGET_TRIPLE}/QPlugged${executableFileExt}`,
        `QPlugged${executableFileExt}`,
        `${process.env.TAURI_TARGET_TRIPLE}/qplugged${executableFileExt}`,
        `qplugged${executableFileExt}`,
    ];
    for (const targetPath of possibleTargetPaths) {
        const path = `./src-tauri/target/release/${targetPath}`;
        try {
            await access(path, F_OK);
            executablePath = path;
            break;
        } catch {}
    }
    if (!executablePath) throw new Error("未找到输出的可执行文件");

    await new Promise((resolve, reject) =>
        spawn(
            upxExecutable,
            ["-9q", "--lzma", "--compress-icons=0", executablePath],
            { stdio: "inherit" },
        )
            .on("exit", () => resolve())
            .on("error", (err) => reject(err)),
    );
}

compressExecutable().then(() => buildWinSetup());
