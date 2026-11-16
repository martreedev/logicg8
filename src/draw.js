(() => {
  'use strict';

  // Draw mode keeps a small vector scene per tab and paints it onto a canvas.
  // Text boxes are DOM elements over the canvas so they can be edited with a
  // caret and resized with the native resize handle; the export routine lays
  // the same text out on an offscreen canvas when the PNG is saved.

  const DEFAULT_WIDTH = 1400;
  const DEFAULT_HEIGHT = 900;
  const MIN_BOX_WIDTH = 70;
  const MIN_BOX_HEIGHT = 40;
  const TEXT_PADDING_X = 6;
  const TEXT_PADDING_Y = 4;
  const TEXT_LINE_HEIGHT = 1.35;
  const TEXT_FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';
  const INK = '#ffffff';
  const PAPER = '#000000';
  const PIXEL_BUDGET = 16 * 1000 * 1000;
  const HISTORY_LIMIT = 80;

  function createScene(options = {}) {
    return {
      width: Math.max(1, Math.round(options.width || DEFAULT_WIDTH)),
      height: Math.max(1, Math.round(options.height || DEFAULT_HEIGHT)),
      background: options.background || null,
      strokes: Array.isArray(options.strokes) ? options.strokes : [],
      lines: Array.isArray(options.lines) ? options.lines : [],
      texts: Array.isArray(options.texts) ? options.texts : []
    };
  }

  function decodeImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({
        image,
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height
      });
      image.onerror = () => reject(new Error('The image could not be decoded.'));
      image.src = dataUrl;
    });
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // Greedy word wrap that follows the text box width. A word that is wider
  // than the box is split between characters, matching `overflow-wrap`.
  function wrapParagraph(ctx, paragraph, maxWidth) {
    if (!paragraph) {
      return [''];
    }

    const breakWord = (word) => {
      const chunks = [];
      let chunk = '';
      for (const character of word) {
        if (chunk && ctx.measureText(chunk + character).width > maxWidth) {
          chunks.push(chunk);
          chunk = character;
        } else {
          chunk += character;
        }
      }
      if (chunk) {
        chunks.push(chunk);
      }
      return chunks.length ? chunks : [''];
    };

    const lines = [];
    let line = '';

    for (const word of paragraph.split(' ')) {
      if (ctx.measureText(word).width <= maxWidth) {
        const candidate = line ? `${line} ${word}` : word;
        if (!line || ctx.measureText(candidate).width <= maxWidth) {
          line = candidate;
        } else {
          lines.push(line);
          line = word;
        }
        continue;
      }

      if (line) {
        lines.push(line);
        line = '';
      }
      const chunks = breakWord(word);
      for (let index = 0; index < chunks.length - 1; index += 1) {
        lines.push(chunks[index]);
      }
      line = chunks[chunks.length - 1];
    }

    lines.push(line);
    return lines;
  }

  class Surface {
    constructor(options) {
      this.stage = options.stage;
      this.frame = options.frame;
      this.paper = options.paper;
      this.canvas = options.canvas;
      this.textLayer = options.textLayer;
      this.toolButtons = Array.from(options.toolButtons || []);
      this.undoButton = options.undoButton || null;
      this.redoButton = options.redoButton || null;
      this.pencilInput = options.pencilSize;
      this.pencilOutput = options.pencilSizeValue;
      this.fontInput = options.fontSize;
      this.fontOutput = options.fontSizeValue;
      this.onChange = typeof options.onChange === 'function' ? options.onChange : () => {};

      this.scene = createScene();
      this.tool = 'pencil';
      this.pencilSize = Number(this.pencilInput.value) || 3;
      this.fontSize = Number(this.fontInput.value) || 20;
      this.pixelScale = 1;
      this.viewScale = 1;
      this.draft = null;
      this.activeBox = null;
      this.boxByElement = new Map();
      this.boxObservers = new Map();
      this.frameRequest = 0;
      // Undo stacks live beside each scene so switching tabs keeps its history.
      this.histories = new WeakMap();
      this.burstOwner = null;
      this.burstAt = 0;

      this.bindEvents();
      this.syncToolButtons();
      this.syncSizeOutputs();
      this.updateHistoryButtons();
    }

    bindEvents() {
      for (const button of this.toolButtons) {
        button.addEventListener('click', () => this.setTool(button.dataset.tool));
      }

      if (this.undoButton) {
        this.undoButton.addEventListener('click', () => this.undo());
      }
      if (this.redoButton) {
        this.redoButton.addEventListener('click', () => this.redo());
      }

      this.pencilInput.addEventListener('input', () => {
        this.pencilSize = clamp(Number(this.pencilInput.value) || 1, 1, 30);
        this.syncSizeOutputs();
      });

      this.fontInput.addEventListener('input', () => {
        this.setFontSize(Number(this.fontInput.value) || 20);
      });

      this.canvas.addEventListener('pointerdown', (event) => this.onPointerDown(event));
      this.canvas.addEventListener('pointermove', (event) => this.onPointerMove(event));
      this.canvas.addEventListener('pointerup', (event) => this.onPointerUp(event));
      this.canvas.addEventListener('pointercancel', (event) => this.cancelDraft(event));
      this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());

      if ('ResizeObserver' in window) {
        this.stageObserver = new ResizeObserver(() => this.resize());
        this.stageObserver.observe(this.stage);
      }
      window.addEventListener('resize', () => this.resize());
      document.addEventListener('pointerup', () => this.clearResizeSessions());
      document.addEventListener('pointercancel', () => this.clearResizeSessions());

      document.addEventListener('keydown', (event) => this.onDocumentKeyDown(event));
    }

    onDocumentKeyDown(event) {
      const app = document.querySelector('.app');
      if (!app || !app.classList.contains('is-draw-mode')) {
        return;
      }
      if (event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();
      if (event.ctrlKey || event.metaKey) {
        if (key === 'z') {
          event.preventDefault();
          if (event.shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
        } else if (key === 'y') {
          event.preventDefault();
          this.redo();
        }
        return;
      }

      const target = event.target;
      if (target && target.closest && target.closest('input, textarea, select, [contenteditable="true"]')) {
        return;
      }
      if (key === 'p') {
        event.preventDefault();
        this.setTool('pencil');
      } else if (key === 'l') {
        event.preventDefault();
        this.setTool('line');
      } else if (key === 't') {
        event.preventDefault();
        this.setTool('text');
      }
    }

    setScene(scene) {
      this.commitEdits();
      this.scene = scene || createScene();
      this.draft = null;
      this.activeBox = null;
      this.burstOwner = null;
      this.ensureBackground();
      this.rebuildTextBoxes();
      this.resize();
      this.render();
      this.updateHistoryButtons();
    }

    getScene() {
      return this.scene;
    }

    /* History ------------------------------------------------------------- */

    historyFor(scene = this.scene) {
      let history = this.histories.get(scene);
      if (!history) {
        history = { undo: [], redo: [] };
        this.histories.set(scene, history);
      }
      return history;
    }

    captureState() {
      const scene = this.scene;
      return {
        strokes: scene.strokes.map((stroke) => ({
          size: stroke.size,
          points: stroke.points.map((point) => ({ x: point.x, y: point.y }))
        })),
        lines: scene.lines.map((line) => ({ ...line })),
        texts: scene.texts.map((box) => ({ ...box }))
      };
    }

    pushHistory(snapshot) {
      const history = this.historyFor();
      history.undo.push(snapshot || this.captureState());
      if (history.undo.length > HISTORY_LIMIT) {
        history.undo.shift();
      }
      history.redo.length = 0;
      this.updateHistoryButtons();
    }

    updateHistoryButtons() {
      const history = this.historyFor();
      if (this.undoButton) {
        this.undoButton.disabled = history.undo.length === 0;
      }
      if (this.redoButton) {
        this.redoButton.disabled = history.redo.length === 0;
      }
    }

    undo() {
      this.commitEdits();
      const history = this.historyFor();
      if (!history.undo.length) {
        return;
      }
      history.redo.push(this.captureState());
      this.applySnapshot(history.undo.pop());
    }

    redo() {
      this.commitEdits();
      const history = this.historyFor();
      if (!history.redo.length) {
        return;
      }
      history.undo.push(this.captureState());
      this.applySnapshot(history.redo.pop());
    }

    applySnapshot(snapshot) {
      this.draft = null;
      this.scene.strokes = snapshot.strokes;
      this.scene.lines = snapshot.lines;
      this.scene.texts = snapshot.texts;
      this.rebuildTextBoxes();
      this.render();
      this.updateHistoryButtons();
      this.onChange();
    }

    // A burst groups the many input events of one slider drag into one undo step.
    beginBurst(owner) {
      const now = performance.now();
      if (this.burstOwner === owner && now - this.burstAt < 700) {
        this.burstAt = now;
        return false;
      }
      this.burstOwner = owner;
      this.burstAt = now;
      return true;
    }

    clearResizeSessions() {
      for (const element of this.boxByElement.keys()) {
        element.__resizeSnapshot = null;
        element.__resizePushed = false;
      }
    }

    setTool(tool) {
      if (!['pencil', 'line', 'text'].includes(tool)) {
        return;
      }
      this.tool = tool;
      this.syncToolButtons();
      this.canvas.style.cursor = tool === 'text' ? 'text' : 'crosshair';
    }

    syncToolButtons() {
      for (const button of this.toolButtons) {
        const active = button.dataset.tool === this.tool;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      }
    }

    setFontSize(value) {
      const next = clamp(Number(value) || 10, 10, 96);
      if (this.activeBox && this.activeBox.fontSize !== next && this.beginBurst(this.activeBox)) {
        this.pushHistory();
      }
      this.fontSize = next;
      this.fontInput.value = String(Math.round(this.fontSize));
      this.syncSizeOutputs();

      if (this.activeBox) {
        this.activeBox.fontSize = this.fontSize;
        const element = this.elementForBox(this.activeBox);
        if (element) {
          element.style.fontSize = `${this.fontSize}px`;
        }
        this.onChange();
      }
    }

    syncSizeOutputs() {
      if (this.pencilOutput) {
        this.pencilOutput.textContent = `${Math.round(this.pencilSize)} px`;
      }
      if (this.fontOutput) {
        this.fontOutput.textContent = `${Math.round(this.fontSize)} px`;
      }
    }

    focus() {
      this.canvas.focus({ preventScroll: true });
    }

    /* Rendering ------------------------------------------------------------ */

    updatePixelScale() {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      let scale = dpr;
      while (scale > 1 && (this.scene.width * this.scene.height * scale * scale) > PIXEL_BUDGET) {
        scale -= 0.25;
      }
      this.pixelScale = Math.max(1, scale);
    }

    resize() {
      if (!this.scene) {
        return;
      }
      const width = Math.max(120, this.stage.clientWidth - 44);
      const height = Math.max(90, this.stage.clientHeight - 44);
      const scale = Math.min(1, width / this.scene.width, height / this.scene.height);

      this.viewScale = scale;
      this.frame.style.width = `${Math.max(1, Math.round(this.scene.width * scale))}px`;
      this.frame.style.height = `${Math.max(1, Math.round(this.scene.height * scale))}px`;
      this.paper.style.width = `${this.scene.width}px`;
      this.paper.style.height = `${this.scene.height}px`;
      this.paper.style.transform = `scale(${scale})`;
      this.updatePixelScale();
    }

    ensureBackground() {
      const background = this.scene.background;
      if (!background || background.image || background.loading) {
        return;
      }
      background.loading = true;
      const image = new Image();
      image.onload = () => {
        background.image = image;
        background.loading = false;
        if (!Number.isFinite(this.scene.width) || this.scene.width < 1) {
          this.scene.width = image.naturalWidth || image.width;
          this.scene.height = image.naturalHeight || image.height;
          this.resize();
        }
        this.render();
      };
      image.onerror = () => {
        background.loading = false;
      };
      image.src = background.dataUrl;
    }

    scheduleRender() {
      if (this.frameRequest) {
        return;
      }
      this.frameRequest = requestAnimationFrame(() => {
        this.frameRequest = 0;
        this.render();
      });
    }

    render() {
      const scene = this.scene;
      const scale = this.pixelScale;
      const width = Math.max(1, Math.round(scene.width * scale));
      const height = Math.max(1, Math.round(scene.height * scale));

      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }

      const ctx = this.canvas.getContext('2d');
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, scene.width, scene.height);

      if (scene.background && scene.background.image) {
        ctx.drawImage(scene.background.image, 0, 0, scene.width, scene.height);
      }

      for (const stroke of scene.strokes) {
        this.drawStroke(ctx, stroke.points, stroke.size);
      }
      for (const line of scene.lines) {
        this.drawSegment(ctx, line.x1, line.y1, line.x2, line.y2, line.size);
      }

      if (this.draft) {
        if (this.draft.tool === 'pencil') {
          this.drawStroke(ctx, this.draft.points, this.draft.size);
        } else if (this.draft.tool === 'line') {
          this.drawSegment(
            ctx,
            this.draft.start.x,
            this.draft.start.y,
            this.draft.end.x,
            this.draft.end.y,
            this.draft.size
          );
        }
      }
    }

    drawStroke(ctx, points, size) {
      if (!points || points.length === 0) {
        return;
      }
      ctx.save();
      ctx.strokeStyle = INK;
      ctx.fillStyle = INK;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (points.length === 1) {
        ctx.beginPath();
        ctx.arc(points[0].x, points[0].y, Math.max(0.6, size / 2), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let index = 1; index < points.length; index += 1) {
          ctx.lineTo(points[index].x, points[index].y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    drawSegment(ctx, x1, y1, x2, y2, size) {
      ctx.save();
      ctx.strokeStyle = INK;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    }

    /* Pointer input -------------------------------------------------------- */

    pointFor(event) {
      const rect = this.canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * this.scene.width;
      const y = ((event.clientY - rect.top) / Math.max(1, rect.height)) * this.scene.height;
      return {
        x: clamp(x, 0, this.scene.width),
        y: clamp(y, 0, this.scene.height)
      };
    }

    onPointerDown(event) {
      if (event.button !== 0) {
        return;
      }
      this.commitEdits();
      this.focus();
      event.preventDefault();

      if (this.tool === 'text') {
        this.addTextBox(this.pointFor(event));
        return;
      }

      const point = this.pointFor(event);
      if (this.tool === 'line') {
        this.draft = { tool: 'line', start: point, end: point, size: this.pencilSize };
      } else {
        this.draft = { tool: 'pencil', points: [point], size: this.pencilSize };
      }

      try {
        this.canvas.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic or already-released pointers cannot be captured.
      }
      this.render();
    }

    onPointerMove(event) {
      if (!this.draft) {
        return;
      }
      const point = this.pointFor(event);
      if (this.draft.tool === 'line') {
        this.draft.end = point;
      } else {
        const last = this.draft.points[this.draft.points.length - 1];
        if (Math.hypot(point.x - last.x, point.y - last.y) >= 1.4) {
          this.draft.points.push(point);
        }
      }
      this.scheduleRender();
    }

    onPointerUp(event) {
      if (!this.draft) {
        return;
      }
      try {
        this.canvas.releasePointerCapture(event.pointerId);
      } catch {
        // Nothing was captured.
      }

      const draft = this.draft;
      this.draft = null;

      if (draft.tool === 'pencil') {
        this.pushHistory();
        this.scene.strokes.push({ points: draft.points, size: draft.size });
      } else {
        const length = Math.hypot(draft.end.x - draft.start.x, draft.end.y - draft.start.y);
        if (length >= 2) {
          this.pushHistory();
          this.scene.lines.push({
            x1: draft.start.x,
            y1: draft.start.y,
            x2: draft.end.x,
            y2: draft.end.y,
            size: draft.size
          });
        }
      }

      this.render();
      this.onChange();
    }

    cancelDraft(event) {
      if (!this.draft) {
        return;
      }
      this.draft = null;
      try {
        this.canvas.releasePointerCapture(event.pointerId);
      } catch {
        // Nothing was captured.
      }
      this.render();
    }

    /* Text boxes ----------------------------------------------------------- */

    elementForBox(box) {
      for (const [element, candidate] of this.boxByElement) {
        if (candidate === box) {
          return element;
        }
      }
      return null;
    }

    addTextBox(point) {
      const scene = this.scene;
      const preAdd = this.captureState();
      const width = Math.min(260, Math.max(120, scene.width - point.x - 12));
      const height = Math.max(56, Math.round(this.fontSize * 2.4));
      const box = {
        x: clamp(point.x, 0, Math.max(0, scene.width - MIN_BOX_WIDTH)),
        y: clamp(point.y, 0, Math.max(0, scene.height - MIN_BOX_HEIGHT)),
        w: Math.max(MIN_BOX_WIDTH, width),
        h: Math.min(Math.max(MIN_BOX_HEIGHT, height), Math.max(MIN_BOX_HEIGHT, scene.height - point.y)),
        fontSize: this.fontSize,
        text: ''
      };
      scene.texts.push(box);

      const element = this.createTextBoxElement(box);
      // Typing into a brand new box undoes back to before the box existed.
      element.__addSnapshot = preAdd;
      this.textLayer.append(element);
      this.focusTextBox(element, box);
      this.onChange();
    }

    createTextBoxElement(box) {
      const element = document.createElement('div');
      element.className = 'draw-textbox';
      element.style.left = `${box.x}px`;
      element.style.top = `${box.y}px`;
      element.style.width = `${box.w}px`;
      element.style.height = `${box.h}px`;
      element.style.fontSize = `${box.fontSize}px`;

      const body = document.createElement('div');
      body.className = 'draw-textbox-body';
      body.contentEditable = 'true';
      body.spellcheck = false;
      body.textContent = box.text || '';

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'draw-textbox-remove';
      remove.tabIndex = -1;
      remove.textContent = '×';
      remove.setAttribute('aria-label', 'Delete text box');
      remove.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
      });
      remove.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.removeTextBox(box);
      });

      body.addEventListener('input', () => {
        if (!element.__editRecorded) {
          this.pushHistory(element.__addSnapshot || element.__editSnapshot || undefined);
          element.__editRecorded = true;
          element.__addSnapshot = null;
        }
        box.text = body.innerText.replace(/\u00a0/g, ' ');
        this.onChange();
      });

      body.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        if ((event.ctrlKey || event.metaKey) && (key === 'z' || key === 'y')) {
          event.preventDefault();
          // Keep the document handler from undoing a second time.
          event.stopPropagation();
          if (key === 'y' || event.shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
          return;
        }
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          body.blur();
        }
      });

      element.addEventListener('pointerdown', () => {
        element.__resizeSnapshot = this.captureState();
        element.__resizePushed = false;
      });

      body.addEventListener('focus', () => {
        this.activeBox = box;
        element.classList.add('is-editing');
        element.__editSnapshot = this.captureState();
        element.__editRecorded = false;
        this.fontSize = box.fontSize;
        this.fontInput.value = String(Math.round(box.fontSize));
        this.syncSizeOutputs();
      });

      body.addEventListener('blur', () => {
        element.classList.remove('is-editing');
        element.__editRecorded = false;
        element.__editSnapshot = null;
        element.__addSnapshot = null;
        element.__resizeSnapshot = null;
        element.__resizePushed = false;
        if (this.activeBox === box) {
          this.activeBox = null;
        }
        if (!box.text.trim()) {
          this.removeTextBox(box, { record: false });
        }
      });

      if ('ResizeObserver' in window) {
        const observer = new ResizeObserver(() => {
          const width = Math.round(element.offsetWidth);
          const height = Math.round(element.offsetHeight);
          if (width <= 0 || height <= 0) {
            return;
          }
          if (box.w === width && box.h === height) {
            return;
          }
          if (element.__resizeSnapshot && !element.__resizePushed) {
            this.pushHistory(element.__resizeSnapshot);
            element.__resizePushed = true;
          }
          box.w = Math.max(MIN_BOX_WIDTH, width);
          box.h = Math.max(MIN_BOX_HEIGHT, height);
          this.onChange();
        });
        observer.observe(element);
        this.boxObservers.set(element, observer);
      }

      element.append(body, remove);
      this.boxByElement.set(element, box);
      return element;
    }

    focusTextBox(element, box) {
      const body = element.querySelector('.draw-textbox-body');
      if (!body) {
        return;
      }
      element.classList.add('is-editing');
      body.focus();
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(body);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      this.activeBox = box;
    }

    removeTextBox(box, options = {}) {
      const index = this.scene.texts.indexOf(box);
      const element = this.elementForBox(box);
      if (index < 0 && !element) {
        return;
      }
      if (options.record !== false) {
        this.pushHistory();
      }
      if (index >= 0) {
        this.scene.texts.splice(index, 1);
      }
      if (element) {
        const observer = this.boxObservers.get(element);
        if (observer) {
          observer.disconnect();
          this.boxObservers.delete(element);
        }
        element.remove();
        this.boxByElement.delete(element);
      }
      if (this.activeBox === box) {
        this.activeBox = null;
      }
      this.onChange();
    }

    rebuildTextBoxes() {
      for (const observer of this.boxObservers.values()) {
        observer.disconnect();
      }
      this.boxObservers.clear();
      this.boxByElement.clear();
      this.textLayer.replaceChildren();
      this.activeBox = null;

      for (const box of this.scene.texts) {
        this.textLayer.append(this.createTextBoxElement(box));
      }
    }

    commitEdits() {
      const editing = this.textLayer.querySelector('.draw-textbox-body:focus');
      if (editing) {
        editing.blur();
      }
    }

    /* Export --------------------------------------------------------------- */

    drawTexts(ctx) {
      for (const box of this.scene.texts) {
        const text = String(box.text || '').replace(/\u00a0/g, ' ');
        if (!text.trim()) {
          continue;
        }

        const fontSize = box.fontSize;
        const lineHeight = fontSize * TEXT_LINE_HEIGHT;
        const glyphOffset = (lineHeight - fontSize) / 2;
        const maxWidth = Math.max(8, box.w - TEXT_PADDING_X * 2);

        ctx.save();
        ctx.beginPath();
        ctx.rect(box.x, box.y, box.w, box.h);
        ctx.clip();
        ctx.font = `400 ${fontSize}px ${TEXT_FONT}`;
        ctx.fillStyle = INK;
        ctx.textBaseline = 'top';

        let y = box.y + TEXT_PADDING_Y;
        for (const paragraph of text.split('\n')) {
          for (const line of wrapParagraph(ctx, paragraph, maxWidth)) {
            if (y + lineHeight > box.y + box.h + 1) {
              break;
            }
            if (line) {
              ctx.fillText(line, box.x + TEXT_PADDING_X, y + glyphOffset);
            }
            y += lineHeight;
          }
        }
        ctx.restore();
      }
    }

    toDataURL() {
      this.commitEdits();
      this.render();

      const output = document.createElement('canvas');
      output.width = this.canvas.width;
      output.height = this.canvas.height;
      const ctx = output.getContext('2d');
      ctx.drawImage(this.canvas, 0, 0);
      ctx.setTransform(this.pixelScale, 0, 0, this.pixelScale, 0, 0);
      this.drawTexts(ctx);
      return output.toDataURL('image/png');
    }
  }

  window.__DRAW__ = { createScene, decodeImage, Surface };
})();
