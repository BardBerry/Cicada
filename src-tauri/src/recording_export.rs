use serde::{Deserialize, Serialize};
use serde_json::Value;
#[cfg(target_os = "macos")]
use std::sync::Mutex;
#[cfg(target_os = "macos")]
use tauri::Emitter;
use tauri::{AppHandle, Manager, State, WebviewWindow};

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportResolution {
    #[serde(rename = "720p")]
    Hd,
    #[serde(rename = "1080p")]
    FullHd,
    #[serde(rename = "1440p")]
    Qhd,
    #[serde(rename = "4k")]
    Uhd,
}

impl ExportResolution {
    fn dimensions(&self) -> (usize, usize) {
        match self {
            Self::Hd => (1280, 720),
            Self::FullHd => (1920, 1080),
            Self::Qhd => (2560, 1440),
            Self::Uhd => (3840, 2160),
        }
    }
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportQuality {
    Standard,
    High,
    Maximum,
}

impl ExportQuality {
    fn crf(&self) -> u8 {
        match self {
            Self::Standard => 23,
            Self::High => 18,
            Self::Maximum => 14,
        }
    }
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ExportSettings {
    resolution: ExportResolution,
    fps: u32,
    quality: ExportQuality,
    filename: String,
    directory: String,
}

#[tauri::command]
pub fn default_recording_export_directory(app: AppHandle) -> Result<String, String> {
    let preferred = app.path().video_dir().map(|path| path.join("Cicada"));
    if let Ok(directory) = preferred {
        if std::fs::create_dir_all(&directory).is_ok() {
            return Ok(directory.to_string_lossy().into_owned());
        }
    }
    let fallback = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("exports");
    std::fs::create_dir_all(&fallback)
        .map_err(|e| format!("Unable to create export directory: {e}"))?;
    Ok(fallback.to_string_lossy().into_owned())
}

#[derive(Default)]
pub struct RecordingExportState {
    #[cfg(target_os = "macos")]
    job: Mutex<Option<macos::RenderJob>>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderSummary {
    applied_event_count: usize,
    max_items: usize,
    final_items: usize,
    document_visibility: String,
    animation_updates: usize,
    #[cfg(feature = "native-export-verification")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    layout_metrics: Option<Value>,
}

#[tauri::command]
pub async fn export_recording(
    app: AppHandle,
    window: WebviewWindow,
    recording: Value,
    layout: Value,
    settings: ExportSettings,
) -> Result<String, String> {
    if window.label() != "main" {
        return Err("Export must start from the main window".into());
    }
    #[cfg(target_os = "macos")]
    {
        macos::render(app, recording, layout, settings).await
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (app, recording, layout, settings);
        Err("Experimental MP4 export is only available on macOS".into())
    }
}

#[tauri::command]
pub async fn capture_recording_export_frame(
    window: WebviewWindow,
    state: State<'_, RecordingExportState>,
    index: usize,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let (target, dimensions) = {
            let guard = state.job.lock().map_err(|_| "Export state unavailable")?;
            let job = guard.as_ref().ok_or("No export is active")?;
            if job.label != window.label() || index != job.next_frame || index >= job.frame_count {
                return Err("Invalid export frame request".into());
            }
            (
                job.directory.join(format!("frame-{index:06}.png")),
                job.dimensions,
            )
        };
        let png = macos::snapshot(&window, dimensions).await?;
        tauri::async_runtime::spawn_blocking(move || {
            use std::io::Write;
            let mut file = std::fs::OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(target)
                .map_err(|e| format!("Unable to create frame: {e}"))?;
            file.write_all(&png)
                .map_err(|e| format!("Unable to write frame: {e}"))
        })
        .await
        .map_err(|e| e.to_string())??;
        let mut guard = state.job.lock().map_err(|_| "Export state unavailable")?;
        let job = guard.as_mut().ok_or("Export ended during capture")?;
        if job.label != window.label() {
            return Err("Export is no longer current".into());
        }
        job.next_frame += 1;
        if job.next_frame == job.frame_count || job.last_progress.elapsed().as_millis() >= 250 {
            job.last_progress = std::time::Instant::now();
            let _ = window.app_handle().emit_to("main", "recording-export-progress", serde_json::json!({
                "phase": "rendering", "completedFrames": job.next_frame, "totalFrames": job.frame_count
            }));
        }
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (window, state, index);
        Err("Export requires macOS".into())
    }
}

#[tauri::command]
pub async fn finish_recording_export_render(
    window: WebviewWindow,
    state: State<'_, RecordingExportState>,
    error: Option<String>,
    summary: RenderSummary,
) -> Result<(), String> {
    #[cfg(all(feature = "native-export-verification", target_os = "macos"))]
    let (summary, error) = {
        let mut summary = summary;
        let error = match crate::native_verification::measure_export_layout(&window).await {
            Ok(metrics) => {
                summary.layout_metrics = metrics;
                error
            }
            Err(failure) => Some(error.unwrap_or(failure)),
        };
        (summary, error)
    };
    #[cfg(target_os = "macos")]
    {
        let guard = state.job.lock().map_err(|_| "Export state unavailable")?;
        let job = guard.as_ref().ok_or("No export is active")?;
        if job.label != window.label() {
            return Err("Invalid export completion".into());
        }
        let result = if let Some(error) = error {
            Err(format!("Unable to render recording: {error}"))
        } else if job.next_frame != job.frame_count
            || summary.applied_event_count != job.event_count
        {
            Err("Export rendering did not complete every frame/event".into())
        } else {
            Ok(summary)
        };
        job.completion.send(result).map_err(|e| e.to_string())
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (window, state, error, summary);
        Err("Export requires macOS".into())
    }
}

#[cfg(target_os = "macos")]
mod macos {
    use super::*;
    use block2::RcBlock;
    use objc2::{runtime::AnyObject, MainThreadMarker};
    use objc2_app_kit::{
        NSBitmapImageFileType, NSBitmapImageRep, NSBitmapImageRepPropertyKey, NSImage, NSWindow,
    };
    use objc2_foundation::{NSDictionary, NSError, NSNumber};
    use objc2_web_kit::{WKSnapshotConfiguration, WKWebView};
    use std::{
        ffi::CString,
        os::unix::ffi::OsStrExt,
        path::PathBuf,
        sync::mpsc,
        time::{Duration, Instant, SystemTime, UNIX_EPOCH},
    };
    use tauri::{
        utils::config::BackgroundThrottlingPolicy, Manager, WebviewUrl, WebviewWindowBuilder,
    };

