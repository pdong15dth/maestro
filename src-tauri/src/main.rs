use std::sync::Arc;
use tauri::{Manager, Emitter};

mod pty;

#[tauri::command]
async fn spawn_agent(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<pty::PtyManager>>,
    command: String,
    args: Vec<String>,
    cwd: String,
) -> Result<(), String> {
    state.spawn(app, command, args, cwd)
}

#[tauri::command]
fn send_stdin(
    state: tauri::State<'_, Arc<pty::PtyManager>>,
    input: String,
) -> Result<(), String> {
    state.send_stdin(input)
}

#[tauri::command]
fn kill_agent(state: tauri::State<'_, Arc<pty::PtyManager>>) -> Result<(), String> {
    state.kill()
}

#[tauri::command]
async fn check_cli(path: String) -> Result<bool, String> {
    let output = tokio::process::Command::new(&path)
        .arg("--version")
        .output()
        .await
        .map_err(|e| e.to_string())?;
    Ok(output.status.success())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(Arc::new(pty::PtyManager::new()))
        .invoke_handler(tauri::generate_handler![
            spawn_agent,
            send_stdin,
            kill_agent,
            check_cli
        ])
        .setup(|app| {
            let splashscreen = app.get_webview_window("splashscreen").unwrap();
            let main = app.get_webview_window("main").unwrap();

            tauri::async_runtime::spawn(async move {
                // Wait for splash screen animation to complete
                std::thread::sleep(std::time::Duration::from_millis(2800));

                // Emit fade-out event to splashscreen
                let _ = splashscreen.emit("close-splash", ());
                std::thread::sleep(std::time::Duration::from_millis(400));

                // Show main window and close splashscreen
                let _ = main.show();
                let _ = splashscreen.close();
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
