const { app, BrowserWindow, ipcMain, dialog, nativeTheme, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('node:fs/promises');
const path = require('node:path');

// app.getVersion() reports Electron's own version when running from source
// (and the app version when packaged), so read the real one from package.json.
const { version: APP_VERSION } = require(path.join(__dirname, '..', 'package.json'));

let mainWindow;
let splashWindow;
let splashReady = Promise.resolve();
let splashShownAt = 0;
let mainWindowReady = false;
const pendingOpenPaths = [];

// How long the update check may take before the app opens anyway, so a slow
// or offline network never keeps the user waiting.
const UPDATE_CHECK_TIMEOUT = 6000;
// An update download that stalls for this long gives up and opens the app.
const UPDATE_DOWNLOAD_TIMEOUT = 10 * 60 * 1000;
// The splash is only used for real launches; the env var is a development
// escape hatch for looking at it without packaging the app.
const SHOW_SPLASH = app.isPackaged || process.env.LOGICG8_SHOW_SPLASH === '1';

// Closing the window is a two-step dance with the renderer: the first close
// request is cancelled so the renderer can ask about unsaved tabs, and the
// renderer calls back to either finish or abandon the quit.
let closeApproved = false;
let closeRequestPending = false;

const TEXT_EXTENSIONS = new Set(['txt', 'md', 'markdown', 'mdown', 'mkd', 'logic', 'syllogism']);
const IMAGE_EXTENSIONS = new Set(['png']);

const TEXT_FILTERS = [
  { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd'] },
  { name: 'Text and logic files', extensions: ['txt', 'logic', 'syllogism'] },
  { name: 'PNG images', extensions: ['png'] },
  { name: 'All files', extensions: ['*'] }
];

const IMAGE_FILTERS = [
  { name: 'PNG image', extensions: ['png'] }
];

function isTextPath(filePath) {
  const extension = path.extname(filePath).slice(1).toLowerCase();
  return extension === '' || TEXT_EXTENSIONS.has(extension);
}

function isImagePath(filePath) {
  return IMAGE_EXTENSIONS.has(path.extname(filePath).slice(1).toLowerCase());
}

function isOpenablePath(filePath) {
  return isTextPath(filePath) || isImagePath(filePath);
}

// A file passed on the command line (for example "LogicG8.exe notes.md")
// opens as soon as the window is ready.
function collectStartupPaths(argv) {
  for (const argument of argv.slice(1)) {
    if (!argument || argument.startsWith('-') || !path.isAbsolute(argument)) {
      continue;
    }
    if (isOpenablePath(argument)) {
      pendingOpenPaths.push(argument);
    }
  }
}

async function readTextFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const content = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return { path: filePath, content };
}

// Images travel to the renderer as data URLs so the canvas can draw them
// without the file:// origin tainting the saved PNG.
async function readOpenFile(filePath) {
  if (isImagePath(filePath)) {
    const buffer = await fs.readFile(filePath);
    return {
      path: filePath,
      image: true,
      dataUrl: `data:image/png;base64,${buffer.toString('base64')}`
    };
  }
  return readTextFile(filePath);
}

function imageBuffer(dataUrl) {
  const match = /^data:image\/png;base64,([a-zA-Z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!match) {
    throw new Error('The drawing could not be encoded as a PNG.');
  }
  return Buffer.from(match[1], 'base64');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

// The splash sits in front of the main window while updates are checked. It is
// frameless, so it reads as part of the launch rather than another window.
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 380,
    height: 208,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    backgroundColor: '#050505',
    show: false,
    center: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    title: 'LogicG8',
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'splash-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  splashWindow.setMenuBarVisibility(false);
  splashWindow.loadFile(path.join(__dirname, 'splash.html'), {
    query: { version: APP_VERSION }
  });

  splashReady = new Promise((resolve) => {
    splashWindow.once('ready-to-show', () => {
      splashShownAt = Date.now();
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.show();
      }
      resolve();
    });
  });

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function setSplashStatus(text) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('splash:status', text);
  }
}

function setSplashProgress(percent) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('splash:progress', percent);
  }
}

// Shows the main window once the splash has had its moment. The splash is
// destroyed first thing if the app is about to restart for an update.
async function revealApp() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (!mainWindowReady) {
    await withTimeout(
      new Promise((resolve) => mainWindow.once('ready-to-show', resolve)),
      5000
    ).catch(() => {});
  }

  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (splashShownAt) {
    const remaining = Math.max(0, 700 - (Date.now() - splashShownAt));
    if (remaining > 0) {
      await delay(remaining);
    }
  }

  mainWindow.show();
  mainWindow.focus();

  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.destroy();
    splashWindow = null;
  }
}