    pub(super) struct RenderJob {
        pub label: String,
        pub directory: PathBuf,
        pub frame_count: usize,
        pub event_count: usize,
        pub next_frame: usize,
        pub dimensions: (usize, usize),
        pub last_progress: Instant,
        pub completion: mpsc::Sender<Result<RenderSummary, String>>,
    }

    pub async fn render(
        app: AppHandle,
        recording: Value,
        layout: Value,
        settings: ExportSettings,
    ) -> Result<String, String> {
        if ![30, 60].contains(&settings.fps) {
            return Err("Frame rate must be 30 or 60 FPS".into());
        }
        let stem = if settings.filename.to_ascii_lowercase().ends_with(".mp4") {
            &settings.filename[..settings.filename.len() - 4]
        } else {
            &settings.filename
        };
        if stem.len() > 180 {
            return Err("Filename is too long (maximum 180 UTF-8 bytes)".into());
        }
        if stem.is_empty()
            || stem.trim() != stem
            || stem == "."
            || stem == ".."
            || stem.ends_with('.')
            || stem
                .chars()
                .any(|c| c.is_control() || matches!(c, '/' | '\\' | ':'))
        {
            return Err("Use a filename without path separators, control characters, or trailing dots/spaces".into());
        }
        let destination = PathBuf::from(&settings.directory);
        if !destination.is_absolute() {
            return Err("Select an absolute output directory".into());
        }
        let destination = std::fs::canonicalize(destination)
            .map_err(|e| format!("Unable to access output directory: {e}"))?;
        if !destination.is_dir() {
            return Err("Output destination must be a directory".into());
        }
        let output = destination.join(format!("{stem}.mp4"));
        if output.try_exists().map_err(|e| e.to_string())? {
            return Err("An export with this filename already exists. Choose another name.".into());
        }
        let duration_ms = recording
            .get("durationMs")
            .and_then(Value::as_f64)
            .filter(|value| value.is_finite() && *value >= 0.0)
            .ok_or("Invalid recording duration")?;
        let event_count = recording
            .get("events")
            .and_then(Value::as_array)
            .ok_or("Invalid recording events")?
            .len();
        let frame_count = ((duration_ms * f64::from(settings.fps) / 1000.0).ceil() as usize).max(1);
        let ffmpeg = tauri::async_runtime::spawn_blocking(find_ffmpeg)
            .await
            .map_err(|e| e.to_string())??;
        let id = format!(
            "{}-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map_err(|e| e.to_string())?
                .as_nanos(),
            std::process::id()
        );
        let label = format!("recording-export-{id}");
        let directory = app
            .path()
            .app_data_dir()
            .map_err(|e| e.to_string())?
            .join("exports")
            .join(format!(".render-{id}"));
        let state = app.state::<RecordingExportState>();
        let destination_work = destination.join(format!(".cicada-export-{id}"));
        let (sender, receiver) = mpsc::channel();
        {
            let mut guard = state.job.lock().map_err(|_| "Export state unavailable")?;
            if guard.is_some() {
                return Err("Another export is already running".into());
            }
            std::fs::create_dir_all(directory.parent().ok_or("Invalid export directory")?)
                .map_err(|e| e.to_string())?;
            std::fs::create_dir(&directory).map_err(|e| e.to_string())?;
            if let Err(error) = std::fs::create_dir(&destination_work) {
                let _ = std::fs::remove_dir(&directory);
                return Err(format!(
                    "Unable to create output working directory: {error}"
                ));
            }
            *guard = Some(RenderJob {
                label: label.clone(),
                directory: directory.clone(),
                frame_count,
                event_count,
                next_frame: 0,
                dimensions: settings.resolution.dimensions(),
                last_progress: Instant::now(),
                completion: sender,
            });
        }
        let _ = app.emit_to(
            "main",
            "recording-export-progress",
            serde_json::json!({
                "phase": "rendering", "completedFrames": 0, "totalFrames": frame_count
            }),
        );
        let input = serde_json::json!({"recording": recording, "layout": layout, "settings": settings, "frameCount": frame_count});
        let script = format!(
            "{}\nwindow.cicadaExportInput = {};",
            include_str!("../../src/features/recording-export/export-clock.js"),
            input
        );
        #[cfg(feature = "native-export-verification")]
        let script = format!(
            "{script}\n{}",
            include_str!("../../scripts/export-recording/layout-diagnostics.js")
        );
        let build = WebviewWindowBuilder::new(&app, &label, WebviewUrl::App("export.html".into()))
            .title("Cicada Export")
            .inner_size(1920.0, 1080.0)
            .decorations(false)
            .focused(false)
            .visible(false)
            .background_throttling(BackgroundThrottlingPolicy::Disabled)
            .initialization_script(&script)
            .build();
        let result = match build {
            Ok(window) => {
                // Higher-density PNG capture is slower, but simulation time stays unchanged.
                let density = settings.resolution.dimensions().0 as f64 / 1920.0;
                let timeout = Duration::from_secs_f64(
                    120.0
                        + duration_ms / 1000.0 * 2.0 * density * density * f64::from(settings.fps)
                            / 30.0,
                );
                let rendered = tauri::async_runtime::spawn_blocking(move || {
                    receiver
                        .recv_timeout(timeout)
                        .map_err(|e| format!("Export renderer did not finish: {e}"))
                })
                .await
                .map_err(|e| e.to_string());
                let result = match rendered {
                    Ok(Ok(Ok(summary))) => {
                        #[cfg(feature = "native-export-verification")]
                        let _ = app.emit_to("main", "recording-export-verification", &summary);
                        let _ = app.emit_to("main", "recording-export-progress", serde_json::json!({
                            "phase": "encoding", "completedFrames": frame_count, "totalFrames": frame_count
                        }));
                        eprintln!(
                            "CICADA_EXPORT_RENDER {}",
                            serde_json::to_string(&summary).unwrap_or_default()
                        );
                        let frames = directory.clone();
                        let partial = destination_work.join("recording.partial.mp4");
                        tauri::async_runtime::spawn_blocking(move || {
                            encode(ffmpeg, frames, partial, output, frame_count, settings)
                        })
                        .await
                        .map_err(|e| e.to_string())
                        .and_then(|result| result)
                    }
                    Ok(Ok(Err(error))) | Ok(Err(error)) | Err(error) => Err(error),
                };
                let _ = window.close();
                result
            }
            Err(error) => Err(format!("Unable to create export WebView: {error}")),
        };
        state
            .job
            .lock()
            .map_err(|_| "Export state unavailable")?
            .take();
        if let Err(error) = std::fs::remove_dir_all(&directory) {
            eprintln!(
                "Unable to remove export working files {}: {error}",
                directory.display()
            );
        }
        if let Err(error) = std::fs::remove_dir_all(&destination_work) {
            eprintln!(
                "Unable to remove export output working directory {}: {error}",
                destination_work.display()
            );
        }
        result
    }

