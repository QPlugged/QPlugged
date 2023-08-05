use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let window = app.get_window("main").unwrap();
            #[cfg(target_os = "windows")]
            {
                window.minimize().unwrap();
                window.unminimize().unwrap();

                window.maximize().unwrap();
                window.unmaximize().unwrap();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