// Checks GitHub for a newer release and, if there is one, downloads and
// installs it. Returns true when the app is quitting to restart as the new
// version. Every failure falls back to opening the current version.
async function installUpdateIfAvailable() {
  if (!app.isPackaged) {
    return false;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = false;

  let available = false;
  const onAvailable = (info) => {
    available = true;
    setSplashStatus(`Update ${info.version} found`);
  };
  const onProgress = (progress) => {
    setSplashProgress(progress.percent);
  };

  autoUpdater.on('update-available', onAvailable);
  autoUpdater.on('download-progress', onProgress);

  try {
    await withTimeout(autoUpdater.checkForUpdates(), UPDATE_CHECK_TIMEOUT);
  } catch {
    autoUpdater.removeListener('update-available', onAvailable);
    autoUpdater.removeListener('download-progress', onProgress);
    return false;
  }

  if (!available) {
    autoUpdater.removeListener('update-available', onAvailable);
    autoUpdater.removeListener('download-progress', onProgress);
    return false;
  }

  setSplashStatus('Downloading update…');

  try {
    await withTimeout(autoUpdater.downloadUpdate(), UPDATE_DOWNLOAD_TIMEOUT);
  } catch {
    autoUpdater.removeListener('update-available', onAvailable);
    autoUpdater.removeListener('download-progress', onProgress);
    setSplashProgress(0);
    setSplashStatus('Could not install the update');
    await delay(1500);
    return false;
  }

  autoUpdater.removeListener('update-available', onAvailable);
  autoUpdater.removeListener('download-progress', onProgress);

  setSplashStatus('Restarting to finish the update…');
  await delay(700);

  // The installer closes the window on its own, so the unsaved-changes prompt
  // must not get in its way.
  closeApproved = true;
  closeRequestPending = false;

  try {
    autoUpdater.quitAndInstall(true, true);
  } catch {
    closeApproved = false;
    setSplashProgress(0);
    setSplashStatus('Could not install the update');
    return false;
  }

  return true;
}

function createWindow() {
  mainWindowReady = false;
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 640,
    minHeight: 420,
    backgroundColor: '#000000',
    title: 'LogicG8',
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'), {
    query: { version: APP_VERSION }
  });

  // A file dropped outside the renderer's handlers would otherwise navigate the
  // window to file:// and replace the editor. The app never navigates.
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  mainWindow.once('ready-to-show', () => {
    mainWindowReady = true;
  });
  mainWindow.on('close', (event) => {
    if (closeApproved) {
      return;
    }
    event.preventDefault();
    if (closeRequestPending || mainWindow.webContents.isDestroyed()) {
      return;
    }
    closeRequestPending = true;
    mainWindow.webContents.send('app:close-requested');
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    closeApproved = false;
    closeRequestPending = false;
  });
}

// The renderer says the app may close (nothing unsaved, changes discarded, or
// everything saved).
ipcMain.handle('app:close', () => {
  closeApproved = true;
  closeRequestPending = false;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

// The renderer is keeping the window open (the user cancelled, or a save did
// not happen).
ipcMain.handle('app:close-cancel', () => {
  closeRequestPending = false;
});

ipcMain.handle('app:ask-save-before-close', async (_event, payload) => {
  const count = payload && Number.isInteger(payload.count) ? payload.count : 1;
  const names = payload && Array.isArray(payload.names)
    ? payload.names.filter((name) => typeof name === 'string' && name)
    : [];
  const listed = names.slice(0, 10).join('\n');
  const more = names.length > 10 ? `\n…and ${names.length - 10} more` : '';

  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: ['Save', "Don't Save", 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    noLink: true,
    message: count === 1
      ? 'Do you want to save the changes you made?'
      : `Do you want to save the changes to ${count} open files?`,
    detail: listed
      ? `${listed}${more}\n\nYour changes will be lost if you don't save them.`
      : "Your changes will be lost if you don't save them."
  });

  return result.response;
});

ipcMain.handle('file:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open a file',
    properties: ['openFile'],
    filters: TEXT_FILTERS
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return readOpenFile(result.filePaths[0]);
});

ipcMain.handle('file:take-pending', async () => {
  const filePath = pendingOpenPaths.shift();
  if (!filePath) {
    return null;
  }
  try {
    return await readOpenFile(filePath);
  } catch {
    return null;
  }
});

