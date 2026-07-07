#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Enable WebGPU in the Windows WebView2 runtime so the in-browser AI model
  // (Summarise / Ask) can run on the GPU. macOS/iOS ship WebGPU on by default in
  // modern WebKit (Safari 18 / macOS 15+ / iOS 18+); Linux webkit2gtk has no
  // WebGPU, so those builds fall back to the on-device heuristic automatically.
  #[cfg(target_os = "windows")]
  {
    let flags = "--enable-unsafe-webgpu --enable-features=Vulkan,WebGPU";
    let combined = match std::env::var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS") {
      Ok(existing) if !existing.trim().is_empty() => format!("{existing} {flags}"),
      _ => flags.to_string(),
    };
    std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", combined);
  }

  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}