    fn find_ffmpeg() -> Result<PathBuf, String> {
        let executable = if let Some(path) = std::env::var_os("FFMPEG_PATH") {
            PathBuf::from(path)
        } else {
            let mut candidates: Vec<PathBuf> = std::env::var_os("PATH")
                .map(|path| {
                    std::env::split_paths(&path)
                        .map(|directory| directory.join("ffmpeg"))
                        .collect()
                })
                .unwrap_or_default();
            candidates.extend([
                PathBuf::from("/opt/homebrew/bin/ffmpeg"),
                PathBuf::from("/usr/local/bin/ffmpeg"),
            ]);
            candidates.into_iter().find(|candidate| candidate.is_file()).ok_or("FFmpeg is required for experimental export. Install it with brew install ffmpeg, or set FFMPEG_PATH.")?
        };
        let executable = std::fs::canonicalize(&executable)
            .map_err(|e| format!("Unable to resolve FFmpeg at {}: {e}", executable.display()))?;
        let version = std::process::Command::new(&executable)
            .args(["-version"])
            .output()
            .map_err(|e| format!("Unable to run FFmpeg at {}: {e}", executable.display()))?;
        if !version.status.success() {
            return Err(format!(
                "FFmpeg could not start at {}",
                executable.display()
            ));
        }
        Ok(executable)
    }

