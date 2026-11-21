// G-vis som program: samma sidor som på webben, lokalt och utan internet.
// Dubbelklick på en .gvis-fil öppnar G-vis direkt med filen, och Spara skriver tillbaka till samma fil.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

/// Filen som ska öppnas i G-vis, tills sidan hämtar den.
struct Pending(Mutex<Option<PathBuf>>);

#[derive(serde::Serialize)]
struct OpenFile {
    path: String,
    name: String,
    text: String,
}

fn is_gvis(p: &Path) -> bool {
    p.extension().map(|e| e.eq_ignore_ascii_case("gvis")).unwrap_or(false)
}

/// Hittar en .gvis-fil bland argumenten som Windows, Linux eller en andra start skickar med.
fn gvis_arg(args: &[String], cwd: Option<&str>) -> Option<PathBuf> {
    args.iter()
        .map(PathBuf::from)
        .filter(|p| is_gvis(p))
        .map(|p| match cwd {
            Some(c) if p.is_relative() => Path::new(c).join(p),
            _ => p,
        })
        .find(|p| p.is_file())
}

fn read(p: &Path) -> Result<OpenFile, String> {
    let bytes = std::fs::read(p).map_err(|e| e.to_string())?;
    Ok(OpenFile {
        path: p.to_string_lossy().into_owned(),
        name: p
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default(),
        text: String::from_utf8_lossy(&bytes).into_owned(),
    })
}

/// Lägger filen i kön, tar fram fönstret och säger till sidan att en fil väntar.
fn open_path(app: &AppHandle, p: PathBuf) {
    *app.state::<Pending>().0.lock().unwrap() = Some(p);
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
    let _ = app.emit("gvis-open", ());
}

#[tauri::command]
fn gvis_has_pending(state: tauri::State<Pending>) -> bool {
    state.0.lock().unwrap().is_some()
}

#[tauri::command]
fn gvis_take_pending(state: tauri::State<Pending>) -> Result<Option<OpenFile>, String> {
    let p = state.0.lock().unwrap().take();
    match p {
        None => Ok(None),
        Some(p) => read(&p).map(Some),
    }
}

/// Spara tillbaka till en öppnad .gvis-fil. Bara .gvis-filer får skrivas.
#[tauri::command]
fn gvis_write_file(path: String, text: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if !is_gvis(&p) {
        return Err("Bara .gvis-filer kan sparas på det här sättet.".into());
    }
    std::fs::write(&p, text).map_err(|e| e.to_string())
}

/// Installerat från Microsoft Store (MSIX-paket i WindowsApps)? Då sköter Store uppdateringarna.
#[tauri::command]
fn gvis_is_store() -> bool {
    std::env::current_exe()
        .map(|p| p.to_string_lossy().to_lowercase().contains("\\windowsapps\\"))
        .unwrap_or(false)
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let start = gvis_arg(&args, None);

    tauri::Builder::default()
        // Bara ett G-vis åt gången: dubbelklickar man på en fil när G-vis redan är igång öppnas den där.
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            match gvis_arg(&argv, Some(&cwd)) {
                Some(p) => open_path(app, p),
                None => {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.unminimize();
                        let _ = w.set_focus();
                    }
                }
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .manage(Pending(Mutex::new(start)))
        .invoke_handler(tauri::generate_handler![
            gvis_has_pending,
            gvis_take_pending,
            gvis_write_file,
            gvis_is_store
        ])
        .build(tauri::generate_context!())
        .expect("G-vis kunde inte starta")
        .run(|_app, _event| {
            // macOS skickar filen som en händelse i stället för som ett argument.
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = &_event {
                if let Some(p) = urls
                    .iter()
                    .filter_map(|u| u.to_file_path().ok())
                    .find(|p| is_gvis(p))
                {
                    open_path(_app, p);
                }
            }
        });
}
