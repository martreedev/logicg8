const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const consoleErrors = [];

// Near-white pixels are ink on the dark paper.
function measureInk(image, region) {
  const size = image.getSize();
  const bitmap = image.toBitmap();
  const stride = bitmap.length / Math.max(1, size.height);
  const left = Math.max(0, Math.round(region.x));
  const top = Math.max(0, Math.round(region.y));
  const right = Math.min(size.width, Math.round(region.x + region.w));
  const bottom = Math.min(size.height, Math.round(region.y + region.h));
  let ink = 0;
  const rows = new Set();
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const offset = y * stride + x * 4;
      if (bitmap[offset] > 220 && bitmap[offset + 1] > 220 && bitmap[offset + 2] > 220) {
        ink += 1;
        rows.add(y);
      }
    }
  }
  return { ink, rows: rows.size };
}

function pixelAt(image, x, y) {
  const size = image.getSize();
  const bitmap = image.toBitmap();
  const stride = bitmap.length / Math.max(1, size.height);
  const offset = Math.round(y) * stride + Math.round(x) * 4;
  return { b: bitmap[offset], g: bitmap[offset + 1], r: bitmap[offset + 2], a: bitmap[offset + 3] };
}

app.setPath('userData', path.join(process.env.TEMP || process.cwd(), 'opencode', 'mardraw-smoke-userdata'));