    fn encode(
        ffmpeg: PathBuf,
        frames: PathBuf,
        partial: PathBuf,
        output: PathBuf,
        frame_count: usize,
        settings: ExportSettings,
    ) -> Result<String, String> {
        let fps = settings.fps.to_string();
        let crf = settings.quality.crf().to_string();
        let encoded = std::process::Command::new(ffmpeg)
            .current_dir(&frames)
            .args([
                "-hide_banner",
                "-loglevel",
                "error",
                "-nostdin",
                "-n",
                "-framerate",
                &fps,
                "-i",
                "frame-%06d.png",
                "-frames:v",
            ])
            .arg(frame_count.to_string())
            .args([
                "-an",
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                &crf,
                "-pix_fmt",
                "yuv420p",
                "-movflags",
                "+faststart",
            ])
            .arg(&partial)
            .output()
            .map_err(|e| format!("Unable to encode MP4: {e}"))?;
        if !encoded.status.success() {
            return Err(format!(
                "FFmpeg export failed: {}",
                String::from_utf8_lossy(&encoded.stderr).trim()
            ));
        }
        // The partial lives on the destination filesystem. RENAME_EXCL publishes
        // atomically without overwriting, including on volumes without hard links.
        unsafe extern "C" {
            fn renamex_np(
                from: *const std::ffi::c_char,
                to: *const std::ffi::c_char,
                flags: u32,
            ) -> i32;
        }
        let from = CString::new(partial.as_os_str().as_bytes()).map_err(|e| e.to_string())?;
        let to = CString::new(output.as_os_str().as_bytes()).map_err(|e| e.to_string())?;
        if unsafe { renamex_np(from.as_ptr(), to.as_ptr(), 0x00000004) } != 0 {
            return Err(format!(
                "Unable to publish MP4 at {} without replacing an existing file: {}",
                output.display(),
                std::io::Error::last_os_error()
            ));
        }
        Ok(output.to_string_lossy().into_owned())
    }

