#[tauri::command]
pub fn export_verification_report(app: tauri::AppHandle, result: serde_json::Value) {
    eprintln!("CICADA_NATIVE_VERIFY {result}");
    app.exit(0);
}

pub fn load(webview: &tauri::Webview, payload: &tauri::webview::PageLoadPayload) {
    if webview.label() == "main"
        && payload.event() == tauri::webview::PageLoadEvent::Finished
        && std::env::var_os("CICADA_NATIVE_EXPORT_VERIFY").is_some()
    {
        let mode = serde_json::to_string(
            &std::env::var("CICADA_NATIVE_EXPORT_VERIFY").unwrap_or_default(),
        )
        .unwrap_or_default();
        let module = serde_json::to_string(
            &std::env::var("CICADA_NATIVE_EXPORT_VERIFY_MODULE")
                .unwrap_or_else(|_| "/scripts/export-recording/native-verification.ts".into()),
        )
        .unwrap_or_default();
        let _ = webview.eval(format!("window.cicadaNativeVerificationMode = {mode}; import({module}).catch(error => window.__TAURI_INTERNALS__.invoke('export_verification_report', {{result: {{bootstrapError: String(error)}}}}))"));
    }
}
