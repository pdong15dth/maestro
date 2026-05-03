use std::sync::Arc;

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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