    pub async fn snapshot(
        window: &WebviewWindow,
        dimensions: (usize, usize),
    ) -> Result<Vec<u8>, String> {
        let (sender, mut receiver) = tauri::async_runtime::channel(1);
        window
            .with_webview(move |platform| {
                let result = (|| {
                    let marker = MainThreadMarker::new()
                        .ok_or("Snapshot setup must run on the main thread")?;
                    // Tauri lends these native handles on its event-loop thread.
                    let view = unsafe { platform.inner().cast::<WKWebView>().as_ref() }
                        .ok_or("Missing WKWebView")?;
                    let native_window = unsafe { platform.ns_window().cast::<NSWindow>().as_ref() }
                        .ok_or("Missing NSWindow")?;
                    let width = NSNumber::numberWithDouble(
                        dimensions.0 as f64 / native_window.backingScaleFactor(),
                    );
                    let config = unsafe { WKSnapshotConfiguration::new(marker) };
                    unsafe {
                        config.setSnapshotWidth(Some(&width));
                        config.setAfterScreenUpdates(true);
                    }
                    let completed = sender.clone();
                    let callback = RcBlock::new(move |image: *mut NSImage, error: *mut NSError| {
                        let result: Result<Vec<u8>, String> = (|| {
                            let marker = MainThreadMarker::new()
                                .ok_or("Snapshot completion must run on the main thread")?;
                            if let Some(error) = unsafe { error.as_ref() } {
                                return Err(format!("WebKit snapshot failed: {error:?}"));
                            }
                            let image =
                                unsafe { image.as_ref() }.ok_or("Snapshot returned no image")?;
                            let tiff = image
                                .TIFFRepresentation()
                                .ok_or("Snapshot TIFF conversion failed")?;
                            let bitmap = NSBitmapImageRep::initWithData(marker.alloc(), &tiff)
                                .ok_or("Snapshot bitmap conversion failed")?;
                            if bitmap.pixelsWide() != dimensions.0 as isize
                                || bitmap.pixelsHigh() != dimensions.1 as isize
                            {
                                return Err(format!(
                                    "Snapshot dimensions do not match {}x{}",
                                    dimensions.0, dimensions.1
                                ));
                            }
                            let properties =
                                NSDictionary::<NSBitmapImageRepPropertyKey, AnyObject>::new();
                            let png = unsafe {
                                bitmap.representationUsingType_properties(
                                    NSBitmapImageFileType::PNG,
                                    &properties,
                                )
                            }
                            .ok_or("Snapshot PNG conversion failed")?;
                            Ok(png.to_vec())
                        })();
                        let _ = completed.try_send(result);
                    });
                    unsafe {
                        view.takeSnapshotWithConfiguration_completionHandler(
                            Some(&config),
                            &callback,
                        );
                    }
                    Ok::<(), String>(())
                })();
                if let Err(error) = result {
                    let _ = sender.try_send(Err(error));
                }
            })
            .map_err(|e| e.to_string())?;
        receiver
            .recv()
            .await
            .ok_or("Snapshot callback returned no result")?
    }
}
