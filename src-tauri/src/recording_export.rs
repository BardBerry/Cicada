use serde::{Deserialize, Serialize};
use serde_json::Value;
#[cfg(target_os = "macos")]
use std::sync::Mutex;
use tauri::{AppHandle, State, WebviewWindow};

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
}

#[tauri::command]
pub async fn export_recording(
    app: AppHandle,
    window: WebviewWindow,
    recording: Value,
    layout: Value,
) -> Result<String, String> {
    if window.label() != "main" {
        return Err("Export must start from the main window".into());
    }
    #[cfg(target_os = "macos")]
    {
        macos::render(app, recording, layout).await
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (app, recording, layout);
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
        let target = {
            let guard = state.job.lock().map_err(|_| "Export state unavailable")?;
            let job = guard.as_ref().ok_or("No export is active")?;
            if job.label != window.label() || index != job.next_frame || index >= job.frame_count {
                return Err("Invalid export frame request".into());
            }
            job.directory.join(format!("frame-{index:06}.png"))
        };
        let png = macos::snapshot(&window).await?;
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
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (window, state, index);
        Err("Export requires macOS".into())
    }
}

#[tauri::command]
pub fn finish_recording_export_render(
    window: WebviewWindow,
    state: State<'_, RecordingExportState>,
    error: Option<String>,
    summary: RenderSummary,
) -> Result<(), String> {
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
        path::PathBuf,
        sync::mpsc,
        time::{Duration, SystemTime, UNIX_EPOCH},
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
        pub completion: mpsc::Sender<Result<RenderSummary, String>>,
    }

    pub async fn render(app: AppHandle, recording: Value, layout: Value) -> Result<String, String> {
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
        let frame_count = ((duration_ms * 30.0 / 1000.0).ceil() as usize).max(1);
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
        let output = directory
            .parent()
            .ok_or("Invalid export directory")?
            .join(format!("cicada-{id}.mp4"));
        let (sender, receiver) = mpsc::channel();
        {
            let mut guard = state.job.lock().map_err(|_| "Export state unavailable")?;
            if guard.is_some() {
                return Err("Another export is already running".into());
            }
            std::fs::create_dir_all(directory.parent().ok_or("Invalid export directory")?)
                .map_err(|e| e.to_string())?;
            std::fs::create_dir(&directory).map_err(|e| e.to_string())?;
            *guard = Some(RenderJob {
                label: label.clone(),
                directory: directory.clone(),
                frame_count,
                event_count,
                next_frame: 0,
                completion: sender,
            });
        }
        let input = serde_json::json!({"recording": recording, "layout": layout, "frameCount": frame_count});
        let script = format!(
            "{}\nwindow.cicadaExportInput = {};",
            include_str!("../../src/features/recording-export/export-clock.js"),
            input
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
                let timeout = Duration::from_secs_f64(120.0 + duration_ms / 1000.0 * 2.0);
                let rendered = tauri::async_runtime::spawn_blocking(move || {
                    receiver
                        .recv_timeout(timeout)
                        .map_err(|e| format!("Export renderer did not finish: {e}"))
                })
                .await
                .map_err(|e| e.to_string());
                let result = match rendered {
                    Ok(Ok(Ok(summary))) => {
                        eprintln!(
                            "CICADA_EXPORT_RENDER {}",
                            serde_json::to_string(&summary).unwrap_or_default()
                        );
                        let frames = directory.clone();
                        tauri::async_runtime::spawn_blocking(move || {
                            encode(ffmpeg, frames, output, frame_count)
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
        output: PathBuf,
        frame_count: usize,
    ) -> Result<String, String> {
        let partial = frames.join("recording.partial.mp4");
        let encoded = std::process::Command::new(ffmpeg)
            .current_dir(&frames)
            .args([
                "-hide_banner",
                "-loglevel",
                "error",
                "-nostdin",
                "-n",
                "-framerate",
                "30",
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
                "18",
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
        // Same-filesystem publication is exclusive: never replace an existing export.
        std::fs::hard_link(&partial, &output)
            .map_err(|e| format!("Unable to publish MP4 at {}: {e}", output.display()))?;
        Ok(output.to_string_lossy().into_owned())
    }

    pub async fn snapshot(window: &WebviewWindow) -> Result<Vec<u8>, String> {
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
                    let width =
                        NSNumber::numberWithDouble(1920.0 / native_window.backingScaleFactor());
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
                            if bitmap.pixelsWide() != 1920 || bitmap.pixelsHigh() != 1080 {
                                return Err("Snapshot dimensions are not 1920x1080".into());
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
