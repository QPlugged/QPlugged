use async_recursion::async_recursion;
use std::{
    ffi::c_void,
    fs, io,
    path::{self, PathBuf},
    process,
    sync::Mutex,
};
use tauri::Manager;
use tokio::task;
use windows::{
    w,
    Win32::{
        Foundation::{NO_ERROR, WIN32_ERROR},
        System::Registry::{
            RegGetValueW, HKEY_LOCAL_MACHINE, RRF_RT_REG_SZ, RRF_SUBKEY_WOW6432KEY,
        },
    },
};

#[async_recursion]
async fn copy_dir_all(from: PathBuf, to: PathBuf) -> io::Result<()> {
    fs::create_dir_all(&to)?;
    for entry in fs::read_dir(from)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            copy_dir_all(entry.path(), to.join(entry.file_name())).await?;
        } else {
            tokio::fs::copy(entry.path(), to.join(entry.file_name())).await?;
        }
    }
    Ok(())
}

struct NtJsData(String, String);

async fn patch_nt(js_path: impl AsRef<path::Path>) -> io::Result<NtJsData> {
    let original_js = tokio::fs::read_to_string(&js_path).await?;
    let server_js = include_str!("../../dist/qplugged-server.js");
    let patched_js = format!("{server_js}{original_js}");
    let js_data: NtJsData = NtJsData(original_js, patched_js);
    Ok(js_data)
}

async fn copy_nt_dir(from: PathBuf, to: PathBuf) -> io::Result<()> {
    if tokio::fs::try_exists(to.clone()).await? {
        tokio::fs::remove_dir_all(to.clone()).await?;
    }

    copy_dir_all(from, to).await?;
    Ok(())
}

fn get_nt_dir() -> Result<PathBuf, WIN32_ERROR> {
    let mut value: Vec<u16> = vec![0; 1024];

    let mut my_size = (std::mem::size_of::<u16>() * value.len()) as u32;
    let size = &mut my_size as *mut u32;

    let result = unsafe {
        RegGetValueW(
            HKEY_LOCAL_MACHINE,
            w!("SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\QQ"),
            w!("UninstallString"),
            RRF_SUBKEY_WOW6432KEY | RRF_RT_REG_SZ,
            Some(std::ptr::null_mut()),
            Some(value.as_mut_ptr() as *mut c_void),
            Some(size),
        )
    };

    if result != NO_ERROR {
        return Err(result);
    }

    Ok(PathBuf::new()
        .join(String::from_utf16(&value).or(Err(NO_ERROR))?)
        .parent()
        .ok_or(NO_ERROR)?
        .to_path_buf())
}

pub struct NTState(pub Mutex<bool>);

#[tauri::command]
pub fn initialize_nt(state: tauri::State<'_, NTState>) -> Result<bool, &'static str> {
    let mut state = state.0.lock().or(Err("cannot get current state"))?;
    let old_state = *state;
    *state = true;
    return Ok(old_state);
}

#[tauri::command]
pub async fn launch_nt(app_handle: tauri::AppHandle) -> Result<u16, &'static str> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .or(Err("cannot get tauri's app_data_dir"))?;
    let nt_dir = get_nt_dir().or(Err("cannot get NT dir"))?;
    let copied_nt_dir = app_data_dir.join("NT Core");
    let copied_nt_executable = copied_nt_dir.join("QQ.exe");
    let version_json_file = nt_dir
        .join("resources")
        .join("app")
        .join("versions")
        .join("config.json");
    let version_json_data = tokio::fs::read_to_string(version_json_file.clone())
        .await
        .or(Err("cannot read version info file"))?;
    let stored_version_json_path = app_data_dir.join("nt-config.json");
    let stored_version_json_data = tokio::fs::read_to_string(stored_version_json_path.clone())
        .await
        .unwrap_or(String::new());
    if version_json_data != stored_version_json_data {
        copy_nt_dir(nt_dir.clone(), copied_nt_dir.clone())
            .await
            .or(Err("failed to copy NT dir"))?;
        tokio::fs::copy(version_json_file, stored_version_json_path)
            .await
            .or(Err("failed to copy version info file"))?;
    }

    let js_path = copied_nt_dir
        .join("resources")
        .join("app")
        .join("app_launcher")
        .join("index.js");
    let js_data = patch_nt(&js_path).await.or(Err("cannot read js data"))?;
    let original_js = js_data.0;
    let patched_js = js_data.1;

    let mut child = process::Command::new(copied_nt_executable)
        .stdout(process::Stdio::piped())
        .stderr(process::Stdio::inherit())
        .spawn()
        .or(Err("cannot spawn NT process"))?;
    let stdout = child.stdout.take().ok_or("cannot get NT stdout")?;

    Ok(task::spawn_blocking(move || -> Result<u16, &'static str> {
        const PORT_START_FLAG: &str = "[QPLUGGED_INIT_PORT]";
        const PORT_END_FLAG: &str = "[/]";
        let mut is_code_injected = false;
        let mut f = io::BufReader::new(stdout);
        loop {
            let mut buf = String::new();
            io::BufRead::read_line(&mut f, &mut buf).or(Err("cannot read stdout"))?;
            print!("{buf}");
            if buf.contains("[preload]") && !is_code_injected {
                io::Write::write_all(
                    &mut fs::File::create(js_path.clone()).unwrap(),
                    patched_js.as_bytes(),
                )
                .or(Err("failed to write patched js data"))?;
                is_code_injected = true;
            } else if buf.contains(PORT_START_FLAG)
                && buf.contains(PORT_END_FLAG)
                && is_code_injected
            {
                io::Write::write_all(
                    &mut fs::File::create(js_path.clone()).unwrap(),
                    original_js.as_bytes(),
                )
                .or(Err("failed to write original js data back"))?;
                let s = buf.find(PORT_START_FLAG).unwrap_or(0) + PORT_START_FLAG.len();
                let e = buf.find(PORT_END_FLAG).unwrap_or(0);
                let port = &buf[s..e];
                let port: u16 = port.to_string().parse().or(Err("unexpected port type"))?;
                return Ok(port);
            }
        }
    })
    .await
    .or_else(|_| {
        child.kill().ok();
        return Err("failed to spawn stdout reading thread");
    })??)
}
