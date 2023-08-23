use std::env;

#[cfg(target_os = "windows")]
use tauri::{window::Effect, window::EffectsBuilder};
use tauri::{WindowBuilder, WindowUrl};

#[tauri::command]
fn get_server_url() -> String {
    return env::var("QP_CLIENT_URL").unwrap_or("".to_owned());
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![get_server_url])
        .setup(|app| {
            let mut window_builder = WindowBuilder::new(app, "main", WindowUrl::default());
            #[cfg(desktop)]
            {
                window_builder = window_builder
                    .decorations(false)
                    .title("QPlugged")
                    .inner_size(1., 1.);
            }

            #[cfg(target_os = "windows")]
            {
                window_builder = window_builder
                    .transparent(true)
                    .effects(EffectsBuilder::new().effect(Effect::Mica).build());
            }

            #[cfg(target_os = "macos")]
            {
                window_builder = window_builder.transparent(true);
            }

            let window = window_builder.build().unwrap();

            #[cfg(debug_assertions)]
            window.open_devtools();

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
