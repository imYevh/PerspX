# 15 — Packaging & Distribution

## Goal
Package PerspX as a native desktop app (Windows, macOS, Linux) and mobile app (iOS, Android) using Tauri 2. Also deploy as a PWA for instant browser access.

---

## Distribution Matrix

| Platform        | Method          | Size Estimate | Notes                                  |
| :-------------- | :-------------- | :------------ | :------------------------------------- |
| **Web (PWA)**   | Deploy to CDN   | ~1 MB         | Works in any modern browser            |
| **Windows**     | Tauri 2 + MSI   | ~5-8 MB       | Native window, file system access      |
| **macOS**       | Tauri 2 + DMG   | ~5-8 MB       | Signed .app bundle                     |
| **Linux**       | Tauri 2 + AppImage/deb | ~5-8 MB | AppImage for universal compatibility  |
| **iOS**         | Tauri 2 + Xcode | ~10-15 MB     | Requires Apple Developer account       |
| **Android**     | Tauri 2 + APK   | ~8-12 MB      | Can distribute via Play Store or APK   |

Compare: Electron would be ~150+ MB for desktop alone.

---

## Step 1: PWA (Progressive Web App)

The fastest path to mobile users. No app store required.

### `public/manifest.json`

```json
{
  "name": "PerspX",
  "short_name": "PerspX",
  "description": "3D Perspective Visualization Tool for Artists",
  "start_url": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#0a0a0a",
  "theme_color": "#1a1a2e",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Service Worker (`public/sw.js`)

```js
const CACHE_NAME = 'PerspX-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/main.ts',
  // Vite will handle asset hashing in production
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
```

### Register in `index.html`

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#1a1a2e" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />

<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

---

## Step 2: Tauri 2 Desktop

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI
cargo install tauri-cli
```

### Initialize Tauri in the Project

```bash
npx tauri init
```

This creates `src-tauri/` with:
- `Cargo.toml` — Rust dependencies
- `tauri.conf.json` — Tauri configuration
- `src/main.rs` — Rust backend

### `src-tauri/tauri.conf.json` (key fields)

```json
{
  "productName": "PerspX",
  "version": "0.1.0",
  "identifier": "com.PerspX.app",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:3000",
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev"
  },
  "app": {
    "title": "PerspX",
    "windows": [
      {
        "title": "PerspX — 3D Perspective Tool",
        "width": 1280,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false
      }
    ]
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

### Build Commands

```bash
# Development (hot reload)
npx tauri dev

# Production build
npx tauri build
# Output: src-tauri/target/release/bundle/
#   - Windows: .msi installer
#   - macOS: .dmg
#   - Linux: .AppImage, .deb
```

---

## Step 3: Tauri 2 Mobile

### Prerequisites

```bash
# iOS: Xcode installed, Apple Developer account
# Android: Android Studio installed, SDK configured
```

### Initialize Mobile Targets

```bash
npx tauri android init
npx tauri ios init
```

### Build Mobile

```bash
# Android — debug APK
npx tauri android dev

# Android — release APK
npx tauri android build

# iOS — simulator
npx tauri ios dev

# iOS — release (requires signing)
npx tauri ios build
```

### Mobile-Specific Considerations

```rust
// src-tauri/src/main.rs
// Tauri 2 handles iOS/Android lifecycle automatically.
// Add any native Rust commands here (e.g., file system access)

#[tauri::command]
fn get_app_data_dir(app: tauri::AppHandle) -> String {
    app.path()
        .app_data_dir()
        .unwrap()
        .to_string_lossy()
        .to_string()
}
```

### Mobile `index.html` Additions

```html
<!-- iOS safe area support -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no" />

<!-- iOS status bar -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

### CSS Safe Areas

```css
/* Handle notches and rounded corners */
#app {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

---

## Step 4: CI/CD (Optional)

### GitHub Actions Build Matrix

```yaml
# .github/workflows/build.yml
name: Build & Release

on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            target: linux
          - os: macos-latest
            target: macos
          - os: windows-latest
            target: windows

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: dtolnay/rust-toolchain@stable
      - run: npm ci
      - run: npx tauri build
      - uses: actions/upload-artifact@v4
        with:
          name: PerspX-${{ matrix.target }}
          path: src-tauri/target/release/bundle/
```

---

## Deployment Summary

```
┌──────────────────────────────────────────────────────┐
│                    PerspX CODEBASE                    │
│                  (TypeScript + Three.js)              │
├──────────┬──────────┬──────────┬──────────┬──────────┤
│   Web    │ Windows  │  macOS   │  Linux   │  Mobile  │
│   PWA    │  Tauri   │  Tauri   │  Tauri   │  Tauri   │
│          │  .msi    │  .dmg    │ .AppImage│ .apk/.ipa│
│  ~1 MB   │  ~5 MB   │  ~5 MB   │  ~5 MB   │ ~10 MB   │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

---

## Verification

- `npm run dev` → Opens in browser, hot reload works
- `npx tauri dev` → Opens native desktop window with dev tools
- `npx tauri build` → Produces installer for current platform
- PWA installs on mobile Chrome/Safari via "Add to Home Screen"
- Tauri mobile builds run on simulators/devices
- File system access works in Tauri (save/load scenes to disk)
- Safe area insets display correctly on notched devices

---

## Output

After this phase, you have:
- [x] PWA with service worker and manifest (instant mobile access)
- [x] Tauri 2 desktop builds (Windows .msi, macOS .dmg, Linux .AppImage)
- [x] Tauri 2 mobile builds (iOS .ipa, Android .apk)
- [x] CI/CD pipeline for automated cross-platform builds
- [x] Safe area handling for notched devices
- [x] Single codebase → 6 platform targets

---

## 🎉 You've built PerspX!

Go back to [00-architecture.md](./00-architecture.md) for the full overview.
