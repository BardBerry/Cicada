#[tauri::command]
pub fn export_verification_report(app: tauri::AppHandle, result: serde_json::Value) {
    eprintln!("CICADA_NATIVE_VERIFY {result}");
    app.exit(0);
}

#[cfg(target_os = "macos")]
pub async fn measure_export_layout(
    window: &tauri::WebviewWindow,
) -> Result<Option<serde_json::Value>, String> {
    use block2::RcBlock;
    use objc2::runtime::AnyObject;
    use objc2_foundation::{NSError, NSString};
    use objc2_web_kit::WKWebView;

    let (sender, mut receiver) = tauri::async_runtime::channel(1);
    window
        .with_webview(move |platform| {
            let setup = (|| {
                let view = unsafe { platform.inner().cast::<WKWebView>().as_ref() }
                    .ok_or("Missing verification WebView")?;
                let completed = sender.clone();
                let callback = RcBlock::new(move |value: *mut AnyObject, error: *mut NSError| {
                    let result = (|| {
                        if let Some(error) = unsafe { error.as_ref() } {
                            return Err(format!("Unable to measure export layout: {error:?}"));
                        }
                        let value = unsafe { value.as_ref() }.ok_or("No layout measurement")?;
                        let json = value.downcast_ref::<NSString>().ok_or("Layout measurement was not JSON text")?;
                        serde_json::from_str(&json.to_string()).map_err(|e| e.to_string())
                    })();
                    let _ = completed.try_send(result);
                });
                let script = NSString::from_str(
                    "JSON.stringify(window.cicadaExportVerify ? window.cicadaExportMeasureLayout() : null)",
                );
                unsafe { view.evaluateJavaScript_completionHandler(&script, Some(&callback)); }
                Ok::<(), String>(())
            })();
            if let Err(error) = setup {
                let _ = sender.try_send(Err(error));
            }
        })
        .map_err(|e| e.to_string())?;
    receiver
        .recv()
        .await
        .ok_or("No layout measurement callback")?
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
