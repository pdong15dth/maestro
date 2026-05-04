use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use serde::{Deserialize, Serialize};
use serde_json::Value;

fn resolve_kimi_path() -> String {
    #[cfg(target_os = "windows")]
    let which_cmd = "where";
    #[cfg(not(target_os = "windows"))]
    let which_cmd = "which";

    // Try PATH first
    if let Ok(output) = std::process::Command::new(which_cmd).arg("kimi").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout)
                .lines()
                .next()
                .unwrap_or("")
                .trim()
                .to_string();
            if !path.is_empty() {
                return path;
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(home) = std::env::var("USERPROFILE") {
            let candidates = [
                format!(r"{}\AppData\Roaming\npm\kimi.cmd", home),
                format!(r"{}\AppData\Roaming\npm\kimi.exe", home),
                format!(r"{}\.kimi\bin\kimi.exe", home),
                format!(r"{}\kimi\bin\kimi.exe", home),
                r"C:\Program Files\kimi\bin\kimi.exe".to_string(),
                r"C:\Program Files (x86)\kimi\bin\kimi.exe".to_string(),
            ];
            for c in &candidates {
                if std::path::Path::new(c).exists() {
                    return c.clone();
                }
            }
        }
        if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
            let candidates = [
                format!(r"{}\Programs\kimi\kimi.exe", local_appdata),
                format!(r"{}\kimi\kimi.exe", local_appdata),
            ];
            for c in &candidates {
                if std::path::Path::new(c).exists() {
                    return c.clone();
                }
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let home = std::env::var("HOME").unwrap_or_default();
        let candidates = [
            format!("{}/.local/bin/kimi", home),
            "/usr/local/bin/kimi".to_string(),
            "/opt/homebrew/bin/kimi".to_string(),
            "/usr/bin/kimi".to_string(),
        ];
        for c in &candidates {
            if std::path::Path::new(c).exists() {
                return c.clone();
            }
        }
    }

    "kimi".to_string()
}

// ---------------------------------------------------------------------------
// Public payloads emitted to the frontend via Tauri events
// ---------------------------------------------------------------------------

#[derive(Clone, Serialize)]
pub struct WireEventPayload {
    pub session_id: String,
    pub event_type: String,
    pub payload: Value,
}

#[derive(Clone, Serialize)]
pub struct WireRequestPayload {
    pub session_id: String,
    pub request_id: String,
    pub request_type: String,
    pub payload: Value,
}

#[derive(Clone, Serialize)]
pub struct WireResponsePayload {
    pub session_id: String,
    pub id: String,
    pub result: Option<Value>,
    pub error: Option<Value>,
}

#[derive(Clone, Serialize)]
pub struct WireReadyPayload {
    pub session_id: String,
}

#[derive(Clone, Serialize)]
pub struct WireStderrPayload {
    pub session_id: String,
    pub chunk: String,
}

// ---------------------------------------------------------------------------
// JSON-RPC types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Deserialize, Serialize)]
struct JsonRpcMessage {
    jsonrpc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    method: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    params: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<Value>,
}

// ---------------------------------------------------------------------------
// Session & Manager
// ---------------------------------------------------------------------------

pub struct KimiWireSession {
    pub child: Arc<Mutex<Child>>,
    pub writer: Arc<Mutex<ChildStdin>>,
    pub session_id: String,
    pub initialized: bool,
}

pub struct KimiWireManager {
    sessions: Arc<Mutex<HashMap<String, KimiWireSession>>>,
}

