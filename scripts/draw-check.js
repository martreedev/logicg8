// End-to-end check for draw mode. Runs the real main process (its IPC handlers
// and dialogs) so saving and opening PNGs is exercised through the same path
// the app uses. Run with: npx electron scripts/draw-check.js
const { app, BrowserWindow, dialog, nativeImage } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const tempRoot = path.join(process.env.TEMP || process.cwd(), 'opencode');

app.setPath('userData', path.join(tempRoot, 'mardraw-draw-userdata'));

require('../src/main.js');

function still(s) {
  return s.replace(/\r\n/g, '\n');
}

async function getWindow() {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    const [win] = BrowserWindow.getAllWindows();
    if (win && !win.webContents.isLoading()) {
      return win;
    }
    await wait(100);
  }
  throw new Error('The application window did not open.');
}

function pixelAt(image, x, y) {
  const size = image.getSize();
  const bitmap = image.getBitmap();
  const stride = bitmap.length / size.height;
  const offset = Math.round(y) * stride + Math.round(x) * 4;
  return { b: bitmap[offset], g: bitmap[offset + 1], r: bitmap[offset + 2], a: bitmap[offset + 3] };
}

// Near-white pixels are ink on the dark paper.
function countInk(image, region) {
  const size = image.getSize();
  const bitmap = image.getBitmap();
  const stride = bitmap.length / size.height;
  const left = Math.max(0, Math.round(region.x));
  const top = Math.max(0, Math.round(region.y));
  const right = Math.min(size.width, Math.round(region.x + region.w));
  const bottom = Math.min(size.height, Math.round(region.y + region.h));
  let ink = 0;
  const rows = [];
  for (let y = top; y < bottom; y += 1) {
    let rowInk = 0;
    for (let x = left; x < right; x += 1) {
      const offset = y * stride + x * 4;
      if (bitmap[offset + 2] > 220 && bitmap[offset + 1] > 220 && bitmap[offset] > 220) {
        rowInk += 1;
      }
    }
    if (rowInk > 0) {
      rows.push(y);
      ink += rowInk;
    }
  }
  let bands = 0;
  for (let index = 0; index < rows.length; index += 1) {
    if (index === 0 || rows[index] - rows[index - 1] > 1) {
      bands += 1;
    }
  }
  return { ink, bands };
}

