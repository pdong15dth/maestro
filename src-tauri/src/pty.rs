use portable_pty::{Child, CommandBuilder, NativePtySystem, PtySize, PtySystem};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;
use serde::Serialize;

#[derive(Clone, Serialize)]
pub struct OutputPayload {
    pub session_id: String,
    pub chunk: String,
}

#[derive(Clone, Serialize)]
pub struct SessionExitedPayload {
    pub session_id: String,
}

pub struct PtySession {
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    child: Box<dyn Child + Send + Sync>,
}

pub struct PtyManager {
    sessions: Arc<Mutex<HashMap<String, PtySession>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn spawn(
        &self,
        app: AppHandle,
        session_id: String,
        command: String,
        args: Vec<String>,
        cwd: String,
    ) -> Result<(), String> {
        // Kill existing session with same ID if any
        let _ = self.kill(&session_id);

        let pty_system = NativePtySystem::default();
        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;

        let mut cmd = CommandBuilder::new(&command);
        cmd.args(args);
        cmd.cwd(cwd);

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| e.to_string())?;

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| e.to_string())?;
        let writer = pair
            .master
            .take_writer()
            .map_err(|e| e.to_string())?;

        let (tx, mut rx) = mpsc::channel::<String>(256);
        let sid = session_id.clone();

        // Spawn a dedicated thread to read from the PTY master.
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let text = String::from_utf8_lossy(&buf[..n]).to_string();
                        if tx.blocking_send(text).is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
        });

        // Forward chunks to the frontend via Tauri events
        let app_clone = app.clone();
        let sid_clone = sid.clone();
        tokio::spawn(async move {
            while let Some(chunk) = rx.recv().await {
                let _ = app_clone.emit("agent-output", OutputPayload {
                    session_id: sid_clone.clone(),
                    chunk,
                });
            }
            // Emit exit event and EOF marker
            let _ = app_clone.emit("session-exited", SessionExitedPayload {
                session_id: sid_clone.clone(),
            });
            let _ = app_clone.emit("agent-output", OutputPayload {
                session_id: sid_clone,
                chunk: "\n[Process exited]\n".to_string(),
            });
        });

        let mut sessions = self
            .sessions
            .lock()
            .map_err(|e| e.to_string())?;
        sessions.insert(session_id, PtySession {
            writer: Arc::new(Mutex::new(writer)),
            child,
        });

        Ok(())
    }

    pub fn send_stdin(&self, session_id: String, input: String) -> Result<(), String> {
        let sessions = self
            .sessions
            .lock()
            .map_err(|e| e.to_string())?;
        if let Some(session) = sessions.get(&session_id) {
            let mut writer = session
                .writer
                .lock()
                .map_err(|e| e.to_string())?;
            writer
                .write_all(input.as_bytes())
                .map_err(|e| e.to_string())?;
            writer
                .write_all(b"\r")
                .map_err(|e| e.to_string())?;
            writer.flush().map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("No active agent process.".to_string())
        }
    }

    pub fn kill(&self, session_id: &str) -> Result<(), String> {
        let mut sessions = self
            .sessions
            .lock()
            .map_err(|e| e.to_string())?;
        if let Some(mut session) = sessions.remove(session_id) {
            let _ = session.child.kill();
        }
        Ok(())
    }

    pub fn kill_all(&self) -> Result<(), String> {
        let mut sessions = self
            .sessions
            .lock()
            .map_err(|e| e.to_string())?;
        for (_, mut session) in sessions.drain() {
            let _ = session.child.kill();
        }
        Ok(())
    }

    pub fn list_sessions(&self) -> Result<Vec<String>, String> {
        let sessions = self
            .sessions
            .lock()
            .map_err(|e| e.to_string())?;
        Ok(sessions.keys().cloned().collect())
    }
}
