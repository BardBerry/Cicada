use block2::RcBlock;
use objc2::{runtime::AnyObject, MainThreadMarker};
use objc2_app_kit::{
    NSBitmapImageFileType, NSBitmapImageRep, NSBitmapImageRepPropertyKey, NSImage, NSWindow,
};
use objc2_foundation::{NSDictionary, NSError, NSNumber};
use objc2_web_kit::{WKSnapshotConfiguration, WKWebView};
use serde_json::{json, Value};
use std::{io::Write, path::PathBuf, time::Instant};
use tauri::{
    utils::config::BackgroundThrottlingPolicy, AppHandle, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};

#[tauri::command]
pub fn start_snapshot_density(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Start from main window only".into());
    }
    let recording = std::fs::read_to_string(
        std::env::var("CICADA_SNAPSHOT_RECORDING").map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    let recording: Value = serde_json::from_str(&recording).map_err(|e| e.to_string())?;
    let directory =
        PathBuf::from(std::env::var("CICADA_SNAPSHOT_OUTPUT").map_err(|e| e.to_string())?);
    std::fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let input = json!({"recording": recording, "layout": {
        "position": {"x": 0.5, "y": 0.5}, "horizontalAlignment": "center",
        "historyDirection": "up", "maxWidth": 500
    }});
    WebviewWindowBuilder::new(
        &app,
        "snapshot-density",
        WebviewUrl::App("scripts/export-recording/snapshot-density.html".into()),
    )
    .inner_size(1920.0, 1080.0)
    .decorations(false)
    .focused(false)
    .visible(false)
    .background_throttling(BackgroundThrottlingPolicy::Disabled)
    .initialization_script(format!(
        "{}\nwindow.cicadaSnapshotInput = {};",
        include_str!("../../src/features/recording-export/export-clock.js"),
        input
    ))
    .build()
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn capture_snapshot_density(
    window: WebviewWindow,
    sample: String,
    pixel_width: usize,
) -> Result<Value, String> {
    if window.label() != "snapshot-density"
        || ![1280, 1920, 2560, 3840].contains(&pixel_width)
        || !sample
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-')
    {
        return Err("Invalid density experiment request".into());
    }
    let target = PathBuf::from(std::env::var("CICADA_SNAPSHOT_OUTPUT").map_err(|e| e.to_string())?)
        .join(format!("{sample}-{pixel_width}.png"));
    let started = Instant::now();
    let (sender, mut receiver) = tauri::async_runtime::channel(1);
    window.with_webview(move |platform| {
        let setup = (|| {
            let marker = MainThreadMarker::new().ok_or("Not on main thread")?;
            let view = unsafe { platform.inner().cast::<WKWebView>().as_ref() }
                .ok_or("Missing WKWebView")?;
            let native_window = unsafe { platform.ns_window().cast::<NSWindow>().as_ref() }
                .ok_or("Missing NSWindow")?;
            let backing_scale = native_window.backingScaleFactor();
            let bounds = view.bounds();
            let snapshot_width = pixel_width as f64 / backing_scale;
            let width = NSNumber::numberWithDouble(snapshot_width);
            let config = unsafe { WKSnapshotConfiguration::new(marker) };
            unsafe {
                config.setSnapshotWidth(Some(&width));
                config.setAfterScreenUpdates(true);
            }
            let completed = sender.clone();
            let callback = RcBlock::new(move |image: *mut NSImage, error: *mut NSError| {
                let result: Result<_, String> = (|| {
                    let marker = MainThreadMarker::new().ok_or("Not on main thread")?;
                    if let Some(error) = unsafe { error.as_ref() } {
                        return Err(format!("Snapshot failed: {error:?}"));
                    }
                    let image = unsafe { image.as_ref() }.ok_or("No snapshot image")?;
                    let size = image.size();
                    let tiff = image.TIFFRepresentation().ok_or("No TIFF")?;
                    let bitmap = NSBitmapImageRep::initWithData(marker.alloc(), &tiff)
                        .ok_or("No bitmap")?;
                    let properties = NSDictionary::<NSBitmapImageRepPropertyKey, AnyObject>::new();
                    let png = unsafe {
                        bitmap.representationUsingType_properties(NSBitmapImageFileType::PNG, &properties)
                    }.ok_or("No PNG")?;
                    let metadata = json!({
                        "backingScale": backing_scale, "snapshotWidth": snapshot_width,
                        "viewBounds": [bounds.size.width, bounds.size.height],
                        "imageSize": [size.width, size.height],
                        "bitmapSize": [bitmap.pixelsWide(), bitmap.pixelsHigh()],
                        "pngBytes": png.len(), "nativeMs": started.elapsed().as_secs_f64() * 1000.0
                    });
                    Ok((png.to_vec(), metadata))
                })();
                let _ = completed.try_send(result);
            });
            unsafe { view.takeSnapshotWithConfiguration_completionHandler(Some(&config), &callback); }
            Ok::<(), String>(())
        })();
        if let Err(error) = setup { let _ = sender.try_send(Err(error)); }
    }).map_err(|e| e.to_string())?;
    let (png, mut metadata) = receiver.recv().await.ok_or("No snapshot callback")??;
    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&target)
        .map_err(|e| e.to_string())?;
    file.write_all(&png).map_err(|e| e.to_string())?;
    metadata["path"] = json!(target);
    metadata["totalMs"] = json!(started.elapsed().as_secs_f64() * 1000.0);
    Ok(metadata)
}

#[tauri::command]
pub fn finish_snapshot_density(app: AppHandle, result: Value) -> Result<(), String> {
    let directory =
        PathBuf::from(std::env::var("CICADA_SNAPSHOT_OUTPUT").map_err(|e| e.to_string())?);
    std::fs::write(
        directory.join("measurements.json"),
        serde_json::to_vec_pretty(&result).unwrap(),
    )
    .map_err(|e| e.to_string())?;
    eprintln!("CICADA_SNAPSHOT_DENSITY {result}");
    app.exit(0);
    Ok(())
}
