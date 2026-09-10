import { app, BrowserWindow, ipcMain, dialog, session } from 'electron';
import path from 'path';

// Enable hardware acceleration & HEVC (H.265) video decoding support in Chromium
app.commandLine.appendSwitch('enable-features', 'PlatformHEVCDecoderSupport');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// Maximize media buffer cache size (1GB RAM / 2GB Disk cache) for VLC-grade pre-roll buffering
app.commandLine.appendSwitch('media-cache-size', '1073741824');
app.commandLine.appendSwitch('disk-cache-size', '2147483648');
app.commandLine.appendSwitch('disable-background-timer-throttling');

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // Configure network session to bypass CORS and spoof stream referers (like VLC)
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders = { ...details.requestHeaders };
    const lowerUrl = details.url.toLowerCase();

    // Streamtape / tapecontent anti-hotlinking bypass & streaming socket optimization (VLC behavior)
    if (lowerUrl.includes('tapecontent.net') || lowerUrl.includes('streamtape')) {
      requestHeaders['Referer'] = 'https://streamtape.com/';
      requestHeaders['User-Agent'] =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
      requestHeaders['Accept'] = '*/*';
      requestHeaders['Connection'] = 'keep-alive';
      delete requestHeaders['Origin'];
      delete requestHeaders['Sec-Fetch-Site'];
      delete requestHeaders['Sec-Fetch-Mode'];
      delete requestHeaders['Sec-Fetch-Dest'];
    }

    callback({ cancel: false, requestHeaders });
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    // Inject permissive CORS headers and expose byte range headers for HTML5 video MultiBufferDataSource
    responseHeaders['access-control-allow-origin'] = ['*'];
    responseHeaders['access-control-allow-headers'] = ['*'];
    responseHeaders['access-control-expose-headers'] = [
      'Content-Range, Accept-Ranges, Content-Length, Content-Type, ETag, Last-Modified',
    ];
    responseHeaders['access-control-allow-methods'] = ['GET, HEAD, OPTIONS'];
    callback({ cancel: false, responseHeaders });
  });

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 800,
    minHeight: 520,
    frame: false, // Frameless desktop window
    backgroundColor: '#0a0b0e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allows cross-origin video streaming like VLC
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Window control IPC
ipcMain.on('window-action', (_, action: 'minimize' | 'maximize' | 'close') => {
  if (!mainWindow) return;
  switch (action) {
    case 'minimize':
      mainWindow.minimize();
      break;
    case 'maximize':
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
      break;
    case 'close':
      mainWindow.close();
      break;
  }
});

// Native file open dialog IPC
ipcMain.handle('open-file-dialog', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Video Files', extensions: ['mp4', 'mkv', 'webm', 'mov', 'm3u8'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