async function run() {
  const markdownDir = path.join(process.env.TEMP || process.cwd(), 'opencode', 'mardraw-md-smoke');
  await fs.mkdir(markdownDir, { recursive: true });
  const notesPath = path.join(markdownDir, 'notes.md');
  const refPath = path.join(markdownDir, 'ref.md');
  const drawDir = path.join(process.env.TEMP || process.cwd(), 'opencode', 'mardraw-draw-smoke');
  await fs.mkdir(drawDir, { recursive: true });
  const drawPngPath = path.join(drawDir, 'sketch.png');

  // A mid-grey 400x300 image, so white ink and the dark paper both stand out.
  const drawBitmap = Buffer.alloc(400 * 300 * 4);
  for (let index = 0; index < drawBitmap.length; index += 4) {
    drawBitmap[index] = 0x30;
    drawBitmap[index + 1] = 0x30;
    drawBitmap[index + 2] = 0x30;
    drawBitmap[index + 3] = 0xff;
  }
  await fs.writeFile(drawPngPath, nativeImage.createFromBitmap(drawBitmap, { width: 400, height: 300 }).toPNG());

  const filler = [];
  for (let index = 0; index < 14; index += 1) {
    filler.push(`Filler paragraph ${index + 1} keeps the page long enough to scroll while checking anchor navigation.`);
    filler.push('');
  }

  const notesSource = [
    '# Markdown notes',
    '',
    'A **bold** word, an *italic* word, `inline code`, and a [relative link](ref.md).',
    '',
    '![local pixel](pixel.png)',
    '',
    '## Lists',
    '',
    '- First item',
    '- Second item',
    '  - Nested item',
    '- [x] Finished task',
    '- [ ] Pending task',
    '',
    '| Symbol | Meaning |',
    '| --- | --- |',
    '| ∧ | and |',
    '| ⇒ | implies |',
    '',
    '```js',
    "const arrow = 'A -> B';",
    '```',
    '',
    '> A quoted line of text.',
    '',
    'Literal _{x} and ^{y} markup must survive a round trip.',
    '',
    '### Second part',
    '',
    'Jump target.',
    '',
    '[Go to second part](#second-part)',
    '',
    ...filler,
    '## End',
    ''
  ].join('\n');

  const refSource = '# Referenced\n\nThis file sits next to notes.md.\n';

  await fs.writeFile(notesPath, notesSource, 'utf8');
  await fs.writeFile(refPath, refSource, 'utf8');
  await fs.writeFile(
    path.join(markdownDir, 'pixel.png'),
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64')
  );

  ipcMain.handle('file:open', async () => ({ path: notesPath, content: notesSource }));
  ipcMain.handle('file:take-pending', async () => null);
  ipcMain.handle('file:read', async (_event, filePath) => fs.readFile(filePath, 'utf8'));
  ipcMain.handle('file:open-relative', async (_event, payload) => {
    const target = path.resolve(path.dirname(payload.base), payload.href);
    const content = await fs.readFile(target, 'utf8');
    return { path: target, content };
  });
  ipcMain.handle('shell:open-external', async () => true);

  let savedPayload = null;
  ipcMain.handle('file:save', async (_event, payload) => {
    savedPayload = payload;
    return { path: payload.path || path.join(drawDir, 'saved-drawing.png') };
  });
  ipcMain.handle('file:save-as', async (_event, payload) => {
    savedPayload = payload;
    return { path: path.join(drawDir, 'saved-as.png') };
  });
  ipcMain.handle('file:read-image', async (_event, filePath) => {
    const buffer = await fs.readFile(filePath);
    return { path: filePath, image: true, dataUrl: `data:image/png;base64,${buffer.toString('base64')}` };
  });

  const window = new BrowserWindow({
    width: 1280,
    height: 830,
    backgroundColor: '#000000',
    show: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.webContents.on('console-message', (event) => {
    if (event.message.startsWith('[smoke]')) {
      console.log(event.message);
    }
    if (event.level === 'error' || event.level === 'warning') {
      consoleErrors.push(`${event.message} (${event.sourceId}:${event.lineNumber})`);
    }
  });

  window.webContents.on('preload-error', (_event, preloadPath, error) => {
    consoleErrors.push(`preload ${preloadPath}: ${error.message}`);
  });

  window.webContents.on('did-fail-load', (_event, code, description) => {
    consoleErrors.push(`load failed ${code}: ${description}`);
  });

  console.log('loading');
  await window.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  await wait(700);
  console.log('loaded');

  const result = await window.webContents.executeJavaScript(`
    (async () => {
      const editor = document.getElementById('editor');
      const sample = [
        'All men are mortal.',
        'Socrates is a man.',
        'Therefore, Socrates is mortal.',
        '',
        'if and only if iff and or not necessarily possible exists for all for every',
        'and both either implies then xor nand nor equivalent',
        'necessary necessarily possible possibly therefore thus hence entails models proves derives',
        'contradiction inconsistent tautology true false forall there exists for some every some',
        'x that exists inside of A and x inside of B and y such that y given that A',
        'Nested: (A ⇒ (B ∨ [C ∧ {D}])) and □ (P ⇒ Q)'
      ].join('\\n');

      editor.value = sample;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const tokens = [...document.querySelectorAll('.logic-token')].map((token) => token.textContent);
      console.log('[smoke] sample rendered');

      document.getElementById('logicTrigger').click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const dropdownVisible = !document.getElementById('logicPopover').hidden;
      const keywordRows = document.querySelectorAll('.keyword-row').length;
      const keywordCount = document.getElementById('keywordCount').textContent;
      console.log('[smoke] dropdown rendered');

      const testConversion = (word) => {
        editor.focus();
        editor.value = word;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.setSelectionRange(word.length, word.length);
        editor.dispatchEvent(new Event('select'));
        editor.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          shiftKey: true,
          bubbles: true,
          cancelable: true
        }));
        return editor.value;
      };

      const convertedAnd = testConversion('and');
      const convertedNecessary = testConversion('necessary');
      const convertedIff = testConversion('if and only if');
      const convertedThen = testConversion('then');
      const convertedForEvery = testConversion('for every');
      const convertedExistInside = testConversion('exist inside');
      const convertedThatExistsInsideOf = testConversion('that exists inside of');
      const convertedSuchThat = testConversion('such that');
      const convertedGivenThat = testConversion('given that');
      const convertedIf = testConversion('if');
      const convertedOnlyIf = testConversion('only if');
      console.log('[smoke] conversions', convertedAnd, convertedNecessary, convertedIff, convertedThen, convertedForEvery, convertedExistInside, convertedThatExistsInsideOf, convertedSuchThat, convertedGivenThat, convertedIf, convertedOnlyIf);

      editor.focus();
      editor.value = 'A -> B -> C';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      const arrowExpansion = editor.value;
      console.log('[smoke] arrow', arrowExpansion);

      editor.focus();
      editor.value = '';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.setSelectionRange(0, 0);
      editor.dispatchEvent(new KeyboardEvent('keydown', {
        key: '(',
        code: 'Digit9',
        shiftKey: true,
        bubbles: true,
        cancelable: true
      }));
      const firstPair = editor.value;
      const firstPairCursor = editor.selectionStart;
      console.log('[smoke] first pair', firstPair, firstPairCursor);

      editor.dispatchEvent(new KeyboardEvent('keydown', {
        key: '(',
        code: 'Digit9',
        shiftKey: true,
        bubbles: true,
        cancelable: true
      }));
      const nestedPair = editor.value;
      const nestedCursor = editor.selectionStart;
      const activeBrackets = document.querySelectorAll('.bracket-char.is-active').length;
      console.log('[smoke] nested', nestedPair, nestedCursor, activeBrackets);

      editor.dispatchEvent(new KeyboardEvent('keydown', {
        key: ')',
        code: 'Digit0',
        shiftKey: true,
        bubbles: true,
        cancelable: true
      }));
      const skippedCloser = editor.value;
      const skippedCursor = editor.selectionStart;
      console.log('[smoke] skipped', skippedCloser, skippedCursor);

      editor.value = 'word';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.setSelectionRange(0, 4);
      editor.dispatchEvent(new KeyboardEvent('keydown', {
        key: '[',
        code: 'BracketLeft',
        bubbles: true,
        cancelable: true
      }));
      const wrappedSelection = editor.value;
      const wrappedSelectionStart = editor.selectionStart;
      const wrappedSelectionEnd = editor.selectionEnd;
      console.log('[smoke] wrapped', wrappedSelection, wrappedSelectionStart, wrappedSelectionEnd);

      editor.value = '□';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const editorFontSize = parseFloat(getComputedStyle(editor).fontSize);
      const squareFontSize = parseFloat(getComputedStyle(document.querySelector('.modal-square')).fontSize);
      const squareButtons = document.querySelectorAll('.symbol-button.is-square').length;
      const keywordSquares = document.querySelectorAll('.keyword-symbol.is-square').length;
      console.log('[smoke] square', editorFontSize, squareFontSize, squareButtons, keywordSquares);

      editor.focus();
      const quickSizeBefore = parseFloat(getComputedStyle(editor).fontSize);
      document.getElementById('fontSizeUp').click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const quickSizeAfter = parseFloat(getComputedStyle(editor).fontSize);
      document.getElementById('fontSizeDown').click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      console.log('[smoke] quick size', quickSizeBefore, quickSizeAfter);

      const wheelBefore = parseFloat(getComputedStyle(editor).fontSize);
      editor.dispatchEvent(new WheelEvent('wheel', {
        deltaY: -100,
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      }));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const wheelAfter = parseFloat(getComputedStyle(editor).fontSize);
      editor.dispatchEvent(new WheelEvent('wheel', {
        deltaY: 100,
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      }));
      await new Promise((resolve) => requestAnimationFrame(resolve));

      editor.focus();
      editor.value = 'ne';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.setSelectionRange(2, 2);
      editor.dispatchEvent(new Event('select'));
      const ghostAfterNe = document.querySelector('.autocomplete-ghost')?.textContent || '';
      editor.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Tab',
        code: 'Tab',
        bubbles: true,
        cancelable: true
      }));
      const completedNe = editor.value;

      editor.value = 'for e';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.setSelectionRange(5, 5);
      editor.dispatchEvent(new Event('select'));
      const ghostAfterForE = document.querySelector('.autocomplete-ghost')?.textContent || '';
      editor.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Tab',
        code: 'Tab',
        bubbles: true,
        cancelable: true
      }));
      const completedForE = editor.value;
      console.log('[smoke] autocomplete', ghostAfterNe, completedNe, ghostAfterForE, completedForE);

      document.getElementById('shortcutTrigger').click();
      document.getElementById('shortcutSet').click();
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'F',
        code: 'KeyF',
        shiftKey: true,
        bubbles: true,
        cancelable: true
      }));
      const shortcutLabel = document.getElementById('shortcutValue').textContent;
      const shortcutStatus = document.getElementById('statusShortcutHint').textContent;
      const shortcutConfigured = editor.value;

      editor.focus();
      editor.value = 'and';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.setSelectionRange(3, 3);
      editor.dispatchEvent(new Event('select'));
      editor.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'F',
        code: 'KeyF',
        shiftKey: true,
        bubbles: true,
        cancelable: true
      }));
      const customShortcutConversion = editor.value;

      document.getElementById('shortcutReset').click();
      const resetShortcutLabel = document.getElementById('shortcutValue').textContent;
      document.getElementById('shortcutTrigger').click();
      console.log('[smoke] shortcut', shortcutLabel, shortcutStatus, customShortcutConversion, resetShortcutLabel);

      editor.focus();
      editor.value = '([wdawd])';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.setSelectionRange(8, 8);
      editor.dispatchEvent(new Event('select'));
      const bracketAtEnd = [...document.querySelectorAll('.bracket-char.is-active')].map((bracket) => bracket.textContent);
      console.log('[smoke] bracket-at-end', bracketAtEnd);

      editor.focus();
      editor.value = 'Socrates is mortal\\nand all men are mortal';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.setSelectionRange(5, 5);
      editor.dispatchEvent(new Event('select'));
      const lineOneTokensText = [...document.querySelectorAll('.logic-token.is-current-line')].map((token) => token.textContent);
      editor.setSelectionRange(editor.value.indexOf('and'), editor.value.indexOf('and') + 1);
      editor.dispatchEvent(new Event('select'));
      const lineTwoTokensText = [...document.querySelectorAll('.logic-token.is-current-line')].map((token) => token.textContent);
      console.log('[smoke] line-stroke', lineOneTokensText, lineTwoTokensText);

      editor.value = '∃x P(x)';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const existSpan = document.querySelector('.symbol-char[data-symbol="∃"]');
      const existRect = existSpan.getBoundingClientRect();
      editor.dispatchEvent(new MouseEvent('mousemove', {
        clientX: existRect.left + existRect.width / 2,
        clientY: existRect.top + existRect.height / 2,
        bubbles: true
      }));
      const tooltipHidden = document.getElementById('symbolTooltip').hidden;
      const tooltipTitle = document.getElementById('symbolTooltipTitle').textContent;
      console.log('[smoke] hover', tooltipHidden, tooltipTitle);
      editor.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

      editor.focus();
      editor.value = '';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.setSelectionRange(0, 0);
      editor.dispatchEvent(new Event('select'));
      const firstSymbol = document.querySelector('.symbol-button');
      firstSymbol.click();
      const paletteInsert = editor.value;
      console.log('[smoke] palette', paletteInsert);

      const tabsInitial = document.querySelectorAll('.tab').length;
      const backDisabledInitial = document.getElementById('backButton').disabled;
      document.getElementById('newButton').click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const tabsAfterNew = document.querySelectorAll('.tab').length;
      const activeTabsAfterNew = document.querySelectorAll('.tab.is-active').length;
      console.log('[smoke] tabs', tabsInitial, tabsAfterNew, activeTabsAfterNew, backDisabledInitial);

      editor.value = sample;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.setSelectionRange(sample.indexOf('necessarily') + 4, sample.indexOf('necessarily') + 4);
      document.getElementById('logicTrigger').click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      return {
        tokens: tokens.length,
        tokenSample: tokens.slice(0, 12),
        dropdownVisible,
        keywordRows,
        keywordCount,
        keywordNames: [...document.querySelectorAll('.keyword-name')].map((name) => name.textContent),
        convertedAnd,
        convertedNecessary,
        convertedIff,
        convertedThen,
        convertedForEvery,
        convertedExistInside,
        convertedThatExistsInsideOf,
        convertedSuchThat,
        convertedGivenThat,
        convertedIf,
        convertedOnlyIf,
        arrowExpansion,
        firstPair,
        firstPairCursor,
        nestedPair,
        nestedCursor,
        activeBrackets,
        skippedCloser,
        skippedCursor,
        wrappedSelection,
        wrappedSelectionStart,
        wrappedSelectionEnd,
        editorFontSize,
        squareFontSize,
        squareButtons,
        keywordSquares,
        quickSizeBefore,
        quickSizeAfter,
        wheelBefore,
        wheelAfter,
        ghostAfterNe,
        completedNe,
        ghostAfterForE,
        completedForE,
        shortcutLabel,
        shortcutStatus,
        customShortcutConversion,
        resetShortcutLabel,
        bracketAtEnd,
        lineOneTokensText,
        lineTwoTokensText,
        tooltipHidden,
        tooltipTitle,
        tabsInitial,
        tabsAfterNew,
        activeTabsAfterNew,
        backDisabledInitial,
        paletteInsert,
        symbolButtons: document.querySelectorAll('.symbol-button').length,
        hasDesktopApi: typeof window.mardraw?.openFile === 'function' && typeof window.mardraw?.saveFile === 'function',
        title: document.title
      };
    })()
  `);
  console.log('evaluated');

  await wait(500);

  const outputDir = path.join(process.env.TEMP || process.cwd(), 'opencode', 'mardraw-smoke');
  await fs.mkdir(outputDir, { recursive: true });

  const menuImage = await window.webContents.capturePage();
  await fs.writeFile(path.join(outputDir, 'menu.png'), menuImage.toPNG());
  console.log('menu captured');

  await window.webContents.executeJavaScript(`
    document.getElementById('logicTrigger').click();
    const editor = document.getElementById('editor');
    const bracketPosition = editor.value.indexOf('(') + 1;
    editor.focus();
    editor.setSelectionRange(bracketPosition, bracketPosition);
    editor.dispatchEvent(new Event('select', { bubbles: true }));
  `);
  await wait(350);

  const mainImage = await window.webContents.capturePage();
  await fs.writeFile(path.join(outputDir, 'main.png'), mainImage.toPNG());
  console.log('main captured');

  const settingsResult = await window.webContents.executeJavaScript(`
    (async () => {
      const editor = document.getElementById('editor');
      const highlight = document.getElementById('highlightContent');
      const size = document.getElementById('fontSize');
      const line = document.getElementById('lineHeight');

      size.value = '22';
      size.dispatchEvent(new Event('input', { bubbles: true }));
      line.value = '1.9';
      line.dispatchEvent(new Event('input', { bubbles: true }));

      const longText = 'All things that are mortal are things that must eventually die, and therefore every mortal being is necessarily finite: if Socrates is a man then Socrates is mortal, iff the argument is valid. '.repeat(5);

      editor.value = longText;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const editorStyle = getComputedStyle(editor);
      const highlightStyle = getComputedStyle(highlight);
      const range = document.createRange();
      range.selectNodeContents(highlight);
      const lineTops = new Set();
      for (const rect of range.getClientRects()) {
        if (rect.height > 0) lineTops.add(Math.round(rect.top));
      }

      editor.value = 'All men are mortal.';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const shortRange = document.createRange();
      shortRange.selectNodeContents(highlight);
      const shortTops = new Set();
      for (const rect of shortRange.getClientRects()) {
        if (rect.height > 0) shortTops.add(Math.round(rect.top));
      }

      editor.value = longText;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      return {
        fontSize: editorStyle.fontSize,
        highlightFontSize: highlightStyle.fontSize,
        lineHeight: editorStyle.lineHeight,
        wrapAttr: editor.getAttribute('wrap'),
        editorWhiteSpace: editorStyle.whiteSpace,
        highlightWhiteSpace: highlightStyle.whiteSpace,
        editorOverflow: editor.scrollWidth - editor.clientWidth,
        highlightOverflow: highlight.scrollWidth - highlight.clientWidth,
        visualLines: lineTops.size,
        shortLines: shortTops.size
      };
    })()
  `);

  window.setSize(820, 640);
  await wait(500);
  const wrapImage = await window.webContents.capturePage();
  await fs.writeFile(path.join(outputDir, 'wrap.png'), wrapImage.toPNG());
  console.log('wrap captured');

  window.setSize(1280, 830);
  await wait(400);

  const markdownResult = await window.webContents.executeJavaScript(`
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const appRoot = document.querySelector('.app');
      const editor = document.getElementById('editor');
      const toggle = document.getElementById('markdownToggle');
      const label = document.getElementById('markdownModeLabel');
      const view = document.getElementById('markdownView');
      const frame = document.getElementById('editorFrame');

      const size = document.getElementById('fontSize');
      size.value = '16';
      size.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(60);

      const tabsBefore = document.querySelectorAll('.tab').length;
      const toggleHiddenBefore = toggle.hidden;

      document.getElementById('openButton').click();
      await wait(450);

      const tabsAfterOpen = document.querySelectorAll('.tab').length;
      const activeTabLabel = document.querySelector('.tab.is-active .tab-label')?.textContent || '';
      const previewOn = appRoot.classList.contains('is-markdown-mode');
      const toggleHidden = toggle.hidden;
      const labelInPreview = label.textContent;
      const pressedInPreview = toggle.getAttribute('aria-pressed');
      const heading = document.querySelector('.md-document h1')?.textContent || '';
      const strongCount = document.querySelectorAll('.md-document strong').length;
      const listItems = document.querySelectorAll('.md-document li').length;
      const tasks = document.querySelectorAll('.md-document .md-task-item input[type="checkbox"]').length;
      const tables = document.querySelectorAll('.md-document table').length;
      const codeBlocks = document.querySelectorAll('.md-document pre.md-code').length;
      const rawValue = editor.value;
      const arrowKept = rawValue.includes("const arrow = 'A -> B';");
      const markupKept = rawValue.includes('_{x}') && rawValue.includes('^{y}');
      const imageElement = view.querySelector('.md-document img');
      const imageLoaded = Boolean(imageElement && imageElement.naturalWidth > 0);

      view.scrollTop = 0;
      const anchor = [...view.querySelectorAll('a')].find((link) => link.getAttribute('href') === '#second-part');
      anchor?.click();
      await wait(600);
      const scrolled = view.scrollTop;

      toggle.click();
      await wait(180);
      const previewOff = !appRoot.classList.contains('is-markdown-mode');
      const labelInRaw = label.textContent;
      const pressedInRaw = toggle.getAttribute('aria-pressed');
      const frameVisible = getComputedStyle(frame).display !== 'none';

      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'M',
        code: 'KeyM',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true
      }));
      await wait(180);
      const previewOnAgain = appRoot.classList.contains('is-markdown-mode');

      const local = [...view.querySelectorAll('a')].find((link) => link.getAttribute('href') === 'ref.md');
      local?.click();
      await wait(550);
      const tabsAfterLink = document.querySelectorAll('.tab').length;
      const linkedHeading = document.querySelector('.md-document h1')?.textContent || '';
      const linkedTabLabel = document.querySelector('.tab.is-active .tab-label')?.textContent || '';

      document.getElementById('backButton').click();
      await wait(550);
      const backLabel = document.querySelector('.tab.is-active .tab-label')?.textContent || '';
      const backPreview = appRoot.classList.contains('is-markdown-mode');
      view.scrollTop = 0;
      await wait(150);

      return {
        tabsBefore,
        toggleHiddenBefore,
        tabsAfterOpen,
        activeTabLabel,
        previewOn,
        toggleHidden,
        labelInPreview,
        pressedInPreview,
        heading,
        strongCount,
        listItems,
        tasks,
        tables,
        codeBlocks,
        arrowKept,
        markupKept,
        imageLoaded,
        scrolled,
        previewOff,
        labelInRaw,
        pressedInRaw,
        frameVisible,
        previewOnAgain,
        tabsAfterLink,
        linkedHeading,
        linkedTabLabel,
        backLabel,
        backPreview
      };
    })()
  `);

  await wait(400);
  const markdownImage = await window.webContents.capturePage();
  await fs.writeFile(path.join(outputDir, 'markdown.png'), markdownImage.toPNG());
  console.log('markdown captured');

  const findResult = await window.webContents.executeJavaScript(`
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const editor = document.getElementById('editor');
      const bar = document.getElementById('findBar');
      const input = document.getElementById('findInput');
      const count = document.getElementById('findCount');
      const view = document.getElementById('markdownView');
      const toggle = document.getElementById('markdownToggle');
      const caseButton = document.getElementById('findCase');
      const highlightSizes = () => {
        if (!window.CSS || !CSS.highlights) return { all: -1, current: -1 };
        return {
          all: CSS.highlights.get('logicg8-find')?.size || 0,
          current: CSS.highlights.get('logicg8-find-current')?.size || 0
        };
      };
      const press = (target, key, options = {}) => target.dispatchEvent(new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...options
      }));
      const type = (value) => {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };

      // Markdown preview search.
      view.focus();
      press(document, 'f', { ctrlKey: true });
      await wait(120);
      const barOpenInPreview = !bar.hidden;
      type('Markdown');
      await wait(150);
      const previewCount = count.textContent;
      const previewHighlights = highlightSizes();
      press(input, 'Escape');
      await wait(100);
      const previewClosed = bar.hidden;
      const previewCleared = highlightSizes();

      // Raw text search on a controlled document.
      toggle.click();
      await wait(200);
      editor.focus();
      editor.value = 'alpha beta ALPHA gamma alpha\\nsecond line alpha\\n';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.setSelectionRange(0, 0);
      press(document, 'f', { ctrlKey: true });
      await wait(120);
      const barOpenInRaw = !bar.hidden;
      const inputFocused = document.activeElement === input;
      type('alpha');
      await wait(150);
      const rawFirst = count.textContent;
      const rawFirstSelection = editor.value.slice(editor.selectionStart, editor.selectionEnd);
      const rawHighlights = highlightSizes();
      press(input, 'Enter');
      await wait(120);
      const rawNext = count.textContent;
      const rawNextSelection = editor.value.slice(editor.selectionStart, editor.selectionEnd);
      press(input, 'Enter', { shiftKey: true });
      await wait(120);
      const rawPrev = count.textContent;
      caseButton.click();
      await wait(120);
      const casePressed = caseButton.getAttribute('aria-pressed');
      const caseCount = count.textContent;
      caseButton.click();
      await wait(80);
      press(input, 'Escape');
      await wait(120);
      const rawClosed = bar.hidden;
      const rawFocus = document.activeElement === editor;
      const rawCleared = highlightSizes();
      press(editor, 'F3');
      await wait(120);
      const f3Reopened = !bar.hidden;
      const f3Count = count.textContent;
      press(document.getElementById('findInput'), 'Escape');
      await wait(100);

      return {
        barOpenInPreview,
        previewCount,
        previewHighlights,
        previewClosed,
        previewCleared,
        barOpenInRaw,
        inputFocused,
        rawFirst,
        rawFirstSelection,
        rawHighlights,
        rawNext,
        rawNextSelection,
        rawPrev,
        casePressed,
        caseCount,
        rawClosed,
        rawFocus,
        rawCleared,
        f3Reopened,
        f3Count
      };
    })()
  `);
  console.log('find checked');

  const drawResult = await window.webContents.executeJavaScript(`
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const appRoot = document.querySelector('.app');
      const canvas = document.getElementById('drawCanvas');

      const tabsBefore = document.querySelectorAll('.tab').length;
      document.getElementById('drawTrigger').click();
      await wait(300);

      const drawMode = appRoot.classList.contains('is-draw-mode');
      const tabLabel = document.querySelector('.tab.is-active .tab-label')?.textContent || '';
      const tabsAfter = document.querySelectorAll('.tab').length;
      const canvasSize = [canvas.width, canvas.height];
      const paperColor = getComputedStyle(document.getElementById('drawPaper')).backgroundColor;
      const editorHidden = getComputedStyle(document.getElementById('editorFrame')).display === 'none';
      const markdownToggleHidden = document.getElementById('markdownToggle').hidden;

      const rect = canvas.getBoundingClientRect();
      const fire = (type, x, y, buttons) => canvas.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId: 21, pointerType: 'mouse', isPrimary: true,
        button: 0, buttons,
        clientX: rect.left + rect.width * x, clientY: rect.top + rect.height * y
      }));
      const press = (key, options = {}) => document.dispatchEvent(new KeyboardEvent('keydown', {
        key, bubbles: true, cancelable: true, ...options
      }));

      const undoButton = document.getElementById('drawUndo');
      const redoButton = document.getElementById('drawRedo');
      const undoDisabledInitial = undoButton.disabled;
      const redoDisabledInitial = redoButton.disabled;
      const undoHidden = getComputedStyle(undoButton).display === 'none';

      fire('pointerdown', 0.06, 0.1, 1);
      fire('pointermove', 0.2, 0.14, 1);
      fire('pointermove', 0.34, 0.08, 1);
      fire('pointerup', 0.34, 0.08, 0);
      await wait(60);

      document.getElementById('drawLine').click();
      fire('pointerdown', 0.06, 0.24, 1);
      fire('pointermove', 0.44, 0.24, 1);
      fire('pointerup', 0.44, 0.24, 0);
      await wait(60);

      document.getElementById('drawText').click();
      const font = document.getElementById('drawFontSize');
      font.value = '32';
      font.dispatchEvent(new Event('input', { bubbles: true }));
      fire('pointerdown', 0.14, 0.36, 1);
      fire('pointerup', 0.14, 0.36, 0);
      await wait(80);

      let box = document.querySelector('.draw-textbox');
      let body = box.querySelector('.draw-textbox-body');
      body.focus();
      body.textContent = 'Rendered into the PNG';
      body.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(80);

      const undoEnabled = !undoButton.disabled;
      press('z', { ctrlKey: true });
      await wait(150);
      const boxesAfterUndo = document.querySelectorAll('.draw-textbox').length;
      press('z', { ctrlKey: true, shiftKey: true });
      await wait(150);
      const boxesAfterRedo = document.querySelectorAll('.draw-textbox').length;
      const textAfterRedo = document.querySelector('.draw-textbox-body')?.innerText || '';

      box = document.querySelector('.draw-textbox');
      body = box.querySelector('.draw-textbox-body');
      box.style.width = '420px';
      box.style.height = '120px';
      await wait(250);

      const boxInfo = {
        count: document.querySelectorAll('.draw-textbox').length,
        text: body.innerText,
        fontSize: parseFloat(getComputedStyle(box).fontSize),
        left: parseFloat(box.style.left),
        top: parseFloat(box.style.top),
        width: box.offsetWidth,
        height: box.offsetHeight
      };

      document.getElementById('saveButton').click();
      await wait(700);

      return {
        tabsBefore,
        tabsAfter,
        drawMode,
        tabLabel,
        canvasSize,
        paperColor,
        editorHidden,
        markdownToggleHidden,
        undoDisabledInitial,
        redoDisabledInitial,
        undoHidden,
        undoEnabled,
        boxesAfterUndo,
        boxesAfterRedo,
        textAfterRedo,
        undoEnabledAfterRedo: !undoButton.disabled,
        redoDisabledAfterRedo: redoButton.disabled,
        boxInfo,
        labelAfterSave: document.querySelector('.tab.is-active .tab-label')?.textContent || '',
        dirtyAfterSave: document.querySelector('.tab.is-active')?.classList.contains('is-dirty')
      };
    })()
  `);
  console.log('draw checked');

  const drawSave = savedPayload;
  const drawSaveBytes = drawSave && typeof drawSave.dataUrl === 'string'
    ? Buffer.from(drawSave.dataUrl.split(',')[1] || '', 'base64')
    : Buffer.alloc(0);
  const drawSaveImage = nativeImage.createFromBuffer(drawSaveBytes);
  const drawSaveSize = drawSaveImage.getSize();
  const drawInkScale = drawSaveSize.width / Math.max(1, drawResult.canvasSize[0]);
  const drawPencilInk = measureInk(drawSaveImage, {
    x: 60 * drawInkScale,
    y: 55 * drawInkScale,
    w: 450 * drawInkScale,
    h: 90 * drawInkScale
  });
  const drawLineInk = measureInk(drawSaveImage, {
    x: 60 * drawInkScale,
    y: 195 * drawInkScale,
    w: 600 * drawInkScale,
    h: 45 * drawInkScale
  });
  const drawBox = drawResult.boxInfo;
  const drawText = measureInk(drawSaveImage, {
    x: drawBox.left * drawInkScale,
    y: drawBox.top * drawInkScale,
    w: drawBox.width * drawInkScale,
    h: drawBox.height * drawInkScale
  });

  // Open the saved PNG back into the app and annotate it again.
  window.webContents.send('file:open-path', drawPngPath);
  await wait(700);
  savedPayload = null;

  const drawOpenResult = await window.webContents.executeJavaScript(`
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const appRoot = document.querySelector('.app');
      const canvas = document.getElementById('drawCanvas');
      document.getElementById('drawPencil').click();
      const rect = canvas.getBoundingClientRect();
      const fire = (type, x, y, buttons) => canvas.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId: 23, pointerType: 'mouse', isPrimary: true,
        button: 0, buttons,
        clientX: rect.left + rect.width * x, clientY: rect.top + rect.height * y
      }));
      fire('pointerdown', 0.1, 0.7, 1);
      fire('pointermove', 0.3, 0.66, 1);
      fire('pointerup', 0.3, 0.66, 0);
      await wait(100);
      const openedLabel = document.querySelector('.tab.is-active .tab-label')?.textContent || '';

      document.getElementById('saveButton').click();
      await wait(600);

      // Leave draw mode by switching to the first text tab.
      [...document.querySelectorAll('.tab')][0].click();
      await wait(250);

      return {
        tabLabel: openedLabel,
        canvasSize: [canvas.width, canvas.height],
        drawMode: appRoot.classList.contains('is-draw-mode'),
        editorVisible: getComputedStyle(document.getElementById('editorFrame')).display !== 'none'
      };
    })()
  `);
  console.log('draw open checked');

  const drawOpenSave = savedPayload;
  const drawOpenBytes = drawOpenSave && typeof drawOpenSave.dataUrl === 'string'
    ? Buffer.from(drawOpenSave.dataUrl.split(',')[1] || '', 'base64')
    : Buffer.alloc(0);
  const drawOpenImage = nativeImage.createFromBuffer(drawOpenBytes);
  const drawOpenSize = drawOpenImage.getSize();
  const drawOpenScale = drawOpenSize.width / Math.max(1, drawOpenResult.canvasSize[0]);
  const drawOpenInk = measureInk(drawOpenImage, {
    x: 20 * drawOpenScale,
    y: 175 * drawOpenScale,
    w: 140 * drawOpenScale,
    h: 60 * drawOpenScale
  });
  const drawOpenCorner = pixelAt(drawOpenImage, 4, 4);

  const failures = [];
  if (result.tokens < 30) failures.push('too few highlighted keywords');
  if (!result.dropdownVisible) failures.push('logic dropdown did not open');
  if (result.keywordRows < 45) failures.push('keyword list is incomplete');
  if (result.symbolButtons < 20) failures.push('symbol palette is incomplete');
  if (result.convertedAnd !== '∧') failures.push('and did not convert to ∧');
  if (result.convertedNecessary !== '□') failures.push('necessary did not convert to □');
  if (result.convertedIff !== '↔') failures.push('if and only if did not convert to ↔');
  if (result.convertedThen !== '⇒') failures.push('then did not convert to ⇒');
  if (result.convertedForEvery !== '∀') failures.push('for every did not convert to ∀');
  if (result.convertedExistInside !== '∈') failures.push('exist inside did not convert to ∈');
  if (result.convertedThatExistsInsideOf !== '∈') failures.push('that exists inside of did not convert to ∈');
  if (result.convertedSuchThat !== ':') failures.push('such that did not convert to :');
  if (result.convertedGivenThat !== ':') failures.push('given that did not convert to :');
  if (result.convertedIf !== 'if') failures.push('if still converts');
  if (result.convertedOnlyIf !== 'only if') failures.push('only if still converts');
  if (result.arrowExpansion !== 'A ⇒ B ⇒ C') failures.push('-> did not expand to ⇒');
  if (result.firstPair !== '()' || result.firstPairCursor !== 1) failures.push('parenthesis auto-pair failed');
  if (result.nestedPair !== '(())' || result.nestedCursor !== 2) failures.push('nested auto-pair failed');
  if (result.activeBrackets < 2) failures.push('active bracket pair was not highlighted');
  if (result.skippedCloser !== '(())' || result.skippedCursor !== 3) failures.push('closing bracket skip failed');
  if (result.wrappedSelection !== '[word]' || result.wrappedSelectionStart !== 1 || result.wrappedSelectionEnd !== 5) failures.push('bracket wrapping failed');
  if (result.squareFontSize - result.editorFontSize !== 4) failures.push('modal square is not 4px larger');
  if (result.squareButtons !== 1) failures.push('modal square palette button is not enlarged');
  if (result.keywordSquares !== 2) failures.push('modal square keyword rows are not enlarged');
  if (result.quickSizeAfter <= result.quickSizeBefore) failures.push('font size stepper did not change size');
  if (result.wheelAfter <= result.wheelBefore) failures.push('Ctrl+wheel did not increase font size');
  if (result.ghostAfterNe !== 'cessary') failures.push('autocomplete ghost for "ne" is wrong');
  if (result.completedNe !== 'necessary') failures.push('Tab did not complete "ne" to "necessary"');
  if (result.ghostAfterForE !== 'very') failures.push('autocomplete ghost for "for e" is wrong');
  if (result.completedForE !== 'for every') failures.push('Tab did not complete "for e" to "for every"');
  if (result.shortcutLabel !== 'Shift + F') failures.push('shortcut capture did not store Shift+F');
  if (!result.shortcutStatus.startsWith('Shift + F')) failures.push('status hint did not update for custom shortcut');
  if (result.customShortcutConversion !== '∧') failures.push('custom shortcut did not convert "and"');
  if (result.resetShortcutLabel !== 'Shift + Enter') failures.push('shortcut reset did not restore Shift+Enter');
  if (!result.bracketAtEnd.includes('[') || !result.bracketAtEnd.includes(']')) failures.push('cursor at bracket end did not highlight opening bracket');
  if (result.lineOneTokensText.length !== 0) failures.push('keyword stroke appears on a line without the cursor');
  if (result.lineTwoTokensText.length < 2) failures.push('keyword stroke missing on the cursor line');
  if (result.tooltipHidden !== false) failures.push('hover tooltip did not appear for ∃');
  if (!result.tooltipTitle.includes('existential quantifier')) failures.push('hover tooltip title is wrong for ∃');
  if (result.tabsAfterNew !== result.tabsInitial + 1) failures.push('new file did not open a new tab');
  if (result.activeTabsAfterNew !== 1) failures.push('exactly one tab should be active');
  if (result.backDisabledInitial !== true) failures.push('back button should start disabled');

  for (const keyword of ['then', 'for every', 'exist inside', 'that exists inside of', 'such that', 'given that']) {
    if (!result.keywordNames.includes(keyword)) failures.push(`missing keyword row: ${keyword}`);
  }
  if (result.keywordNames.includes('only if') || result.keywordNames.includes('if')) failures.push('removed keywords still listed');
  if (result.paletteInsert !== '∧') failures.push('symbol palette did not insert at cursor');
  if (!result.hasDesktopApi) failures.push('desktop file API is unavailable');
  if (settingsResult.fontSize !== '22px') failures.push('font size setting did not apply');
  if (settingsResult.highlightFontSize !== '22px') failures.push('highlight layer font size did not match');
  if (settingsResult.wrapAttr !== 'soft') failures.push('word wrap is not enabled on the textarea');
  if (settingsResult.editorWhiteSpace !== 'pre-wrap') failures.push('textarea does not soft-wrap long lines');
  if (settingsResult.highlightWhiteSpace !== 'pre-wrap') failures.push('highlight layer does not soft-wrap long lines');
  if (settingsResult.editorOverflow > 1) failures.push('textarea still overflows horizontally instead of wrapping');
  if (settingsResult.highlightOverflow > 1) failures.push('highlight layer still overflows horizontally');
  if (settingsResult.visualLines < 4) failures.push('long line did not wrap onto multiple visual lines');
  if (settingsResult.shortLines !== 1) failures.push('a line that fits was wrapped anyway');
  if (markdownResult.toggleHiddenBefore !== true) failures.push('markdown toggle should be hidden for logic files');
  if (markdownResult.tabsAfterOpen !== markdownResult.tabsBefore + 1) failures.push('opening a Markdown file did not add a tab');
  if (markdownResult.activeTabLabel !== 'notes.md') failures.push('Markdown file tab has the wrong label');
  if (!markdownResult.previewOn) failures.push('Markdown file did not open in the preview');
  if (markdownResult.toggleHidden !== false) failures.push('markdown toggle is hidden for a Markdown file');
  if (markdownResult.labelInPreview !== 'Markdown') failures.push('toggle label is wrong in preview mode');
  if (markdownResult.pressedInPreview !== 'true') failures.push('toggle state is wrong in preview mode');
  if (markdownResult.heading !== 'Markdown notes') failures.push('Markdown heading did not render');
  if (markdownResult.strongCount < 1) failures.push('bold text did not render');
  if (markdownResult.listItems < 5) failures.push('Markdown lists did not render');
  if (markdownResult.tasks !== 2) failures.push('task list checkboxes did not render');
  if (markdownResult.tables !== 1) failures.push('Markdown table did not render');
  if (markdownResult.codeBlocks < 1) failures.push('fenced code block did not render');
  if (!markdownResult.arrowKept) failures.push('Markdown source was rewritten (-> became ⇒)');
  if (!markdownResult.markupKept) failures.push('Markdown source lost its _{...} / ^{...} text');
  if (!markdownResult.imageLoaded) failures.push('relative image in the Markdown preview did not load');
  if (!(markdownResult.scrolled > 100)) failures.push('in-page Markdown anchor did not scroll');
  if (!markdownResult.previewOff) failures.push('toggle did not leave the preview');
  if (markdownResult.labelInRaw !== 'Raw text') failures.push('toggle label is wrong in raw mode');
  if (markdownResult.pressedInRaw !== 'false') failures.push('toggle state is wrong in raw mode');
  if (!markdownResult.frameVisible) failures.push('raw editor is not visible in raw mode');
  if (!markdownResult.previewOnAgain) failures.push('Ctrl+Shift+M did not return to the preview');
  if (markdownResult.tabsAfterLink !== markdownResult.tabsAfterOpen + 1) failures.push('relative Markdown link did not open a tab');
  if (markdownResult.linkedHeading !== 'Referenced') failures.push('linked Markdown file did not render');
  if (markdownResult.linkedTabLabel !== 'ref.md') failures.push('linked Markdown tab has the wrong label');
  if (markdownResult.backLabel !== 'notes.md') failures.push('back did not return to the Markdown file');
  if (!markdownResult.backPreview) failures.push('back did not restore the Markdown preview');
  if (!findResult.barOpenInPreview) failures.push('Ctrl+F did not open the find bar in the Markdown preview');
  if (findResult.previewCount !== '1 of 1') failures.push(`Markdown preview find count is wrong: ${findResult.previewCount}`);
  if (findResult.previewHighlights.all !== 1 || findResult.previewHighlights.current !== 1) failures.push('Markdown preview matches were not highlighted');
  if (!findResult.previewClosed) failures.push('Escape did not close the find bar in the preview');
  if (findResult.previewCleared.all !== 0) failures.push('preview find highlights were not cleared');
  if (!findResult.barOpenInRaw) failures.push('Ctrl+F did not open the find bar in raw text');
  if (!findResult.inputFocused) failures.push('find input did not take focus');
  if (findResult.rawFirst !== '1 of 4') failures.push(`find count is wrong: ${findResult.rawFirst}`);
  if (findResult.rawFirstSelection !== 'alpha') failures.push('find did not select the first match');
  if (findResult.rawHighlights.all !== 4 || findResult.rawHighlights.current !== 1) failures.push('raw text matches were not highlighted');
  if (findResult.rawNext !== '2 of 4' || findResult.rawNextSelection !== 'ALPHA') failures.push('Enter did not move to the next match');
  if (findResult.rawPrev !== '1 of 4') failures.push('Shift+Enter did not move to the previous match');
  if (findResult.casePressed !== 'true') failures.push('match case toggle did not turn on');
  if (findResult.caseCount !== '1 of 3') failures.push(`match case count is wrong: ${findResult.caseCount}`);
  if (!findResult.rawClosed) failures.push('Escape did not close the find bar');
  if (!findResult.rawFocus) failures.push('closing find did not return focus to the editor');
  if (findResult.rawCleared.all !== 0) failures.push('find highlights were not cleared on close');
  if (!findResult.f3Reopened) failures.push('F3 did not reopen find');
  if (findResult.f3Count !== '2 of 4') failures.push(`F3 did not find the next match: ${findResult.f3Count}`);
  if (!drawResult.drawMode) failures.push('the Draw mode button did not open a drawing');
  if (drawResult.tabsAfter !== drawResult.tabsBefore + 1) failures.push('Draw mode did not open a new tab');
  if (drawResult.tabLabel !== 'Drawing') failures.push(`drawing tab label is "${drawResult.tabLabel}"`);
  if (drawResult.canvasSize[0] !== 1400 || drawResult.canvasSize[1] !== 900) failures.push(`drawing canvas is ${drawResult.canvasSize.join('x')}`);
  if (drawResult.paperColor !== 'rgb(0, 0, 0)') failures.push(`drawing paper is "${drawResult.paperColor}" instead of black`);
  if (!drawResult.editorHidden) failures.push('the text editor is visible in draw mode');
  if (!drawResult.markdownToggleHidden) failures.push('the Markdown toggle is visible in draw mode');
  if (drawResult.undoHidden) failures.push('the undo button is missing from the draw toolbar');
  if (!drawResult.undoDisabledInitial) failures.push('undo should start disabled');
  if (!drawResult.redoDisabledInitial) failures.push('redo should start disabled');
  if (!drawResult.undoEnabled) failures.push('undo did not become available after drawing');
  if (drawResult.boxesAfterUndo !== 0) failures.push('undo did not remove the typed text box');
  if (drawResult.boxesAfterRedo !== 1) failures.push('redo did not bring the text box back');
  if (!drawResult.textAfterRedo.includes('Rendered into the PNG')) failures.push('redo lost the text box contents');
  if (!drawResult.undoEnabledAfterRedo) failures.push('undo is disabled after redo');
  if (!drawResult.redoDisabledAfterRedo) failures.push('redo should be disabled after redoing');
  if (!(drawPencilInk.ink > 50)) failures.push('the pencil stroke is missing from the saved PNG');
  if (!(drawLineInk.ink > 50)) failures.push('the straight line is missing from the saved PNG');
  if (drawResult.boxInfo.count !== 1) failures.push(`expected one text box, found ${drawResult.boxInfo.count}`);
  if (drawResult.boxInfo.fontSize !== 32) failures.push(`text box font size is ${drawResult.boxInfo.fontSize}px`);
  if (!drawResult.boxInfo.text.includes('Rendered into the PNG')) failures.push('typed text is missing from the text box');
  if (drawResult.boxInfo.width !== 420 || drawResult.boxInfo.height !== 120) failures.push('the text box did not take its resized size');
  if (!drawSave || !/^data:image\/png;base64,/.test(drawSave.dataUrl || '')) failures.push('saving a drawing did not send PNG data');
  if (drawSaveBytes.slice(0, 8).toString('hex') !== '89504e470d0a1a0a') failures.push('the saved drawing is not a PNG');
  if (drawSave && drawSave.suggestedName !== 'Untitled.png') failures.push(`drawing save name is "${drawSave.suggestedName}"`);
  if (drawSaveSize.width !== 1400 || drawSaveSize.height !== 900) failures.push(`saved drawing is ${drawSaveSize.width}x${drawSaveSize.height}`);
  if (!(drawText.ink > 200)) failures.push('draw-mode text was not rasterized into the saved PNG');
  if (drawText.rows < 1) failures.push('the saved PNG has no text rows');
  if (drawResult.labelAfterSave !== 'saved-drawing.png') failures.push(`drawing tab label after saving is "${drawResult.labelAfterSave}"`);
  if (drawResult.dirtyAfterSave) failures.push('a saved drawing is still marked as changed');
  if (drawOpenResult.tabLabel !== 'sketch.png') failures.push(`opened PNG tab label is "${drawOpenResult.tabLabel}"`);
  if (drawOpenResult.canvasSize[0] !== 400 || drawOpenResult.canvasSize[1] !== 300) failures.push(`opened PNG canvas is ${drawOpenResult.canvasSize.join('x')}`);
  if (drawOpenCorner.r !== 0x30 || drawOpenCorner.g !== 0x30 || drawOpenCorner.b !== 0x30) failures.push('the opened PNG pixels are wrong');
  if (!(drawOpenInk.ink > 20)) failures.push('drawing on an opened PNG did not work');
  if (!drawOpenSave || drawOpenSave.path !== drawPngPath) failures.push('saving an opened PNG did not reuse its path');
  if (drawOpenSize.width !== 400 || drawOpenSize.height !== 300) failures.push(`resaved PNG is ${drawOpenSize.width}x${drawOpenSize.height}`);
  if (drawOpenResult.drawMode) failures.push('draw mode stayed on after switching to a text tab');
  if (!drawOpenResult.editorVisible) failures.push('the text editor did not come back after leaving draw mode');
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join(' | ')}`);

  console.log(JSON.stringify({
    result,
    settingsResult,
    markdownResult,
    findResult,
    drawResult,
    drawOpenResult,
    drawSave: drawSave ? { suggestedName: drawSave.suggestedName, path: drawSave.path, size: drawSaveSize } : null,
    drawOpenSave: drawOpenSave ? { path: drawOpenSave.path, size: drawOpenSize } : null,
    drawInk: {
      pencil: drawPencilInk,
      line: drawLineInk,
      text: drawText,
      reopened: drawOpenInk
    },
    consoleErrors,
    failures,
    outputDir
  }, null, 2));

  await window.close();
  app.exit(failures.length ? 1 : 0);
}

app.whenReady().then(() => {
  run().catch((error) => {
    console.error(error);
    console.log(JSON.stringify({ consoleErrors, fatal: error.stack }, null, 2));
    app.exit(1);
  });
});
