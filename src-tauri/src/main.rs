use std::sync::Arc;
use tauri::{Manager, Emitter};
use serde::Serialize;

mod pty;

#[derive(Serialize)]
struct CommandOutput {
    stdout: String,
    stderr: String,
    exit_code: i32,
}

#[derive(Serialize)]
struct Problem {
    file: String,
    line: u32,
    message: String,
    severity: String,
}

#[tauri::command]
async fn spawn_agent(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<pty::PtyManager>>,
    session_id: String,
    command: String,
    args: Vec<String>,
    cwd: String,
) -> Result<(), String> {
    state.spawn(app, session_id, command, args, cwd)
}

#[tauri::command]
fn send_stdin(
    state: tauri::State<'_, Arc<pty::PtyManager>>,
    session_id: String,
    input: String,
) -> Result<(), String> {
    state.send_stdin(session_id, input)
}

#[tauri::command]
fn kill_agent(
    state: tauri::State<'_, Arc<pty::PtyManager>>,
    session_id: String,
) -> Result<(), String> {
    state.kill(&session_id)
}

#[tauri::command]
fn kill_all_agents(
    state: tauri::State<'_, Arc<pty::PtyManager>>,
) -> Result<(), String> {
    state.kill_all()
}

#[tauri::command]
fn list_sessions(
    state: tauri::State<'_, Arc<pty::PtyManager>>,
) -> Result<Vec<String>, String> {
    state.list_sessions()
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

#[tauri::command]
async fn exec_command(
    path: String,
    args: Vec<String>,
    cwd: String,
) -> Result<CommandOutput, String> {
    let output = tokio::process::Command::new(&path)
        .args(&args)
        .current_dir(&cwd)
        .output()
        .await
        .map_err(|e| e.to_string())?;

    Ok(CommandOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}

#[tauri::command]
async fn git_branch(cwd: String) -> Result<String, String> {
    let output = tokio::process::Command::new("git")
        .args(["branch", "--show-current"])
        .current_dir(&cwd)
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
async fn spawn_shell(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<pty::PtyManager>>,
    session_id: String,
    cwd: String,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    let shell = "cmd";
    #[cfg(not(target_os = "windows"))]
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "bash".to_string());

    state.spawn(app, session_id, shell.to_string(), vec![], cwd)
}

#[tauri::command]
async fn get_language_for_file(path: String) -> Result<String, String> {
    let ext = std::path::Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let lang = match ext.as_str() {
        "rs" => "Rust",
        "js" | "jsx" | "mjs" | "cjs" => "JavaScript",
        "ts" | "tsx" => "TypeScript",
        "py" | "pyi" | "pyw" => "Python",
        "go" => "Go",
        "java" => "Java",
        "kt" | "kts" => "Kotlin",
        "cpp" | "cxx" | "cc" | "hpp" => "C++",
        "c" | "h" => "C",
        "cs" => "C#",
        "rb" => "Ruby",
        "php" => "PHP",
        "swift" => "Swift",
        "md" | "mdx" => "Markdown",
        "json" => "JSON",
        "yaml" | "yml" => "YAML",
        "toml" => "TOML",
        "html" | "htm" => "HTML",
        "css" | "scss" | "sass" | "less" => "CSS",
        "sql" => "SQL",
        "sh" | "bash" | "zsh" | "fish" => "Shell",
        "ps1" => "PowerShell",
        "dockerfile" => "Dockerfile",
        "vue" => "Vue",
        "dart" => "Dart",
        "r" => "R",
        "lua" => "Lua",
        _ => "Plain Text",
    };

    Ok(lang.to_string())
}

#[tauri::command]
async fn check_problems(cwd: String) -> Result<Vec<Problem>, String> {
    let mut problems = Vec::new();
    let cargo_toml = std::path::Path::new(&cwd).join("Cargo.toml");
    let package_json = std::path::Path::new(&cwd).join("package.json");

    if cargo_toml.exists() {
        let output = tokio::process::Command::new("cargo")
            .args(["check", "--message-format=short"])
            .current_dir(&cwd)
            .output()
            .await
            .map_err(|e| e.to_string())?;

        let text = String::from_utf8_lossy(&output.stderr);
        for line in text.lines() {
            // Parse: error: message
            //        --> file:line:col
            if line.starts_with("error") {
                // Simple parsing for cargo short format
                // Example: error: expected `;`, found `let`
                //   --> src/main.rs:42:5
                // We will do a best-effort parse
            }
        }
        // Best-effort regex-like parse
        let stderr = String::from_utf8_lossy(&output.stderr);
        let lines: Vec<&str> = stderr.lines().collect();
        let mut i = 0;
        while i < lines.len() {
            let line = lines[i];
            if line.starts_with("error[") || line.starts_with("error:") {
                let msg = if line.starts_with("error[") {
                    line.splitn(2, ']').nth(1).unwrap_or("").trim_start_matches(':').trim()
                } else {
                    line.strip_prefix("error:").unwrap_or("").trim()
                };
                if i + 1 < lines.len() {
                    let next = lines[i + 1];
                    if next.contains("-->") {
                        let parts: Vec<&str> = next.split_whitespace().collect();
                        if let Some(loc) = parts.last() {
                            let loc_parts: Vec<&str> = loc.split(':').collect();
                            if loc_parts.len() >= 2 {
                                let file = loc_parts[0].to_string();
                                let line_num = loc_parts[1].parse::<u32>().unwrap_or(0);
                                problems.push(Problem {
                                    file,
                                    line: line_num,
                                    message: msg.to_string(),
                                    severity: "error".to_string(),
                                });
                            }
                        }
                        i += 1;
                    }
                }
            }
            i += 1;
        }
    } else if package_json.exists() {
        // Try eslint
        let output = tokio::process::Command::new("npx")
            .args(["eslint", ".", "--format", "compact"])
            .current_dir(&cwd)
            .output()
            .await
            .map_err(|e| e.to_string())?;

        let text = String::from_utf8_lossy(&output.stdout);
        for line in text.lines() {
            // Format: /path/to/file.js: line 1, col 5, Error - message
            if let Some(pos) = line.find(':') {
                let file = line[..pos].to_string();
                let rest = &line[pos + 1..];
                if let Some(line_start) = rest.find("line ") {
                    let after_line = &rest[line_start + 5..];
                    if let Some(comma_pos) = after_line.find(',') {
                        let line_num = after_line[..comma_pos].trim().parse::<u32>().unwrap_or(0);
                        let sev = if rest.contains("Error") { "error" } else { "warning" };
                        let msg = rest.to_string();
                        problems.push(Problem {
                            file,
                            line: line_num,
                            message: msg,
                            severity: sev.to_string(),
                        });
                    }
                }
            }
        }
    }

    Ok(problems)
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
            kill_all_agents,
            list_sessions,
            check_cli,
            exec_command,
            git_branch,
            spawn_shell,
            get_language_for_file,
            check_problems
        ])
        .setup(|app| {
            let splashscreen = app.get_webview_window("splashscreen").unwrap();
            let main = app.get_webview_window("main").unwrap();

            tauri::async_runtime::spawn(async move {
                std::thread::sleep(std::time::Duration::from_millis(2800));
                let _ = splashscreen.emit("close-splash", ());
                std::thread::sleep(std::time::Duration::from_millis(400));
                let _ = main.show();
                let _ = splashscreen.close();
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
