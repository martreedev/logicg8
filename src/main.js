const { app, BrowserWindow, ipcMain, dialog, nativeTheme, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

let mainWindow;
const pendingOpenPaths = [];

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

function createWindow() {
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

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // A file dropped outside the renderer's handlers would otherwise navigate the
  // window to file:// and replace the editor. The app never navigates.
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

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

app.whenReady().then(() => {
  nativeTheme.themeSource = 'dark';
  collectStartupPaths(process.argv);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
