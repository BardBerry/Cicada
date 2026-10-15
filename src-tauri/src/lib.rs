mod recording_export;

#[cfg(feature = "native-export-verification")]
#[path = "../../scripts/export-recording/native-verification.rs"]
mod native_verification;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(recording_export::RecordingExportState::default());

    #[cfg(not(feature = "native-export-verification"))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        recording_export::export_recording,
        recording_export::default_recording_export_directory,
        recording_export::capture_recording_export_frame,
        recording_export::finish_recording_export_render,
    ]);

    #[cfg(feature = "native-export-verification")]
    let builder = builder
        .on_page_load(native_verification::load)
        .invoke_handler(tauri::generate_handler![
            recording_export::export_recording,
            recording_export::default_recording_export_directory,
            recording_export::capture_recording_export_frame,
            recording_export::finish_recording_export_render,
            native_verification::export_verification_report,
        ]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