// Files dropped on the window arrive as absolute paths from the renderer.
// Unsupported or unreadable files are reported back so the UI can say so.
ipcMain.handle('file:open-dropped', async (_event, filePaths) => {
  if (!Array.isArray(filePaths)) {
    return { files: [], skipped: [] };
  }

  const files = [];
  const skipped = [];
  const seen = new Set();

  for (const filePath of filePaths) {
    if (typeof filePath !== 'string' || !filePath || seen.has(filePath)) {
      continue;
    }
    seen.add(filePath);

    if (!isOpenablePath(filePath)) {
      skipped.push(path.basename(filePath));
      continue;
    }

    try {
      files.push(await readOpenFile(filePath));
    } catch {
      skipped.push(path.basename(filePath));
    }
  }

  return { files, skipped };
});

ipcMain.handle('file:open-relative', async (_event, payload) => {
  const base = payload && typeof payload.base === 'string' ? payload.base : '';
  const href = payload && typeof payload.href === 'string' ? payload.href : '';
  if (!base || !href) {
    return null;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href) || href.startsWith('//')) {
    return null;
  }

  let relative;
  try {
    relative = decodeURIComponent(href.split('#')[0].split('?')[0]);
  } catch {
    relative = href;
  }
  if (!relative) {
    return null;
  }

  const target = path.resolve(path.dirname(base), relative);
  if (!isOpenablePath(target)) {
    return null;
  }

  try {
    return await readOpenFile(target);
  } catch {
    return null;
  }
});

ipcMain.handle('shell:open-external', async (_event, url) => {
  if (typeof url !== 'string' || !/^(https?:|mailto:)/i.test(url.trim())) {
    return false;
  }
  await shell.openExternal(url.trim());
  return true;
});

ipcMain.handle('file:save', async (_event, payload) => {
  const isImage = typeof payload.dataUrl === 'string';
  let filePath = payload.path;

  if (!filePath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: isImage ? 'Save your drawing' : 'Save your logic',
      defaultPath: payload.suggestedName || (isImage ? 'Untitled.png' : 'Untitled.logic'),
      filters: isImage ? IMAGE_FILTERS : TEXT_FILTERS
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    filePath = result.filePath;
  }

  if (isImage) {
    await fs.writeFile(filePath, imageBuffer(payload.dataUrl));
  } else {
    await fs.writeFile(filePath, payload.content, 'utf8');
  }
  return { path: filePath };
});

ipcMain.handle('file:save-as', async (_event, payload) => {
  const isImage = typeof payload.dataUrl === 'string';
  const result = await dialog.showSaveDialog(mainWindow, {
    title: isImage ? 'Save your drawing as' : 'Save your logic as',
    defaultPath: payload.suggestedName || (isImage ? 'Untitled.png' : 'Untitled.logic'),
    filters: isImage ? IMAGE_FILTERS : TEXT_FILTERS
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  if (isImage) {
    await fs.writeFile(result.filePath, imageBuffer(payload.dataUrl));
  } else {
    await fs.writeFile(result.filePath, payload.content, 'utf8');
  }
  return { path: result.filePath };
});

ipcMain.handle('file:read', async (_event, filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  return content;
});

ipcMain.handle('file:read-image', async (_event, filePath) => {
  if (typeof filePath !== 'string' || !isImagePath(filePath)) {
    return null;
  }
  const buffer = await fs.readFile(filePath);
  return {
    path: filePath,
    image: true,
    dataUrl: `data:image/png;base64,${buffer.toString('base64')}`
  };
});

ipcMain.handle('file:pick-link', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose the file to link to',
    properties: ['openFile'],
    filters: [
      { name: 'Logic files', extensions: ['logic'] },
      { name: 'All files', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (!isOpenablePath(filePath)) {
    return;
  }
  if (!mainWindow || mainWindow.isDestroyed()) {
    pendingOpenPaths.push(filePath);
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
  mainWindow.webContents.send('file:open-path', filePath);
});

app.whenReady().then(async () => {
  nativeTheme.themeSource = 'dark';
  collectStartupPaths(process.argv);

  createWindow();

  if (SHOW_SPLASH) {
    createSplashWindow();
    // A broken splash must never keep the app from opening.
    await withTimeout(splashReady, 3000).catch(() => {});
  }

  const restartingForUpdate = SHOW_SPLASH
    ? await installUpdateIfAvailable()
    : false;

  if (restartingForUpdate) {
    // If the installer could not take over, do not leave the user staring at
    // the splash forever.
    setTimeout(() => {
      closeApproved = false;
      revealApp();
    }, 20000);
    return;
  }

  await revealApp();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      revealApp();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
