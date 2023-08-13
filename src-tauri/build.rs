use std::{env, process::Command};

fn main() {
    println!("cargo:rerun-if-changed=../build/prebuild.cjs");
    println!("cargo:rerun-if-changed=../src/server");
    println!("cargo:rerun-if-changed=../package.json");
    println!("cargo:rerun-if-changed=../yarn.lock");
    #[cfg(target_os = "windows")]
    let pkg_manager = "yarn.cmd";
    #[cfg(not(target_os = "windows"))]
    let pkg_manager = "yarn";
    let profile = std::env::var("PROFILE").unwrap();
    Command::new(pkg_manager)
        .args(["node", "./build/prebuild.cjs"])
        .current_dir(env::current_dir().unwrap().join(".."))
        .env(
            "NODE_ENV",
            match profile.as_str() {
                "debug" => "development",
                _ => "production",
            },
        )
        .output()
        .unwrap();
    tauri_build::build()
}