impl KimiWireManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn init(
        &self,
        app: AppHandle,
        session_id: String,
        cwd: String,
    ) -> Result<(), String> {
        // Kill existing session with same ID if any
        let _ = self.kill(&session_id);

        let kimi_path = resolve_kimi_path();
        eprintln!("[kimi-wire] resolved kimi path: {}", &kimi_path);

        let mut cmd = std::process::Command::new(&kimi_path);
        cmd.arg("--wire");
        cmd.arg("-w");
        cmd.arg(&cwd);
        cmd.stdin(Stdio::piped());
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        let mut child = cmd.spawn().map_err(|e| e.to_string())?;
        let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
        let stdin = child.stdin.take().ok_or("Failed to capture stdin")?;
        let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

        let writer_arc = Arc::new(Mutex::new(stdin));

        // --- stdout read loop ---
        let sid_clone = session_id.clone();
        let app_stdout = app.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line_result in reader.lines() {
                match line_result {
                    Ok(line) => {
                        if line.trim().is_empty() {
                            continue;
                        }
                        eprintln!("[kimi-wire stdout] {}", &line);
                        handle_stdout_line(&app_stdout, &sid_clone, &line);
                    }
                    Err(_) => break,
                }
            }
            eprintln!("[kimi-wire stdout] EOF");
        });

        // --- stderr read loop ---
        let sid_err = session_id.clone();
        let app_stderr = app.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line_result in reader.lines() {
                match line_result {
                    Ok(line) => {
                        if line.trim().is_empty() {
                            continue;
                        }
                        eprintln!("[kimi-wire stderr] {}", &line);
                        let _ = app_stderr.emit("kimi-wire-stderr", WireStderrPayload {
                            session_id: sid_err.clone(),
                            chunk: line.clone(),
                        });
                        // Also forward stderr as raw events so the frontend can show them
                        let _ = app_stderr.emit("kimi-wire-event", WireEventPayload {
                            session_id: sid_err.clone(),
                            event_type: "raw".to_string(),
                            payload: Value::String(line),
                        });
                    }
                    Err(_) => break,
                }
            }
        });

        let child_arc = Arc::new(Mutex::new(child));

        // --- child wait thread (prevents zombies) ---
        let child_wait = Arc::clone(&child_arc);
        std::thread::spawn(move || {
            let _ = child_wait.lock().unwrap().wait();
            eprintln!("[kimi-wire] child exited");
        });

        // Send initialize request
        let init_msg = JsonRpcMessage {
            jsonrpc: "2.0".to_string(),
            id: Some(Value::String("init".to_string())),
            method: Some("initialize".to_string()),
            params: Some(serde_json::json!({
                "protocol_version": "1",
                "client": {
                    "name": "maestro",
                    "version": "0.1.0"
                },
                "capabilities": {
                    "supports_question": true
                }
            })),
            result: None,
            error: None,
        };

        let init_json = serde_json::to_string(&init_msg).unwrap();
        {
            let mut w = writer_arc.lock().map_err(|e| e.to_string())?;
            writeln!(w, "{}", init_json).map_err(|e| e.to_string())?;
            w.flush().map_err(|e| e.to_string())?;
        }

        let mut sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        sessions.insert(session_id.clone(), KimiWireSession {
            child: child_arc,
            writer: writer_arc,
            session_id: session_id.clone(),
            initialized: false,
        });

        Ok(())
    }

    pub fn send_prompt(
        &self,
        session_id: String,
        input: String,
    ) -> Result<(), String> {
        let sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        let session = sessions
            .get(&session_id)
            .ok_or("No active Kimi Wire session")?;

        let msg = JsonRpcMessage {
            jsonrpc: "2.0".to_string(),
            id: Some(Value::String("prompt".to_string())),
            method: Some("prompt".to_string()),
            params: Some(serde_json::json!({
                "user_input": input
            })),
            result: None,
            error: None,
        };

        let json = serde_json::to_string(&msg).unwrap();
        let mut w = session.writer.lock().map_err(|e| e.to_string())?;
        writeln!(w, "{}", json).map_err(|e| e.to_string())?;
        w.flush().map_err(|e| e.to_string())?;

        Ok(())
    }

    pub fn respond(
        &self,
        session_id: String,
        request_id: String,
        payload: Value,
    ) -> Result<(), String> {
        let sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        let session = sessions
            .get(&session_id)
            .ok_or("No active Kimi Wire session")?;

        let msg = JsonRpcMessage {
            jsonrpc: "2.0".to_string(),
            id: Some(Value::String(request_id)),
            method: None,
            params: None,
            result: Some(payload),
            error: None,
        };

        let json = serde_json::to_string(&msg).unwrap();
        let mut w = session.writer.lock().map_err(|e| e.to_string())?;
        writeln!(w, "{}", json).map_err(|e| e.to_string())?;
        w.flush().map_err(|e| e.to_string())?;

        Ok(())
    }

    pub fn kill(&self, session_id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        if let Some(session) = sessions.remove(session_id) {
            let _ = session.child.lock().map_err(|e| e.to_string())?.kill();
            // Also close stdin to signal EOF
            drop(session.writer);
        }
        Ok(())
    }

    pub fn kill_all(&self) -> Result<(), String> {
        let mut sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        for (_, session) in sessions.drain() {
            let _ = session.child.lock().map_err(|e| e.to_string())?.kill();
            drop(session.writer);
        }
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// stdout line handling
// ---------------------------------------------------------------------------

fn strip_ansi_sequences(input: &str) -> String {
    // Strip ANSI escape sequences (CSI \x1b[... and OSC \x1b]...\x07)
    let mut output = String::with_capacity(input.len());
    let mut chars = input.chars();
    while let Some(ch) = chars.next() {
        if ch == '\x1b' {
            match chars.next() {
                Some('[') => {
                    // CSI sequence: skip until letter or @`~{|}
                    while let Some(c) = chars.next() {
                        if c.is_ascii_alphabetic() || matches!(c, '@' | '`' | '{' | '|' | '}' | '~') {
                            break;
                        }
                    }
                }
                Some(']') => {
                    // OSC sequence: skip until BEL (\x07) or ESC \
                    while let Some(c) = chars.next() {
                        if c == '\x07' {
                            break;
                        }
                        if c == '\x1b' {
                            if let Some('\\') = chars.next() {
                                break;
                            }
                        }
                    }
                }
                _ => {}
            }
        } else {
            output.push(ch);
        }
    }
    output
}

fn handle_stdout_line(app: &AppHandle, session_id: &str, line: &str) {
    let cleaned = strip_ansi_sequences(line);
    eprintln!("[kimi-wire] handle_stdout_line called, cleaned={}", &cleaned);
    let parse_result: Result<JsonRpcMessage, _> = serde_json::from_str(&cleaned);
    let msg = match parse_result {
        Ok(m) => {
            eprintln!("[kimi-wire] parsed ok, method={:?} id={:?}", m.method, m.id);
            m
        }
        Err(e) => {
            eprintln!("[kimi-wire] parse error: {:?}", e);
            // Not JSON-RPC — might be a plain line like "To resume this session..."
            // Emit as a generic event so frontend can filter if needed.
            let _ = app.emit("kimi-wire-event", WireEventPayload {
                session_id: session_id.to_string(),
                event_type: "raw".to_string(),
                payload: Value::String(line.to_string()),
            });
            return;
        }
    };

    // Response (has id, no method)
    if msg.method.is_none() && msg.id.is_some() {
        let id = match &msg.id {
            Some(Value::String(s)) => s.clone(),
            Some(v) => v.to_string(),
            None => return,
        };

        // Internal: initialize response
        if id == "init" {
            eprintln!("[kimi-wire] emitting kimi-wire-ready for session {}", session_id);
            let payload = WireReadyPayload {
                session_id: session_id.to_string(),
            };
            if let Err(e) = app.emit("kimi-wire-ready", &payload) {
                eprintln!("[kimi-wire] emit error: {:?}", e);
            } else {
                eprintln!("[kimi-wire] emit succeeded");
            }
            return;
        }

        let _ = app.emit("kimi-wire-response", WireResponsePayload {
            session_id: session_id.to_string(),
            id,
            result: msg.result,
            error: msg.error,
        });
        return;
    }

    // Event notification (has method "event", no id)
    if msg.method.as_deref() == Some("event") {
        if let Some(params) = msg.params {
            if let Some(event_type) = params.get("type").and_then(|v| v.as_str()) {
                let payload = params.get("payload").cloned().unwrap_or(Value::Null);
                let _ = app.emit("kimi-wire-event", WireEventPayload {
                    session_id: session_id.to_string(),
                    event_type: event_type.to_string(),
                    payload,
                });
            } else {
                // fallback: params without a recognized type string
                let _ = app.emit("kimi-wire-event", WireEventPayload {
                    session_id: session_id.to_string(),
                    event_type: "raw".to_string(),
                    payload: params,
                });
            }
        }
        return;
    }

    // Request from server (has method "request", has id)
    if msg.method.as_deref() == Some("request") {
        if let Some(params) = msg.params {
            if let Some(request_type) = params.get("type").and_then(|v| v.as_str()) {
                let id = match &msg.id {
                    Some(Value::String(s)) => s.clone(),
                    Some(v) => v.to_string(),
                    None => return,
                };
                let _ = app.emit("kimi-wire-request", WireRequestPayload {
                    session_id: session_id.to_string(),
                    request_id: id,
                    request_type: request_type.to_string(),
                    payload: params.get("payload").cloned().unwrap_or(Value::Null),
                });
            }
        }
        return;
    }
}
