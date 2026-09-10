# AeroPlayer - Production-Ready Desktop Media Player

A high-performance, cross-platform desktop media player built with **React 18**, **TypeScript**, and **Tailwind CSS**. Designed for modern desktop desktop environments (**Electron** & **Tauri**), supporting adaptive network streaming (HLS `.m3u8`, DASH `.mpd`, direct HTTP/HTTPS) and local media playback with Netflix/YouTube-style real-time hover thumbnail previews.

---

## Key Features

- **Adaptive Bitrate Streaming (HLS)**: Powered by `hls.js` with dynamic quality switching (1080p, 720p, 480p, etc.) and auto ABR mode.
- **Network Resilience**: Automatic stall detection, exponential backoff retries, and media error recovery.
- **Auxiliary Hover Thumbnail Pipeline**:
  - Headless offscreen video worker decoding frames parallel to main playback.
  - Throttled 40ms debounce + `requestAnimationFrame` seeking with `fastSeek` acceleration.
  - Offscreen 2D canvas frame drawing with zero-latency image data rendering.
  - Graceful fallback: Shimmer skeleton and timestamp badge while decoding high-latency streams.
- **Live Stream vs. VOD Detection**: Automatic live broadcast detection with rolling DVR indicator and live status badges.
- **Interactive Seekbar**: Visual multi-chunk buffered ranges (`TimeRanges`), played progress bar, hover glow, and screen-clamped thumbnail tooltip.
- **Dark Modern Desktop UI**: Sleek translucent glassmorphic HUD controls that auto-fade on idle mouse movement (2.5s timeout).
- **Desktop Keyboard Hotkeys**:
  - `Space` / `K`: Play / Pause toggle
  - `F`: Fullscreen toggle
  - `M`: Mute / Unmute toggle
  - `Left Arrow` / `J`: Rewind 10 seconds
  - `Right Arrow` / `L`: Fast-forward 10 seconds
  - `Up Arrow`: Volume +5%
  - `Down Arrow`: Volume -5%
- **Local File Playback & Drag-and-Drop**: Drop any `.mp4`, `.mkv`, or `.webm` file directly onto the window for instant playback.

---

## Project Structure

```
Media-player/
├── electron/
│   ├── main.ts              # Frameless desktop window & native IPC file dialog
│   └── preload.ts           # Secure context bridge
├── src-tauri/
│   └── tauri.conf.json      # Tauri v2 desktop manifest
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── TitleBar.tsx          # Custom frameless titlebar with drag region
│   │   │   └── ErrorBanner.tsx       # Retryable streaming toast
│   │   ├── controls/
│   │   │   ├── ControlsOverlay.tsx   # Auto-hiding HUD controls
│   │   │   ├── QualitySelector.tsx   # ABR quality dropdown
│   │   │   ├── VolumeSlider.tsx      # Hover-expand volume slider
│   │   │   └── PlaybackSpeedMenu.tsx # Variable speed selector (0.5x - 2.0x)
│   │   ├── modals/
│   │   │   └── StreamUrlModal.tsx    # Network stream modal with validator & presets
│   │   ├── player/
│   │   │   ├── MediaPlayer.tsx       # Core player container
│   │   │   └── BufferingIndicator.tsx# Sleek spinner for buffer stalls
│   │   └── seekbar/
│   │       ├── Seekbar.tsx           # Multi-layer seekbar with buffer chunks
│   │       ├── ThumbnailTooltip.tsx  # Clamped hover preview window
│   │       └── TimeBadge.tsx         # Elapsed & remaining time toggle
│   ├── hooks/
│   │   ├── useMediaPlayer.ts         # HTMLMediaElement state controller
│   │   ├── useHlsStream.ts           # HLS adaptive engine and error recovery
│   │   ├── useThumbnailSeeker.ts     # Auxiliary headless video & canvas pipeline
│   │   └── useKeyboardShortcuts.ts   # Desktop media shortcuts
│   ├── types/
│   │   ├── player.ts                 # Full TypeScript interfaces & types
│   │   └── electron.d.ts             # Window context bridge definitions
│   ├── utils/
│   │   ├── formatters.ts             # Time (hh:mm:ss) & bitrate formatting
│   │   ├── streamDetector.ts         # Stream protocol detection & URL validation
│   │   └── clamp.ts                  # Boundary clamping helper
│   ├── App.tsx                       # Main application state coordinator
│   ├── index.css                     # Tailwind CSS and desktop custom scrollbars
│   └── main.tsx                      # React root entry point
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

---

## Getting Started

### 1. Development (Web Browser)

```bash
# Install dependencies
pnpm install

# Start Vite dev server
pnpm dev
```
Open `http://localhost:5173` in your browser.

---

### 2. Running in Electron

To run as a native desktop application using Electron:

```bash
# Install electron and concurrently (if not already installed)
pnpm add -D electron concurrently

# Run Electron in development mode
pnpm electron:dev
```

To build a standalone desktop executable (`.exe`, `.dmg`, or `.AppImage`):
```bash
pnpm add -D electron-builder
pnpm electron:build
```

---

### 3. Running in Tauri

To run with Tauri's lightweight Rust-based webview:

```bash
# Install Tauri CLI
pnpm add -D @tauri-apps/cli

# Run in development mode
pnpm tauri:dev

# Build native binary
pnpm tauri:build
```

---

## Testing Streams Included

AeroPlayer comes pre-loaded with instant test presets in the **Open Stream** modal:
- **Big Buck Bunny**: Multi-bitrate HLS adaptive stream with fast keyframe seeking.
- **Tears of Steel**: Full HD 1080p open-source sci-fi cinematic stream.
- **Akamai Live Stream**: Live broadcast with live DVR indicator.
- **Sintel Trailer**: Direct MP4 progressive stream.
