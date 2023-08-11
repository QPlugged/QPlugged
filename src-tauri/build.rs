use std::{env, process::Command};

fn main() {
    #[cfg(target_os = "windows")]
    let pkg_manager = "yarn.cmd";
    #[cfg(not(target_os = "windows"))]
    let pkg_manager = "yarn";
    let profile = std::env::var("PROFILE").unwrap();
    Command::new(pkg_manager)
        .args([
            "exec",
            &format!(
                "NODE_ENV=
        {} node ./build/prebuild.cjs",
                match profile.as_str() {
                    "debug" => "development",
                    _ => "production",
                }
            ),
        ])
        .current_dir(env::current_dir().unwrap().join(".."))
        .output()
        .unwrap();
    tauri_build::build()
}
