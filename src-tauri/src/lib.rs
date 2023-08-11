use std::sync::Mutex;

use launcher::{initialize_nt, launch_nt, NTState};
use tauri::{generate_context, Builder, Manager};

mod launcher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    Builder::default()
        .manage(NTState(Mutex::new(false)))
        .invoke_handler(tauri::generate_handler![initialize_nt, launch_nt])
        .plugin(tauri_plugin_window::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let window = app.get_window("main").unwrap();
            #[cfg(desktop)]
            {
                window
                    .set_size(tauri::LogicalSize {
                        width: 0.0,
                        height: 0.0,
                    })
                    .unwrap();
                window
                    .set_size(tauri::LogicalSize {
                        width: 800.0,
                        height: 600.0,
                    })
                    .unwrap();
                window.set_decorations(true).unwrap();
            }
            Ok(())
        })
        .run(generate_context!())
        .expect("error while running tauri application");
}