async function run() {
  const dir = path.join(tempRoot, 'mardraw-draw-check');
  await fs.mkdir(dir, { recursive: true });

  // A mid-grey source image: white ink and the dark paper both stand out.
  const sourceWidth = 900;
  const sourceHeight = 600;
  const sourceBitmap = Buffer.alloc(sourceWidth * sourceHeight * 4);
  for (let index = 0; index < sourceBitmap.length; index += 4) {
    sourceBitmap[index] = 0x30;
    sourceBitmap[index + 1] = 0x30;
    sourceBitmap[index + 2] = 0x30;
    sourceBitmap[index + 3] = 0xff;
  }
  const sourcePath = path.join(dir, 'source.png');
  const sourceImage = nativeImage.createFromBitmap(sourceBitmap, { width: sourceWidth, height: sourceHeight });
  await fs.writeFile(sourcePath, sourceImage.toPNG());

  const notesPath = path.join(dir, 'notes.md');
  await fs.writeFile(notesPath, '# Notes\n\nPlain text still works.\n', 'utf8');

  const saveDialogs = [];
  dialog.showSaveDialog = async (_window, options) => {
    saveDialogs.push(options);
    return { canceled: false, filePath: path.join(dir, `untitled-${saveDialogs.length}.png`) };
  };

  const win = await getWindow();
  const failures = [];
  const report = {};

  win.webContents.send('file:open-path', sourcePath);
  await wait(900);

  const opened = await win.webContents.executeJavaScript(`
    (async () => {
      const canvas = document.getElementById('drawCanvas');
      const app = document.querySelector('.app');
      return {
        drawMode: app.classList.contains('is-draw-mode'),
        tabLabel: document.querySelector('.tab.is-active .tab-label')?.textContent || '',
        editorHidden: getComputedStyle(document.getElementById('editorFrame')).display === 'none',
        toolbarVisible: getComputedStyle(document.getElementById('drawToolbar')).display !== 'none',
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        scale: canvas.width / 900,
        textBoxes: document.querySelectorAll('.draw-textbox').length,
        paperBackground: getComputedStyle(document.getElementById('drawPaper')).backgroundColor
      };
    })()
  `);
  report.opened = opened;

  const drawn = await win.webContents.executeJavaScript(`
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const canvas = document.getElementById('drawCanvas');
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const sceneScale = canvas.width / 900;

      const point = (x, y) => ({
        clientX: rect.left + rect.width * x,
        clientY: rect.top + rect.height * y
      });
      const fire = (type, x, y, buttons) => canvas.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 9,
        pointerType: 'mouse',
        isPrimary: true,
        button: 0,
        buttons,
        ...point(x, y)
      }));

      const inkCount = () => {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let ink = 0;
        for (let index = 0; index < data.length; index += 4) {
          if (data[index] > 220 && data[index + 1] > 220 && data[index + 2] > 220) {
            ink += 1;
          }
        }
        return ink;
      };

      const background = ctx.getImageData(4, 4, 1, 1).data;
      const before = inkCount();

      // Pencil stroke.
      document.getElementById('drawPencil').click();
      fire('pointerdown', 0.08, 0.18, 1);
      fire('pointermove', 0.22, 0.16, 1);
      fire('pointermove', 0.36, 0.22, 1);
      fire('pointermove', 0.48, 0.18, 1);
      fire('pointerup', 0.48, 0.18, 0);
      await wait(60);
      const afterPencil = inkCount();

      // Straight line.
      document.getElementById('drawLine').click();
      const lineToolPressed = document.getElementById('drawLine').getAttribute('aria-pressed');
      fire('pointerdown', 0.08, 0.30, 1);
      fire('pointermove', 0.70, 0.30, 1);
      fire('pointerup', 0.70, 0.30, 0);
      await wait(60);
      const afterLine = inkCount();

      // Text box with the font size chosen before typing.
      document.getElementById('drawText').click();
      const font = document.getElementById('drawFontSize');
      font.value = '24';
      font.dispatchEvent(new Event('input', { bubbles: true }));
      const fontOutput = document.getElementById('drawFontSizeValue').textContent;

      fire('pointerdown', 0.2, 0.35, 1);
      fire('pointerup', 0.2, 0.35, 0);
      await wait(60);
      const boxes = [...document.querySelectorAll('.draw-textbox')];
      const boxEl = boxes[0];
      const body = boxEl.querySelector('.draw-textbox-body');
      body.focus();
      body.textContent = 'Wrap this sentence across lines';
      body.dispatchEvent(new Event('input', { bubbles: true }));

      boxEl.style.width = '800px';
      boxEl.style.height = '170px';
      await wait(260);

      const boxRect = boxEl.getBoundingClientRect();
      const bodyLineTops = () => {
        const range = document.createRange();
        range.selectNodeContents(body);
        const tops = new Set();
        for (const rect of range.getClientRects()) {
          if (rect.height > 0) tops.add(Math.round(rect.top));
        }
        return tops.size;
      };
      const boxInfo = {
        left: parseFloat(boxEl.style.left),
        top: parseFloat(boxEl.style.top),
        width: boxEl.offsetWidth,
        height: boxEl.offsetHeight,
        fontSize: parseFloat(getComputedStyle(boxEl).fontSize),
        text: body.innerText,
        sceneScale,
        borderWidth: getComputedStyle(boxEl).borderWidth,
        lines: bodyLineTops()
      };

      // Tab round trip: leave to the text tab and come back.
      const tabs = [...document.querySelectorAll('.tab')];
      tabs[0].click();
      await wait(200);
      const leftDrawMode = document.querySelector('.app').classList.contains('is-draw-mode');
      tabs[1].click();
      await wait(250);
      const backDrawMode = document.querySelector('.app').classList.contains('is-draw-mode');
      const keptInk = inkCount();
      const keptBoxes = document.querySelectorAll('.draw-textbox').length;
      const keptText = document.querySelector('.draw-textbox-body')?.innerText || '';

      return {
        background: [background[0], background[1], background[2]],
        before,
        afterPencil,
        afterLine,
        lineToolPressed,
        fontOutput,
        boxes: boxes.length,
        boxInfo,
        leftDrawMode,
        backDrawMode,
        keptInk,
        keptBoxes,
        keptText,
        boxRect: { width: Math.round(boxRect.width), height: Math.round(boxRect.height) }
      };
    })()
  `);
  report.drawn = drawn;

  // Save through the real IPC handler: the tab already has a path.
  await win.webContents.executeJavaScript(`document.getElementById('saveButton').click()`);
  await wait(900);

  const savedBytes = await fs.readFile(sourcePath);
  const savedImage = nativeImage.createFromBuffer(savedBytes);
  const savedSize = savedImage.getSize();
  const savedScale = savedSize.width / 900;
  const textRegion = {
    x: drawn.boxInfo.left * savedScale,
    y: drawn.boxInfo.top * savedScale,
    w: drawn.boxInfo.width * savedScale,
    h: drawn.boxInfo.height * savedScale
  };
  const wideText = countInk(savedImage, textRegion);
  const pencilRegion = countInk(savedImage, { x: 60 * savedScale, y: 90 * savedScale, w: 420 * savedScale, h: 70 * savedScale });
  const lineRegion = countInk(savedImage, { x: 60 * savedScale, y: 170 * savedScale, w: 560 * savedScale, h: 30 * savedScale });
  const emptyRegion = countInk(savedImage, { x: 700 * savedScale, y: 500 * savedScale, w: 160 * savedScale, h: 80 * savedScale });

  report.saved = {
    signature: savedBytes.slice(0, 8).toString('hex'),
    bytes: savedBytes.length,
    width: savedSize.width,
    height: savedSize.height,
    scale: savedScale,
    wideText,
    pencilRegion,
    lineRegion,
    emptyRegion,
    cornerPixel: pixelAt(savedImage, 2, 2),
    tabLabel: await win.webContents.executeJavaScript(`document.querySelector('.tab.is-active .tab-label')?.textContent || ''`)
  };

  // Narrow the box and save again: the text on disk must re-wrap.
  const narrowed = await win.webContents.executeJavaScript(`
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const el = document.querySelector('.draw-textbox');
      const body = el.querySelector('.draw-textbox-body');
      const before = { width: el.offsetWidth, height: el.offsetHeight };
      el.style.width = '150px';
      el.style.height = '230px';
      await wait(260);
      const range = document.createRange();
      range.selectNodeContents(body);
      const tops = new Set();
      for (const rect of range.getClientRects()) {
        if (rect.height > 0) tops.add(Math.round(rect.top));
      }
      return { before, after: { width: el.offsetWidth, height: el.offsetHeight }, lines: tops.size };
    })()
  `);
  await win.webContents.executeJavaScript(`document.getElementById('saveButton').click()`);
  await wait(900);

  const narrowBytes = await fs.readFile(sourcePath);
  const narrowImage = nativeImage.createFromBuffer(narrowBytes);
  const narrowText = countInk(narrowImage, {
    x: drawn.boxInfo.left * savedScale,
    y: drawn.boxInfo.top * savedScale,
    w: 150 * savedScale,
    h: 230 * savedScale
  });
  report.narrowed = {
    before: narrowed.before,
    after: narrowed.after,
    lines: narrowed.lines,
    textInk: narrowText.ink,
    textBands: narrowText.bands,
    wideTextBands: wideText.bands
  };

  // Re-open the saved PNG as a new tab.
  const reopenPath = path.join(dir, 'reopened.png');
  await fs.writeFile(reopenPath, narrowBytes);
  const tabsBeforeReopen = await win.webContents.executeJavaScript(`document.querySelectorAll('.tab').length`);
  win.webContents.send('file:open-path', reopenPath);
  await wait(900);
  const reopened = await win.webContents.executeJavaScript(`
    (async () => {
      const canvas = document.getElementById('drawCanvas');
      const ctx = canvas.getContext('2d');
      const pixel = ctx.getImageData(6, 6, 1, 1).data;
      const rect = canvas.getBoundingClientRect();
      const inkCount = () => {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let ink = 0;
        for (let index = 0; index < data.length; index += 4) {
          if (data[index] > 220 && data[index + 1] > 220 && data[index + 2] > 220) ink += 1;
        }
        return ink;
      };
      const inkBefore = inkCount();
      document.getElementById('drawPencil').click();
      canvas.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, cancelable: true, pointerId: 11, pointerType: 'mouse', isPrimary: true,
        button: 0, buttons: 1,
        clientX: rect.left + 40, clientY: rect.top + rect.height - 40
      }));
      canvas.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, cancelable: true, pointerId: 11, pointerType: 'mouse', isPrimary: true,
        button: 0, buttons: 1,
        clientX: rect.left + 200, clientY: rect.top + rect.height - 60
      }));
      canvas.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, cancelable: true, pointerId: 11, pointerType: 'mouse', isPrimary: true,
        button: 0, buttons: 0,
        clientX: rect.left + 200, clientY: rect.top + rect.height - 60
      }));
      await new Promise((resolve) => setTimeout(resolve, 120));
      return {
        tabs: document.querySelectorAll('.tab').length,
        tabLabel: document.querySelector('.tab.is-active .tab-label')?.textContent || '',
        width: canvas.width,
        height: canvas.height,
        pixel: [pixel[0], pixel[1], pixel[2]],
        inkBefore,
        inkAfter: inkCount(),
        textBoxes: document.querySelectorAll('.draw-textbox').length
      };
    })()
  `);
  report.reopened = { tabsBeforeReopen, ...reopened };

  // A brand new drawing saves through the Save dialog as a PNG.
  const newDrawing = await win.webContents.executeJavaScript(`
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      document.getElementById('drawTrigger').click();
      await wait(300);
      const canvas = document.getElementById('drawCanvas');
      const rect = canvas.getBoundingClientRect();
      document.getElementById('drawPencil').click();
      const fire = (type, x, y, buttons) => canvas.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId: 13, pointerType: 'mouse', isPrimary: true,
        button: 0, buttons,
        clientX: rect.left + rect.width * x, clientY: rect.top + rect.height * y
      }));
      fire('pointerdown', 0.1, 0.1, 1);
      fire('pointermove', 0.5, 0.5, 1);
      fire('pointerup', 0.5, 0.5, 0);
      await wait(120);
      return {
        tabLabel: document.querySelector('.tab.is-active .tab-label')?.textContent || '',
        drawMode: document.querySelector('.app').classList.contains('is-draw-mode'),
        dirty: document.querySelector('.tab.is-active')?.classList.contains('is-dirty'),
        width: canvas.width,
        height: canvas.height
      };
    })()
  `);
  await win.webContents.executeJavaScript(`document.getElementById('saveButton').click()`);
  await wait(900);
  const newFilePath = path.join(dir, 'untitled-1.png');
  const newFileBytes = await fs.readFile(newFilePath);
  const newFileImage = nativeImage.createFromBuffer(newFileBytes);
  const newFileSize = newFileImage.getSize();
  const newDrawingSavedTab = await win.webContents.executeJavaScript(
    `document.querySelector('.tab.is-active .tab-label')?.textContent || ''`
  );
  report.newDrawing = {
    ...newDrawing,
    labelBeforeSave: newDrawing.tabLabel,
    dirtyBeforeSave: newDrawing.dirty,
    saveDialogTitle: saveDialogs[0] && saveDialogs[0].title,
    saveDialogFilter: saveDialogs[0] && saveDialogs[0].filters && saveDialogs[0].filters[0] && saveDialogs[0].filters[0].name,
    defaultPath: saveDialogs[0] && saveDialogs[0].defaultPath,
    signature: newFileBytes.slice(0, 8).toString('hex'),
    width: newFileSize.width,
    height: newFileSize.height,
    ink: countInk(newFileImage, { x: 0, y: 0, w: newFileSize.width, h: newFileSize.height }).ink,
    tabLabel: newDrawingSavedTab,
    dirtyAfterSave: await win.webContents.executeJavaScript(
      `document.querySelector('.tab.is-active')?.classList.contains('is-dirty')`
    )
  };

  // Undo and redo through the real keyboard path: the saved PNG must lose the
  // stroke, then get it back.
  const undoState = await win.webContents.executeJavaScript(`
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const press = (key, options = {}) => document.dispatchEvent(new KeyboardEvent('keydown', {
        key, bubbles: true, cancelable: true, ...options
      }));
      const canvas = document.getElementById('drawCanvas');
      canvas.focus();
      const undo = document.getElementById('drawUndo');
      const redo = document.getElementById('drawRedo');
      const initial = { undoDisabled: undo.disabled, redoDisabled: redo.disabled };
      press('z', { ctrlKey: true });
      await wait(220);
      return {
        initial,
        afterUndo: { undoDisabled: undo.disabled, redoDisabled: redo.disabled },
        width: canvas.width,
        height: canvas.height
      };
    })()
  `);
  await win.webContents.executeJavaScript(`document.getElementById('saveButton').click()`);
  await wait(900);
  const undoneBytes = await fs.readFile(newFilePath);
  const undoneImage = nativeImage.createFromBuffer(undoneBytes);
  const undoneSize = undoneImage.getSize();
  const undoneInk = countInk(undoneImage, {
    x: 0,
    y: 0,
    w: undoneSize.width,
    h: undoneSize.height
  }).ink;

  const redoState = await win.webContents.executeJavaScript(`
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const press = (key, options = {}) => document.dispatchEvent(new KeyboardEvent('keydown', {
        key, bubbles: true, cancelable: true, ...options
      }));
      const undo = document.getElementById('drawUndo');
      const redo = document.getElementById('drawRedo');
      press('z', { ctrlKey: true, shiftKey: true });
      await wait(220);
      return { afterRedo: { undoDisabled: undo.disabled, redoDisabled: redo.disabled } };
    })()
  `);
  await win.webContents.executeJavaScript(`document.getElementById('saveButton').click()`);
  await wait(900);
  const redoneBytes = await fs.readFile(newFilePath);
  const redoneImage = nativeImage.createFromBuffer(redoneBytes);
  const redoneSize = redoneImage.getSize();
  const redoneInk = countInk(redoneImage, {
    x: 0,
    y: 0,
    w: redoneSize.width,
    h: redoneSize.height
  }).ink;

  report.undoRedo = {
    ...undoState,
    ...redoState,
    undoneInk,
    redoneInk,
    undoneCorner: pixelAt(undoneImage, 2, 2),
    redoneCorner: pixelAt(redoneImage, 2, 2)
  };

  // Undo inside a text box removes the box; redo brings it back with its text.
  // A save in between proves the undo stopped at the box and left the earlier
  // stroke alone.
  const boxUndo = await win.webContents.executeJavaScript(`
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const press = (target, key, options = {}) => target.dispatchEvent(new KeyboardEvent('keydown', {
        key, bubbles: true, cancelable: true, ...options
      }));
      document.getElementById('drawText').click();
      const canvas = document.getElementById('drawCanvas');
      const rect = canvas.getBoundingClientRect();
      const fire = (type, x, y, buttons) => canvas.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId: 15, pointerType: 'mouse', isPrimary: true,
        button: 0, buttons,
        clientX: rect.left + rect.width * x, clientY: rect.top + rect.height * y
      }));
      fire('pointerdown', 0.14, 0.42, 1);
      fire('pointerup', 0.14, 0.42, 0);
      await wait(120);

      const box = document.querySelector('.draw-textbox');
      const body = box.querySelector('.draw-textbox-body');
      body.focus();
      body.textContent = 'Undo this text';
      body.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(120);

      const boxesBefore = document.querySelectorAll('.draw-textbox').length;
      const undo = document.getElementById('drawUndo');
      const redo = document.getElementById('drawRedo');
      press(body, 'z', { ctrlKey: true });
      await wait(250);

      return {
        boxesBefore,
        boxesAfterUndo: document.querySelectorAll('.draw-textbox').length,
        redoEnabledAfterUndo: !redo.disabled,
        undoDisabledAfterUndo: undo.disabled,
        canvasSize: [canvas.width, canvas.height]
      };
    })()
  `);
  await win.webContents.executeJavaScript(`document.getElementById('saveButton').click()`);
  await wait(900);
  const boxUndoBytes = await fs.readFile(newFilePath);
  const boxUndoImage = nativeImage.createFromBuffer(boxUndoBytes);
  const boxUndoSize = boxUndoImage.getSize();
  const boxUndoScale = boxUndoSize.width / Math.max(1, boxUndo.canvasSize[0]);
  const afterBoxUndoInk = countInk(boxUndoImage, {
    x: 0,
    y: 0,
    w: boxUndoSize.width,
    h: boxUndoSize.height
  }).ink;

  const boxRedo = await win.webContents.executeJavaScript(`
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const press = (target, key, options = {}) => target.dispatchEvent(new KeyboardEvent('keydown', {
        key, bubbles: true, cancelable: true, ...options
      }));
      const canvas = document.getElementById('drawCanvas');
      press(document, 'y', { ctrlKey: true });
      await wait(250);
      const box = document.querySelector('.draw-textbox');
      const body = box && box.querySelector('.draw-textbox-body');
      const undo = document.getElementById('drawUndo');
      const redo = document.getElementById('drawRedo');
      return {
        boxesAfterRedo: document.querySelectorAll('.draw-textbox').length,
        textAfterRedo: body ? body.innerText : '',
        undoEnabled: !undo.disabled,
        redoDisabled: redo.disabled,
        canvasSize: [canvas.width, canvas.height],
        boxInfo: box ? {
          left: parseFloat(box.style.left),
          top: parseFloat(box.style.top),
          width: box.offsetWidth,
          height: box.offsetHeight,
          fontSize: parseFloat(getComputedStyle(box).fontSize)
        } : null
      };
    })()
  `);
  await win.webContents.executeJavaScript(`document.getElementById('saveButton').click()`);
  await wait(900);
  const boxRedoBytes = await fs.readFile(newFilePath);
  const boxRedoImage = nativeImage.createFromBuffer(boxRedoBytes);
  const boxRedoSize = boxRedoImage.getSize();
  const boxRedoScale = boxRedoSize.width / Math.max(1, boxRedo.canvasSize[0]);
  const boxRedoText = boxRedo.boxInfo
    ? countInk(boxRedoImage, {
        x: boxRedo.boxInfo.left * boxRedoScale,
        y: boxRedo.boxInfo.top * boxRedoScale,
        w: boxRedo.boxInfo.width * boxRedoScale,
        h: boxRedo.boxInfo.height * boxRedoScale
      })
    : { ink: 0, bands: 0 };
  report.boxUndo = {
    ...boxUndo,
    ...boxRedo,
    afterUndoInk: afterBoxUndoInk,
    savedText: boxRedoText,
    savedWidth: boxRedoSize.width,
    savedHeight: boxRedoSize.height,
    savedScale: boxRedoScale
  };

  // A relative link to a PNG in the Markdown preview opens draw mode.
  const linkedDir = path.join(dir, 'links');
  await fs.mkdir(linkedDir, { recursive: true });
  const linkedPngPath = path.join(linkedDir, 'linked.png');
  await fs.writeFile(linkedPngPath, narrowBytes);
  const linkDocPath = path.join(linkedDir, 'links.md');
  await fs.writeFile(linkDocPath, '# Links\n\n[sketch](linked.png)\n', 'utf8');
  win.webContents.send('file:open-path', linkDocPath);
  await wait(800);
  const linkedTab = await win.webContents.executeJavaScript(`
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const view = document.getElementById('markdownView');
      const anchor = [...view.querySelectorAll('a')].find((link) => link.getAttribute('href') === 'linked.png');
      const hasAnchor = Boolean(anchor);
      anchor?.click();
      await wait(900);
      const canvas = document.getElementById('drawCanvas');
      return {
        hasAnchor,
        drawMode: document.querySelector('.app').classList.contains('is-draw-mode'),
        tabLabel: document.querySelector('.tab.is-active .tab-label')?.textContent || '',
        canvasSize: [canvas.width, canvas.height]
      };
    })()
  `);
  report.linkedTab = linkedTab;

  // Text files still open and save as text.
  win.webContents.send('file:open-path', notesPath);
  await wait(800);
  const textTab = await win.webContents.executeJavaScript(`
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const editor = document.getElementById('editor');
      const before = {
        drawMode: document.querySelector('.app').classList.contains('is-draw-mode'),
        value: editor.value,
        tabLabel: document.querySelector('.tab.is-active .tab-label')?.textContent || '',
        previewVisible: getComputedStyle(document.getElementById('markdownView')).display !== 'none',
        heading: document.querySelector('.md-document h1')?.textContent || ''
      };
      editor.value = '# Edited\\n\\nSaved from the smoke check.\\n';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(80);
      return before;
    })()
  `);
  await win.webContents.executeJavaScript(`document.getElementById('saveButton').click()`);
  await wait(700);
  const notesAfterSave = still(await fs.readFile(notesPath, 'utf8'));

  report.textTab = { ...textTab, notesAfterSave };

  // Assertions ------------------------------------------------------------

  if (!opened.drawMode) failures.push('opening a PNG did not switch to draw mode');
  if (opened.tabLabel !== 'source.png') failures.push(`PNG tab label is "${opened.tabLabel}"`);
  if (!opened.editorHidden) failures.push('the text editor is still visible in draw mode');
  if (!opened.toolbarVisible) failures.push('the draw toolbar is hidden');
  if (opened.canvasWidth !== sourceWidth) failures.push(`canvas width is ${opened.canvasWidth}, expected ${sourceWidth}`);
  if (opened.canvasHeight !== sourceHeight) failures.push(`canvas height is ${opened.canvasHeight}, expected ${sourceHeight}`);
  if (opened.textBoxes !== 0) failures.push('a fresh drawing already has text boxes');
  if (opened.paperBackground !== 'rgb(0, 0, 0)') failures.push(`paper is "${opened.paperBackground}" instead of black`);

  if (drawn.background.some((channel) => channel !== 0x30)) failures.push('the opened PNG was not drawn onto the canvas');
  if (!(drawn.afterPencil > drawn.before + 50)) failures.push('the pencil did not leave light ink');
  if (!(drawn.afterLine > drawn.afterPencil + 50)) failures.push('the line tool did not draw a straight line');
  if (drawn.lineToolPressed !== 'true') failures.push('the line tool button is not active');
  if (drawn.fontOutput !== '24 px') failures.push(`font size readout is "${drawn.fontOutput}"`);
  if (drawn.boxes !== 1) failures.push(`expected one text box, found ${drawn.boxes}`);
  if (drawn.boxInfo.fontSize !== 24) failures.push(`text box font size is ${drawn.boxInfo.fontSize}px`);
  if (drawn.boxInfo.text.trim() !== 'Wrap this sentence across lines') failures.push('typed text is missing from the text box');
  if (drawn.boxInfo.width !== 800) failures.push(`resized text box is ${drawn.boxInfo.width}px wide`);
  if (drawn.leftDrawMode) failures.push('switching to a text tab kept draw mode on');
  if (!drawn.backDrawMode) failures.push('switching back did not restore draw mode');
  if (!(drawn.keptInk > drawn.before + 100)) failures.push('the drawing was lost after a tab round trip');
  if (drawn.keptBoxes !== 1 || drawn.keptText.trim() !== 'Wrap this sentence across lines') failures.push('the text box was lost after a tab round trip');

  if (report.saved.signature !== '89504e470d0a1a0a') failures.push('the saved file is not a PNG');
  if (report.saved.width !== sourceWidth || report.saved.height !== sourceHeight) failures.push(`saved PNG is ${report.saved.width}x${report.saved.height}`);
  if (!(report.saved.pencilRegion.ink > 50)) failures.push('the pencil stroke is missing from the saved PNG');
  if (!(report.saved.lineRegion.ink > 50)) failures.push('the straight line is missing from the saved PNG');
  if (!(report.saved.wideText.ink > 100)) failures.push('the text was not rasterized into the saved PNG');
  if (report.saved.wideText.bands !== 1) failures.push(`text at 800px wrapped onto ${report.saved.wideText.bands} lines`);
  if (report.saved.wideText.bands !== drawn.boxInfo.lines) failures.push(`the PNG has ${report.saved.wideText.bands} text lines but the box shows ${drawn.boxInfo.lines}`);
  if (report.saved.emptyRegion.ink !== 0) failures.push('ink leaked into an empty part of the PNG');
  if (report.saved.tabLabel !== 'source.png') failures.push(`the tab label changed after saving: ${report.saved.tabLabel}`);

  if (!(report.narrowed.textBands >= 3)) failures.push(`narrowing the box did not re-wrap the text (${report.narrowed.textBands} lines)`);
  if (report.narrowed.textBands !== report.narrowed.lines) failures.push(`the PNG has ${report.narrowed.textBands} lines but the box shows ${report.narrowed.lines}`);
  if (!(report.narrowed.textInk > report.saved.wideText.ink / 2)) failures.push('narrow text was mostly lost');

  if (report.reopened.tabs !== report.reopened.tabsBeforeReopen + 1) failures.push('opening a saved PNG did not add a tab');
  if (report.reopened.tabLabel !== 'reopened.png') failures.push(`reopened tab label is "${report.reopened.tabLabel}"`);
  if (report.reopened.width !== savedSize.width || report.reopened.height !== savedSize.height) failures.push('the reopened PNG has the wrong size');
  if (report.reopened.pixel.some((channel) => channel !== 0x30)) failures.push('the reopened PNG pixels are wrong');
  if (!(report.reopened.inkAfter > report.reopened.inkBefore + 20)) failures.push('drawing on the reopened PNG did not work');
  if (report.reopened.textBoxes !== 0) failures.push('reopening a PNG carried over text boxes');

  if (!newDrawing.drawMode) failures.push('the draw mode button did not open a drawing');
  if (report.newDrawing.labelBeforeSave !== 'Drawing') failures.push(`new drawing tab label is "${report.newDrawing.labelBeforeSave}"`);
  if (!report.newDrawing.dirtyBeforeSave) failures.push('drawing did not mark the tab as changed');
  if (report.newDrawing.signature !== '89504e470d0a1a0a') failures.push('a new drawing did not save as a PNG');
  if (report.newDrawing.saveDialogFilter !== 'PNG image') failures.push(`new drawing save filter is "${report.newDrawing.saveDialogFilter}"`);
  if (!/\.png$/.test(report.newDrawing.defaultPath || '')) failures.push('the drawing save dialog did not suggest a .png');
  if (!(report.newDrawing.ink > 20)) failures.push('a new drawing saved without ink');
  if (report.newDrawing.tabLabel !== 'untitled-1.png') failures.push(`saved drawing tab label is "${report.newDrawing.tabLabel}"`);
  if (report.newDrawing.dirtyAfterSave) failures.push('a saved drawing is still marked as changed');

  if (!report.undoRedo.afterUndo.undoDisabled) failures.push('undo stays enabled after undoing everything');
  if (report.undoRedo.afterUndo.redoDisabled) failures.push('redo is still disabled after undoing');
  if (report.undoRedo.undoneInk !== 0) failures.push('undo left ink in the saved PNG');
  if (report.undoRedo.undoneCorner.r !== 0 || report.undoRedo.undoneCorner.g !== 0 || report.undoRedo.undoneCorner.b !== 0) {
    failures.push('an undone drawing is not saved on a black page');
  }
  if (report.undoRedo.afterRedo.redoDisabled !== true) failures.push('redo is still enabled after redoing');
  if (report.undoRedo.afterRedo.undoDisabled) failures.push('undo is disabled after redoing');
  if (!(report.undoRedo.redoneInk > 20)) failures.push('redo did not bring the stroke back into the saved PNG');
  if (report.undoRedo.redoneCorner.r !== 0 || report.undoRedo.redoneCorner.g !== 0 || report.undoRedo.redoneCorner.b !== 0) {
    failures.push('a redone drawing is not saved on a black page');
  }

  if (report.boxUndo.boxesBefore !== 1) failures.push('the text box was not created before the undo test');
  if (report.boxUndo.boxesAfterUndo !== 0) failures.push('Ctrl+Z inside a text box did not remove it');
  if (!(report.boxUndo.afterUndoInk > 20)) failures.push('undoing a text box also removed the earlier stroke');
  if (!report.boxUndo.redoEnabledAfterUndo) failures.push('redo is disabled after undoing a text box');
  if (report.boxUndo.boxesAfterRedo !== 1) failures.push('Ctrl+Y did not restore the text box');
  if (!report.boxUndo.textAfterRedo.includes('Undo this text')) failures.push('redo lost the text box contents');
  if (!report.boxUndo.undoEnabled) failures.push('undo is disabled after redoing a text box');
  if (!report.boxUndo.redoDisabled) failures.push('redo is still enabled after redoing the text box');
  if (!(report.boxUndo.savedText.ink > 50)) failures.push('the redone text box was not rasterized into the saved PNG');

  if (!linkedTab.hasAnchor) failures.push('the relative PNG link is missing from the preview');
  if (!linkedTab.drawMode) failures.push('a relative PNG link did not open draw mode');
  if (linkedTab.tabLabel !== 'linked.png') failures.push(`linked PNG tab label is "${linkedTab.tabLabel}"`);
  if (linkedTab.canvasSize[0] !== savedSize.width || linkedTab.canvasSize[1] !== savedSize.height) failures.push('the linked PNG opened at the wrong size');

  if (textTab.drawMode) failures.push('a Markdown file opened in draw mode');
  if (!textTab.previewVisible) failures.push('the Markdown preview is hidden');
  if (!textTab.value.startsWith('# Notes')) failures.push('the Markdown file did not open');
  if (textTab.heading !== 'Notes') failures.push('the Markdown preview did not render');
  if (notesAfterSave !== '# Edited\n\nSaved from the smoke check.\n') failures.push('saving a Markdown file no longer writes text');

  console.log(JSON.stringify({ report, failures }, null, 2));
  await win.close();
  app.exit(failures.length ? 1 : 0);
}

app.whenReady().then(() => {
  run().catch((error) => {
    console.error(error);
    console.log(JSON.stringify({ fatal: error.stack, failures: ['harness crashed'] }, null, 2));
    app.exit(1);
  });
});
