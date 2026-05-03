use portable_pty::{Child, CommandBuilder, NativePtySystem, PtySize, PtySystem};
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;

pub struct PtySession {
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    child: Box<dyn Child + Send + Sync>,
}

pub struct PtyManager {
    session: Arc<Mutex<Option<PtySession>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            session: Arc::new(Mutex::new(None)),
        }
    }

    pub fn spawn(
        &self,
        app: AppHandle,
        command: String,
        args: Vec<String>,
        cwd: String,
    ) -> Result<(), String> {
        // Kill any existing session first
        let _ = self.kill();

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

        // Spawn a dedicated thread to read from the PTY master.
        // This avoids blocking the async runtime.
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
        tokio::spawn(async move {
            while let Some(chunk) = rx.recv().await {
                let _ = app_clone.emit("agent-output", chunk);
            }
            // Emit an EOF marker so the UI knows the stream ended
            let _ = app_clone.emit("agent-output", "\n[Process exited]\n");
        });

        let mut session = self
            .session
            .lock()
            .map_err(|e| e.to_string())?;
        *session = Some(PtySession {
            writer: Arc::new(Mutex::new(writer)),
            child,
        });

        Ok(())
    }

    pub fn send_stdin(&self, input: String) -> Result<(), String> {
        let session = self
            .session
            .lock()
            .map_err(|e| e.to_string())?;
        if let Some(session) = session.as_ref() {
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

    pub fn kill(&self) -> Result<(), String> {
        let mut session = self
            .session
            .lock()
            .map_err(|e| e.to_string())?;
        if let Some(mut session) = session.take() {
            let _ = session.child.kill();
        }
        Ok(())
    }
}
