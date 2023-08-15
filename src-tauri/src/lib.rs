#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let window = tauri::Manager::get_window(app, "main").ok_or("cannot get main window")?;
            #[cfg(desktop)]
            {
                window.set_size(tauri::LogicalSize {
                    width: 0.0,
                    height: 0.0,
                })?;
                window.set_size(tauri::LogicalSize {
                    width: 800.0,
                    height: 600.0,
                })?;
                window.set_decorations(true).unwrap();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
