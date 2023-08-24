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
            const DEFAULT_WIDTH: f64 = 800.;
            const DEFAULT_HEIGHT: f64 = 600.;
            let mut window_builder = WindowBuilder::new(app, "main", WindowUrl::default());
            #[cfg(desktop)]
            {
                window_builder = window_builder.title("QPlugged");
            }

            #[cfg(target_os = "windows")]
            {
                window_builder = window_builder
                    .transparent(true)
                    .decorations(false)
                    .effects(EffectsBuilder::new().effect(Effect::Mica).build())
                    .inner_size(1., 1.);
            }

            #[cfg(not(target_os = "windows"))]
            {
                window_builder = window_builder.inner_size(DEFAULT_WIDTH, DEFAULT_HEIGHT);
            }

            #[cfg(target_os = "macos")]
            {
                window_builder = window_builder.transparent(true);
            }

            let window = window_builder.build()?;

            #[cfg(debug_assertions)]
            window.open_devtools();

            #[cfg(target_os = "windows")]
            {
                window.set_size(tauri::LogicalSize {
                    width: 0.,
                    height: 0.,
                })?;
                window.set_decorations(true)?;
            }

            window.set_size(tauri::LogicalSize {
                width: DEFAULT_WIDTH,
                height: DEFAULT_HEIGHT,
            })?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
