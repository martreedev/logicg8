(() => {
  'use strict';

  const LOGIC_GROUPS = [
    {
      title: 'Connectives',
      items: [
        { symbol: '∧', label: 'conjunction', keywords: ['and', 'both'] },
        { symbol: '∨', label: 'disjunction', keywords: ['or', 'either'] },
        { symbol: '¬', label: 'negation', keywords: ['not'] },
        { symbol: '⇒', label: 'conditional', keywords: ['implies', 'then'] },
        { symbol: '↔', label: 'biconditional', keywords: ['iff', 'if and only if'] },
        { symbol: '⊕', label: 'exclusive or', keywords: ['xor'] },
        { symbol: '↑', label: 'nand', keywords: ['nand'] },
        { symbol: '↓', label: 'nor', keywords: ['nor'] },
        { symbol: '≡', label: 'equivalence', keywords: ['equivalent'] }
      ]
    },
    {
      title: 'Quantifiers',
      items: [
        { symbol: '∀', label: 'universal quantifier', keywords: ['for every', 'for all', 'all', 'every', 'forall'] },
        { symbol: '∃', label: 'existential quantifier', keywords: ['exists', 'there exists', 'some', 'for some'] }
      ]
    },
    {
      title: 'Sets',
      items: [
        { symbol: '∈', label: 'membership', keywords: ['that exists inside of', 'that exist inside of', 'that exists within', 'that exist within', 'that exists in', 'exists inside', 'exist inside', 'inside of', 'insode of', 'element of', 'member of', 'belongs to'] }
      ]
    },
    {
      title: 'Notation',
      items: [
        { symbol: ':', label: 'such that', keywords: ['such that', 'given that'] }
      ]
    },
    {
      title: 'Modal',
      items: [
        { symbol: '□', label: 'necessity', keywords: ['necessary', 'necessarily'] },
        { symbol: '◇', label: 'possibility', keywords: ['possible', 'possibly'] }
      ]
    },
    {
      title: 'Inference',
      items: [
        { symbol: '∴', label: 'therefore', keywords: ['therefore', 'thus', 'hence'] },
        { symbol: '⊨', label: 'entailment', keywords: ['entails', 'models'] },
        { symbol: '⊢', label: 'provability', keywords: ['proves', 'derives'] },
        { symbol: '⊥', label: 'contradiction', keywords: ['contradiction', 'inconsistent'] },
        { symbol: '⊤', label: 'tautology', keywords: ['tautology'] }
      ]
    },
    {
      title: 'Truth values',
      items: [
        { symbol: '⊤', label: 'true', keywords: ['true'] },
        { symbol: '⊥', label: 'false', keywords: ['false'] }
      ]
    }
  ];

  const SYMBOL_INFO = {
    '∧': {
      name: 'conjunction',
      readAs: '“and”.',
      definition: 'It is true when both of its operands are true, and false otherwise.'
    },
    '∨': {
      name: 'disjunction',
      readAs: '“or”, normally in the inclusive sense.',
      definition: 'It is true when at least one of its operands is true.'
    },
    '¬': {
      name: 'negation',
      readAs: '“not”.',
      definition: 'It reverses the truth value of the statement it applies to.'
    },
    '⇒': {
      name: 'conditional',
      readAs: '“if … then …” or “implies”.',
      definition: 'It is false only when the antecedent is true and the consequent is false.'
    },
    '↔': {
      name: 'biconditional',
      readAs: '“if and only if” or “iff”.',
      definition: 'It is true when both sides have the same truth value.'
    },
    '⊕': {
      name: 'exclusive or',
      readAs: '“either … or …, but not both”.',
      definition: 'It is true when exactly one of its operands is true.'
    },
    '↑': {
      name: 'nand',
      readAs: '“not both”.',
      definition: 'It is the negation of conjunction, so it is false only when both operands are true.'
    },
    '↓': {
      name: 'nor',
      readAs: '“neither … nor …”.',
      definition: 'It is the negation of disjunction, so it is true only when both operands are false.'
    },
    '≡': {
      name: 'equivalence',
      readAs: '“is equivalent to”.',
      definition: 'It asserts that two statements or formulas have the same truth value or logical content.'
    },
    '∀': {
      name: 'universal quantifier',
      readAs: '“for all”, “for every”, or “every”.',
      definition: 'It asserts that a given property or predicate holds for every element in the domain.'
    },
    '∃': {
      name: 'existential quantifier',
      readAs: '“There exists”, “there is at least one”, or “for some”.',
      definition: 'It asserts that a given property or predicate holds for at least one element in the domain.'
    },
    '∈': {
      name: 'membership relation',
      readAs: '“is an element of”, “belongs to”, or “exists inside of”.',
      definition: 'It states that an object is a member of a set.'
    },
    ':': {
      name: 'such-that marker',
      readAs: '“such that” or “given that”.',
      definition: 'It introduces a condition or property that restricts the objects under discussion.'
    },
    '□': {
      name: 'necessity operator',
      readAs: '“it is necessary that” or “necessarily”.',
      definition: 'In modal logic, it says that a proposition is true in every accessible possible world.'
    },
    '◇': {
      name: 'possibility operator',
      readAs: '“it is possible that” or “possibly”.',
      definition: 'In modal logic, it says that a proposition is true in at least one accessible possible world.'
    },
    '∴': {
      name: 'therefore sign',
      readAs: '“therefore”.',
      definition: 'It marks a conclusion that follows from the statements before it.'
    },
    '⊨': {
      name: 'entailment relation',
      readAs: '“entails” or “models”.',
      definition: 'It says that every model in which the premises are true also makes the conclusion true.'
    },
    '⊢': {
      name: 'provability relation',
      readAs: '“proves” or “derives”.',
      definition: 'It says that a conclusion can be derived from the premises using the rules of a proof system.'
    },
    '⊥': {
      name: 'contradiction or falsum',
      readAs: '“contradiction”, “inconsistent”, or “false”.',
      definition: 'It represents a falsehood, an inconsistent formula, or the bottom truth value.'
    },
    '⊤': {
      name: 'tautology or verum',
      readAs: '“tautology” or “true”.',
      definition: 'It represents a logical truth or the top truth value.'
    }
  };

  const FONT_OPTIONS = [
    { label: 'Cascadia Code', value: 'Cascadia Code' },
    { label: 'Cascadia Mono', value: 'Cascadia Mono' },
    { label: 'Consolas', value: 'Consolas' },
    { label: 'Lucida Console', value: 'Lucida Console' },
    { label: 'Courier New', value: 'Courier New' },
    { label: 'JetBrains Mono', value: 'JetBrains Mono' },
    { label: 'Fira Code', value: 'Fira Code' },
    { label: 'Segoe UI', value: 'Segoe UI' },
    { label: 'Georgia', value: 'Georgia' },
    { label: 'Cambria', value: 'Cambria' },
    { label: 'Times New Roman', value: 'Times New Roman' }
  ];

  const DEFAULT_SETTINGS = {
    fontFamily: 'Cascadia Code',
    fontWeight: '400',
    fontSize: 16,
    lineHeight: 1.65,
    letterSpacing: 0,
    convertShortcut: 'Shift+Enter'
  };

  const BRACKET_PAIRS = { '(': ')', '[': ']', '{': '}' };
  const BRACKET_CLOSERS = new Set(Object.values(BRACKET_PAIRS));
  const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta']);
  const RESERVED_SHORTCUTS = new Set(['Ctrl+S', 'Ctrl+Shift+S', 'Ctrl+O', 'Ctrl+N', 'Ctrl+F', 'Ctrl+=', 'Ctrl+-', 'Ctrl+W', 'Ctrl+Shift+M', 'Shift+ArrowDown', 'Shift+ArrowUp']);

  // Files with these extensions open in the rendered Markdown view first, and
  // are stored on disk byte for byte (no _{...} / ^{...} script markup).
  const MARKDOWN_EXTENSIONS = new Set(['md', 'markdown', 'mdown', 'mkd']);
  const MARKDOWN_LINK_EXTENSIONS = new Set(['md', 'markdown', 'mdown', 'mkd', 'txt', 'logic', 'syllogism']);
  // PNG files open in draw mode and are saved as PNG images.
  const IMAGE_EXTENSIONS = new Set(['png']);
  // Extensions the app can open from a dialog, a relative link, or a drop.
  // Extensionless files count too, matching the main process.
  const OPENABLE_EXTENSIONS = new Set([...MARKDOWN_LINK_EXTENSIONS, ...IMAGE_EXTENSIONS]);

  const FIND_HIGHLIGHT = 'logicg8-find';
  const FIND_ACTIVE_HIGHLIGHT = 'logicg8-find-current';

  // Sub/superscript is stored internally with a zero-width marker in front of
  // each raised/lowered character, so every character can be scripted. On disk
  // the same content is written as readable markup: _{...} for subscript and
  // ^{...} for superscript (see toMarkup/fromMarkup).
  //
  // Shift+ArrowDown steps the caret down one baseline (normal → subscript),
  // Shift+ArrowUp steps it up (subscript → normal → superscript). While on a
  // raised/lowered baseline, typed characters become superscripts/subscripts.
  const SUBSCRIPT_MARK = '\u200B';   // ZERO WIDTH SPACE
  const SUPERSCRIPT_MARK = '\u200C'; // ZERO WIDTH NON-JOINER

  const SETTINGS_KEY = 'mardraw.settings.v1';
  const LINKS_KEY = 'mardraw.links.v1';
  const USER_DICT_KEY = 'mardraw.userdict.v1';
  const app = document.querySelector('.app');
  const editor = document.getElementById('editor');
  const editorFrame = document.getElementById('editorFrame');
  const highlightContent = document.getElementById('highlightContent');
  const symbolStrip = document.getElementById('symbolStrip');
  const logicTrigger = document.getElementById('logicTrigger');
  const fontTrigger = document.getElementById('fontTrigger');
  const fontSizeDown = document.getElementById('fontSizeDown');
  const fontSizeUp = document.getElementById('fontSizeUp');
  const shortcutTrigger = document.getElementById('shortcutTrigger');
  const logicPopover = document.getElementById('logicPopover');
  const fontPopover = document.getElementById('fontPopover');
  const shortcutPopover = document.getElementById('shortcutPopover');
  const shortcutValue = document.getElementById('shortcutValue');
  const shortcutSet = document.getElementById('shortcutSet');
  const shortcutReset = document.getElementById('shortcutReset');
  const shortcutNote = document.getElementById('shortcutNote');
  const statusShortcutHint = document.getElementById('statusShortcutHint');
  const baselineMode = document.getElementById('baselineMode');
  const keywordSearch = document.getElementById('keywordSearch');
  const keywordList = document.getElementById('keywordList');
  const keywordCount = document.getElementById('keywordCount');
  const fontFamily = document.getElementById('fontFamily');
  const fontWeight = document.getElementById('fontWeight');
  const fontSize = document.getElementById('fontSize');
  const fontSizeValue = document.getElementById('fontSizeValue');
  const lineHeight = document.getElementById('lineHeight');
  const lineHeightValue = document.getElementById('lineHeightValue');
  const letterSpacing = document.getElementById('letterSpacing');
  const letterSpacingValue = document.getElementById('letterSpacingValue');
  const resetFont = document.getElementById('resetFont');
  const fileStatus = document.getElementById('fileStatus');
  const dirtyDot = document.getElementById('dirtyDot');
  const charCount = document.getElementById('charCount');
  const wordCount = document.getElementById('wordCount');
  const cursorPosition = document.getElementById('cursorPosition');
  const toast = document.getElementById('toast');
  const dropOverlay = document.getElementById('dropOverlay');
  const symbolTooltip = document.getElementById('symbolTooltip');
  const symbolTooltipGlyph = document.getElementById('symbolTooltipGlyph');
  const symbolTooltipTitle = document.getElementById('symbolTooltipTitle');
  const symbolTooltipRead = document.getElementById('symbolTooltipRead');
  const symbolTooltipDefinition = document.getElementById('symbolTooltipDefinition');
  const tabbar = document.getElementById('tabbar');
  const tabsElement = document.getElementById('tabs');
  const backButton = document.getElementById('backButton');
  const contextMenu = document.getElementById('contextMenu');
  const caret = document.getElementById('caret');
  const markdownView = document.getElementById('markdownView');
  const markdownToggle = document.getElementById('markdownToggle');
  const markdownModeLabel = document.getElementById('markdownModeLabel');
  const drawTrigger = document.getElementById('drawTrigger');
  const drawStage = document.getElementById('drawStage');
  const drawFrame = document.getElementById('drawFrame');
  const drawPaper = document.getElementById('drawPaper');
  const drawCanvas = document.getElementById('drawCanvas');
  const drawTextLayer = document.getElementById('drawTextLayer');
  const drawPencilSize = document.getElementById('drawPencilSize');
  const drawPencilSizeValue = document.getElementById('drawPencilSizeValue');
  const drawFontSize = document.getElementById('drawFontSize');
  const drawFontSizeValue = document.getElementById('drawFontSizeValue');
  const drawUndo = document.getElementById('drawUndo');
  const drawRedo = document.getElementById('drawRedo');
  const findBar = document.getElementById('findBar');
  const findInput = document.getElementById('findInput');
  const findCount = document.getElementById('findCount');
  const findPrevButton = document.getElementById('findPrev');
  const findNextButton = document.getElementById('findNext');
  const findCaseButton = document.getElementById('findCase');
  const findCloseButton = document.getElementById('findClose');

  let openPopover = null;
  let toastTimer = 0;
  let dirty = false;
  let currentFilePath = null;
  let settings = loadSettings();
  let lastSelection = { start: 0, end: 0 };
  let metricsQueued = false;
  let capturingShortcut = false;
  let currentSuggestion = null;
  let hoveredSymbol = null;
  let tabs = [];
  let activeTabIndex = 0;
  let tabIdCounter = 0;
  let currentLinkSpans = [];
  let contextMenuState = null;
  let autocorrecting = false;
  let ctrlHeld = false;
  let lastPointer = null;
  let baseline = 0;
  let findOpen = false;
  let findQuery = '';
  let findMatchCase = false;
  let findMode = 'editor';
  let findMatches = [];
  let findIndex = -1;
  let findAnchor = 0;
  let drawSurface = null;
  const ignoredWords = new Set();

  const keywordMap = new Map();
  const keywordListEntries = [];
  const keywordWordSet = new Set();

  for (const group of LOGIC_GROUPS) {
    for (const item of group.items) {
      for (const keyword of item.keywords) {
        const normalized = normalize(keyword);
        if (!keywordMap.has(normalized)) {
          const entry = { group: group.title, keyword, normalized, symbol: item.symbol, label: item.label };
          keywordMap.set(normalized, entry);
          keywordListEntries.push(entry);
        }
        for (const word of keyword.toLowerCase().split(/\s+/)) {
          keywordWordSet.add(word);
        }
      }
    }
  }

  const spellData = window.__SPELLCHECK__ || {};
  const spellDictionary = spellData.dictionary instanceof Set ? spellData.dictionary : new Set();
  const autocorrectMap = spellData.autocorrect && typeof spellData.autocorrect === 'object' ? spellData.autocorrect : {};

  const sortedKeywords = [...keywordMap.keys()].sort((a, b) => b.length - a.length);
  const KEYWORD_REGEX = new RegExp(`\\b(?:${sortedKeywords.map(keywordPattern).join('|')})\\b`, 'gi');
  const MAX_KEYWORD_LENGTH = sortedKeywords.reduce((max, keyword) => Math.max(max, keyword.length), 0);

  function normalize(value) {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function keywordPattern(keyword) {
    return keyword.split(/\s+/).map(escapeRegExp).join('[ \\t]+');
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      const result = { ...DEFAULT_SETTINGS };

      if (FONT_OPTIONS.some((option) => option.value === saved.fontFamily)) {
        result.fontFamily = saved.fontFamily;
      }
      if (['400', '500', '600'].includes(String(saved.fontWeight))) {
        result.fontWeight = String(saved.fontWeight);
      }
      if (Number.isFinite(saved.fontSize)) {
        result.fontSize = Math.min(70, Math.max(12, saved.fontSize));
      }
      if (Number.isFinite(saved.lineHeight)) {
        result.lineHeight = Math.min(2.2, Math.max(1.15, saved.lineHeight));
      }
      if (Number.isFinite(saved.letterSpacing)) {
        result.letterSpacing = Math.min(1.5, Math.max(-0.5, saved.letterSpacing));
      }
      if (typeof saved.convertShortcut === 'string' && saved.convertShortcut.trim()) {
        result.convertShortcut = saved.convertShortcut.trim();
      }

      return result;
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // A read-only profile should not stop the editor from working.
    }
  }

  function fontStack(family) {
    const safeFamily = family.replace(/["\\]/g, '');
    return `"${safeFamily}", "Segoe UI Symbol", "Cambria Math", "Cascadia Code", Consolas, monospace`;
  }

  function syncFontControls() {
    fontFamily.value = settings.fontFamily;
    fontWeight.value = settings.fontWeight;
    fontSize.value = String(settings.fontSize);
    fontSizeValue.textContent = `${settings.fontSize} px`;
    lineHeight.value = String(settings.lineHeight);
    lineHeightValue.textContent = settings.lineHeight.toFixed(2);
    letterSpacing.value = String(settings.letterSpacing);
    letterSpacingValue.textContent = `${settings.letterSpacing.toFixed(1)} px`;
  }

  function formatShortcut(event) {
    if (MODIFIER_KEYS.has(event.key)) {
      return '';
    }

    const parts = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');

    let key = event.key;
    if (key === ' ') {
      key = 'Space';
    } else if (key.length === 1) {
      key = key.toUpperCase();
    }

    parts.push(key);
    return parts.join('+');
  }

  function displayShortcut(shortcut) {
    return shortcut.split('+').join(' + ');
  }

  function isPlainShiftEnter(event) {
    return event.key === 'Enter' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
  }

  function syncShortcutControls() {
    shortcutValue.textContent = displayShortcut(settings.convertShortcut);
    updateStatusHint();
  }

  function stopShortcutCapture() {
    capturingShortcut = false;
    shortcutPopover.classList.remove('is-capturing');
    shortcutSet.textContent = 'Press a new shortcut';
    shortcutNote.textContent = 'Click the button, then press the combination.';
  }

  function applySettings() {
    const root = document.documentElement;
    root.style.setProperty('--editor-font', fontStack(settings.fontFamily));
    root.style.setProperty('--editor-size', `${settings.fontSize}px`);
    root.style.setProperty('--editor-line-height', String(settings.lineHeight));
    root.style.setProperty('--editor-weight', settings.fontWeight);
    root.style.setProperty('--editor-spacing', `${settings.letterSpacing}px`);

    syncFontControls();
    syncShortcutControls();

    requestAnimationFrame(() => {
      updateLayoutMetrics();
      syncScroll();
    });
  }

  function updateSetting(key, value) {
    settings = { ...settings, [key]: value };
    saveSettings();
    applySettings();
  }

  function populateFontSelect() {
    const fragment = document.createDocumentFragment();
    for (const option of FONT_OPTIONS) {
      const element = document.createElement('option');
      element.value = option.value;
      element.textContent = option.label;
      fragment.append(element);
    }
    fontFamily.replaceChildren(fragment);
  }

  function buildSymbolStrip() {
    const symbols = [];
    const bySymbol = new Map();

    for (const group of LOGIC_GROUPS) {
      for (const item of group.items) {
        let entry = bySymbol.get(item.symbol);
        if (!entry) {
          entry = { symbol: item.symbol, keywords: [] };
          bySymbol.set(item.symbol, entry);
          symbols.push(entry);
        }
        for (const keyword of item.keywords) {
          if (!entry.keywords.includes(keyword)) {
            entry.keywords.push(keyword);
          }
        }
      }
    }

    const fragment = document.createDocumentFragment();
    for (const entry of symbols) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = entry.symbol === '□' ? 'symbol-button is-square' : 'symbol-button';
      button.textContent = entry.symbol;
      button.title = `${entry.keywords.join(', ')} → ${entry.symbol}`;
      button.setAttribute('aria-label', `Insert ${entry.symbol} (${entry.keywords.join(', ')})`);
      button.addEventListener('mousedown', (event) => event.preventDefault());
      button.addEventListener('click', () => {
        closePopovers();
        insertSymbol(entry.symbol);
      });
      button.addEventListener('mouseenter', () => {
        const rect = button.getBoundingClientRect();
        showSymbolTooltip(entry.symbol, rect.right, rect.bottom - 2);
      });
      button.addEventListener('mouseleave', hideSymbolTooltip);
      fragment.append(button);
    }
    symbolStrip.replaceChildren(fragment);
  }

  function renderKeywordList() {
    const query = keywordSearch.value.trim().toLowerCase();
    const fragment = document.createDocumentFragment();
    let visible = 0;
    let currentGroup = '';

    for (const entry of keywordListEntries) {
      const searchable = `${entry.keyword} ${entry.normalized} ${entry.symbol} ${entry.label} ${entry.group}`.toLowerCase();
      if (query && !searchable.includes(query)) {
        continue;
      }

      if (entry.group !== currentGroup) {
        currentGroup = entry.group;
        const title = document.createElement('div');
        title.className = 'keyword-group-title';
        title.textContent = entry.group;
        fragment.append(title);
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'keyword-row';
      button.title = `Insert ${entry.symbol}`;

      const name = document.createElement('span');
      name.className = 'keyword-name';
      name.textContent = entry.keyword;

      const arrow = document.createElement('span');
      arrow.className = 'keyword-arrow';
      arrow.textContent = '→';

      const symbol = document.createElement('span');
      symbol.className = entry.symbol === '□' ? 'keyword-symbol is-square' : 'keyword-symbol';
      symbol.textContent = entry.symbol;

      button.append(name, arrow, symbol);
      button.addEventListener('click', () => {
        closePopovers();
        insertSymbol(entry.symbol);
      });
      button.addEventListener('mouseenter', () => {
        const rect = button.getBoundingClientRect();
        showSymbolTooltip(entry.symbol, rect.right, rect.top - 2);
      });
      button.addEventListener('mouseleave', hideSymbolTooltip);
      fragment.append(button);
      visible += 1;
    }

    if (visible === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No matching keywords.';
      fragment.append(empty);
    }

    keywordList.replaceChildren(fragment);
    keywordCount.textContent = `${visible} keyword${visible === 1 ? '' : 's'}`;
  }

  function computeBracketDepths(text) {
    const depths = new Map();
    const stack = [];

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];

      if (BRACKET_PAIRS[char]) {
        depths.set(index, stack.length);
        stack.push({ char, depth: stack.length });
      } else if (BRACKET_CLOSERS.has(char)) {
        let matchIndex = -1;
        for (let i = stack.length - 1; i >= 0; i -= 1) {
          if (BRACKET_PAIRS[stack[i].char] === char) {
            matchIndex = i;
            break;
          }
        }

        if (matchIndex !== -1) {
          depths.set(index, stack[matchIndex].depth);
          stack.length = matchIndex;
        } else {
          depths.set(index, stack.length);
        }
      }
    }

    return depths;
  }

  function findMatchingBracket(text, index) {
    const char = text[index];
    const closer = BRACKET_PAIRS[char];
    const isOpener = Boolean(closer);
    const open = isOpener ? char : Object.keys(BRACKET_PAIRS).find((key) => BRACKET_PAIRS[key] === char);
    const close = isOpener ? closer : char;

    if (!open || !close) {
      return -1;
    }

    const step = isOpener ? 1 : -1;
    let depth = 0;

    for (let i = index + step; i >= 0 && i < text.length; i += step) {
      if (isOpener) {
        if (text[i] === open) {
          depth += 1;
        } else if (text[i] === close) {
          if (depth === 0) {
            return i;
          }
          depth -= 1;
        }
      } else if (text[i] === close) {
        depth += 1;
      } else if (text[i] === open) {
        if (depth === 0) {
          return i;
        }
        depth -= 1;
      }
    }

    return -1;
  }

  function getActiveBrackets(text, start, end) {
    const active = new Set();
    if (start !== end) {
      return active;
    }

    const candidates = [];
    if (start > 0 && (BRACKET_PAIRS[text[start - 1]] || BRACKET_CLOSERS.has(text[start - 1]))) {
      candidates.push(start - 1);
    } else if (start < text.length && (BRACKET_PAIRS[text[start]] || BRACKET_CLOSERS.has(text[start]))) {
      candidates.push(start);
    }

    for (const index of candidates) {
      const match = findMatchingBracket(text, index);
      if (match !== -1) {
        active.add(index);
        active.add(match);
      }
    }

    return active;
  }

  function getAutocompleteSuggestion() {
    if (document.activeElement !== editor || editor.selectionStart !== editor.selectionEnd) {
      return null;
    }

    const text = editor.value;
    const cursor = editor.selectionStart;
    if (cursor < 2 || (cursor < text.length && /[A-Za-z0-9_]/.test(text[cursor]))) {
      return null;
    }

    const searchStart = Math.max(0, cursor - MAX_KEYWORD_LENGTH - 8);
    const before = text.slice(searchStart, cursor);

    for (let start = 0; start <= before.length - 2; start += 1) {
      const absoluteStart = searchStart + start;
      if (absoluteStart > 0 && /[A-Za-z0-9_]/.test(text[absoluteStart - 1])) {
        continue;
      }

      const prefix = before.slice(start);
      const normalizedPrefix = prefix.toLowerCase().replace(/\s+/g, ' ');
      if (normalizedPrefix.length < 2) {
        continue;
      }

      for (const entry of keywordListEntries) {
        if (entry.normalized.startsWith(normalizedPrefix) && entry.normalized.length > normalizedPrefix.length) {
          return {
            end: cursor,
            suffix: entry.keyword.slice(normalizedPrefix.length),
            keyword: entry.keyword
          };
        }
      }
    }

    return null;
  }

  function appendGhost(fragment, suggestion) {
    if (!suggestion) {
      return;
    }

    const ghost = document.createElement('span');
    ghost.className = 'autocomplete-ghost';
    ghost.textContent = suggestion.suffix;
    fragment.append(ghost);
  }

  function appendTextNode(fragment, text, linkId) {
    if (linkId) {
      const span = document.createElement('span');
      span.className = 'logic-link';
      span.dataset.linkId = linkId;
      span.textContent = text;
      fragment.append(span);
    } else {
      fragment.append(document.createTextNode(text));
    }
  }

  function scriptOffsetPx(level) {
    const fs = settings.fontSize;
    return level < 0 ? Math.abs(level) * 0.22 * fs : -level * 0.33 * fs;
  }

  function appendScriptSpan(fragment, char, level, linkId) {
    const span = document.createElement('span');
    span.className = `script-char${linkId ? ' logic-link' : ''}`;
    if (linkId) {
      span.dataset.linkId = linkId;
    }
    span.dataset.level = String(level);
    span.style.transform = `translateY(${scriptOffsetPx(level)}px)`;
    span.textContent = char;
    fragment.append(span);
  }

  function appendScriptedText(fragment, text, linkId) {
    let plain = '';
    let index = 0;

    const flushPlain = () => {
      if (plain) {
        appendTextNode(fragment, plain, linkId);
        plain = '';
      }
    };

    while (index < text.length) {
      const char = text[index];
      if (char === SUBSCRIPT_MARK || char === SUPERSCRIPT_MARK) {
        flushPlain();
        const sign = char === SUBSCRIPT_MARK ? -1 : 1;
        let level = 0;
        while (index < text.length && text[index] === char) {
          level += sign;
          index += 1;
        }
        if (index < text.length) {
          appendScriptSpan(fragment, text[index], level, linkId);
          index += 1;
        }
      } else {
        plain += char;
        index += 1;
      }
    }

    flushPlain();
  }

  function appendPlainText(fragment, text, offset, suggestion, linkId) {
    if (!suggestion || suggestion.end < offset || suggestion.end > offset + text.length) {
      appendScriptedText(fragment, text, linkId);
      return;
    }

    const localIndex = suggestion.end - offset;
    if (localIndex > 0) {
      appendScriptedText(fragment, text.slice(0, localIndex), linkId);
    }

    appendGhost(fragment, suggestion);

    if (localIndex < text.length) {
      appendScriptedText(fragment, text.slice(localIndex), linkId);
    }
  }

  function appendFormattedText(fragment, text, offset, depths, activeBrackets, suggestion, linkId) {
    const pattern = /[□()\[\]{}∧∨¬⇒↔⊕↑↓≡∀∃∈:∴⊨⊢⊥⊤◇]/g;
    let lastIndex = 0;
    let match = pattern.exec(text);

    while (match !== null) {
      if (match.index > lastIndex) {
        appendPlainText(fragment, text.slice(lastIndex, match.index), offset + lastIndex, suggestion, linkId);
      }

      const absoluteIndex = offset + match.index;
      const char = match[0];

      if (char === '□') {
        const square = document.createElement('span');
        square.className = `modal-square symbol-char${linkId ? ' logic-link' : ''}`;
        if (linkId) {
          square.dataset.linkId = linkId;
        }
        square.dataset.symbol = char;
        square.textContent = '□';
        fragment.append(square);
      } else if (BRACKET_PAIRS[char] || BRACKET_CLOSERS.has(char)) {
        const depth = depths.get(absoluteIndex) || 0;
        const bracket = document.createElement('span');
        bracket.className = `bracket-char bracket-depth-${depth % 6}${activeBrackets.has(absoluteIndex) ? ' is-active' : ''}${linkId ? ' logic-link' : ''}`;
        if (linkId) {
          bracket.dataset.linkId = linkId;
        }
        bracket.textContent = char;
        fragment.append(bracket);
      } else {
        const symbol = document.createElement('span');
        symbol.className = `symbol-char${linkId ? ' logic-link' : ''}`;
        if (linkId) {
          symbol.dataset.linkId = linkId;
        }
        symbol.dataset.symbol = char;
        symbol.textContent = char;
        fragment.append(symbol);
      }

      lastIndex = match.index + 1;
      match = pattern.exec(text);
    }

    if (lastIndex < text.length) {
      appendPlainText(fragment, text.slice(lastIndex), offset + lastIndex, suggestion, linkId);
    }
  }

  function renderHighlights() {
    const text = editor.value;
    const fragment = document.createDocumentFragment();
    const depths = computeBracketDepths(text);
    const activeBrackets = getActiveBrackets(text, editor.selectionStart, editor.selectionEnd);
    const lineStart = text.lastIndexOf('\n', editor.selectionStart - 1) + 1;
    const lineBreak = text.indexOf('\n', editor.selectionStart);
    const lineEnd = lineBreak === -1 ? text.length : lineBreak;
    currentSuggestion = getAutocompleteSuggestion();

    const keywordItems = [];
    for (const match of text.matchAll(KEYWORD_REGEX)) {
      const entry = keywordMap.get(normalize(match[0]));
      if (entry) {
        keywordItems.push({ start: match.index, end: match.index + match[0].length, entry });
      }
    }

    currentLinkSpans = currentFilePath ? computeLinkSpans(currentFilePath, text) : [];

    const events = [];
    for (const keyword of keywordItems) {
      events.push({ pos: keyword.start, add: [['kw', keyword]], del: [] });
      events.push({ pos: keyword.end, add: [], del: [['kw', keyword]] });
    }
    for (const link of currentLinkSpans) {
      events.push({ pos: link.start, add: [['link', link]], del: [] });
      events.push({ pos: link.end, add: [], del: [['link', link]] });
    }
    events.sort((a, b) => a.pos - b.pos);

    let activeKeyword = null;
    const activeLinks = [];
    let cursor = 0;
    let eventIndex = 0;

    const flush = (end) => {
      if (end <= cursor) {
        return;
      }
      const segment = text.slice(cursor, end);
      const linkId = activeLinks.length ? activeLinks[0].id : null;

      if (activeKeyword) {
        const token = document.createElement('span');
        const onCurrentLine = cursor >= lineStart && cursor <= lineEnd;
        let className = 'logic-token';
        if (onCurrentLine) {
          className += ' is-current-line';
        }
        if (linkId) {
          className += ' logic-link';
          token.dataset.linkId = linkId;
        }
        token.className = className;
        token.textContent = segment;
        fragment.append(token);
      } else {
        appendFormattedText(fragment, segment, cursor, depths, activeBrackets, currentSuggestion, linkId);
      }

      cursor = end;
    };

    while (eventIndex < events.length) {
      const pos = events[eventIndex].pos;
      flush(pos);

      while (eventIndex < events.length && events[eventIndex].pos === pos) {
        const event = events[eventIndex];
        for (const [type, item] of event.del) {
          if (type === 'kw') {
            activeKeyword = null;
          } else {
            const idx = activeLinks.findIndex((link) => link.id === item.id);
            if (idx !== -1) {
              activeLinks.splice(idx, 1);
            }
          }
        }
        for (const [type, item] of event.add) {
          if (type === 'kw') {
            activeKeyword = item;
          } else {
            activeLinks.push(item);
          }
        }
        eventIndex += 1;
      }
    }
    flush(text.length);

    highlightContent.replaceChildren(fragment);
    placeCaret();
    refreshFindForView();
  }

  function syncScroll() {
    highlightContent.style.transform = `translate(${-editor.scrollLeft}px, ${-editor.scrollTop}px)`;
    placeCaret();
  }

  function caretClientRect() {
    const target = editor.selectionStart;
    let remaining = target;
    let found = null;

    const find = (node) => {
      if (found) {
        return;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        if (remaining <= node.textContent.length) {
          found = { node, offset: remaining, kind: 'text' };
        } else {
          remaining -= node.textContent.length;
        }
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }
      if (node.classList.contains('script-char')) {
        const level = Number(node.dataset.level) || 1;
        const spanLen = Math.abs(level) + 1;
        if (remaining <= spanLen) {
          found = { node, offset: remaining, kind: 'script', level };
        } else {
          remaining -= spanLen;
        }
        return;
      }
      if (node.classList.contains('autocomplete-ghost')) {
        return;
      }
      for (const child of node.childNodes) {
        find(child);
        if (found) {
          return;
        }
      }
    };

    find(highlightContent);

    const range = document.createRange();
    if (!found) {
      const last = highlightContent.lastChild;
      if (last) {
        range.selectNodeContents(last);
        range.collapse(false);
      } else {
        range.selectNodeContents(highlightContent);
        range.collapse(false);
      }
    } else if (found.kind === 'text') {
      range.setStart(found.node, found.offset);
      range.collapse(true);
    } else if (found.offset < Math.abs(found.level) + 1) {
      range.setStart(found.node, 0);
      range.collapse(true);
    } else {
      range.setStartAfter(found.node);
      range.collapse(true);
    }

    return range.getClientRects()[0] || null;
  }

  function placeCaret() {
    if (!caret) {
      return;
    }
    if (baseline === 0) {
      caret.hidden = true;
      return;
    }

    const rect = caretClientRect();
    if (!rect) {
      caret.hidden = true;
      return;
    }

    const frameRect = editorFrame.getBoundingClientRect();
    const caretHeight = Math.max(2, rect.height * 0.5);
    const offset = scriptOffsetPx(baseline); // + down for subscript, - up for superscript
    const centerY = rect.top + rect.height * 0.5 + offset;

    caret.hidden = false;
    caret.classList.toggle('is-sub', baseline < 0);
    caret.classList.toggle('is-super', baseline > 0);
    caret.style.left = `${rect.left - frameRect.left}px`;
    caret.style.top = `${centerY - caretHeight / 2 - frameRect.top}px`;
    caret.style.height = `${caretHeight}px`;
  }

  function updateLayoutMetrics() {
    const scrollbarWidth = Math.max(0, editor.offsetWidth - editor.clientWidth);
    document.documentElement.style.setProperty('--scrollbar-comp', `${scrollbarWidth}px`);
  }

  function queueLayoutMetrics() {
    if (metricsQueued) {
      return;
    }
    metricsQueued = true;
    requestAnimationFrame(() => {
      metricsQueued = false;
      updateLayoutMetrics();
      syncScroll();
    });
  }

  function updateStatus() {
    const tab = activeTab();
    if (tab && tab.draw) {
      charCount.textContent = '';
      wordCount.textContent = '';
      cursorPosition.textContent = 'Drawing';
      return;
    }
    const value = editor.value;
    const selectionStart = editor.selectionStart;
    const beforeCaret = value.slice(0, selectionStart);
    const line = beforeCaret.split('\n').length;
    const lastNewline = beforeCaret.lastIndexOf('\n');
    const column = selectionStart - lastNewline;
    const words = value.trim() ? value.trim().split(/\s+/).length : 0;

    charCount.textContent = `${value.length.toLocaleString()} char${value.length === 1 ? '' : 's'}`;
    wordCount.textContent = `${words.toLocaleString()} word${words === 1 ? '' : 's'}`;
    cursorPosition.textContent = activeMarkdownMode() ? 'Preview' : `Ln ${line}, Col ${column}`;
  }

  function updateTitle() {
    const tab = activeTab();
    const name = tabDisplayName(tab);
    document.title = `${dirty ? '• ' : ''}${name} — LogicG8`;
    fileStatus.textContent = name;
    fileStatus.title = currentFilePath || name;
    dirtyDot.hidden = !dirty;
  }

  function setDirty(value) {
    dirty = value;
    updateTitle();
  }

  function markDirty() {
    if (!dirty) {
      setDirty(true);
    }
    const tab = activeTab();
    if (tab) {
      tab.dirty = true;
      const el = tabsElement.children[activeTabIndex];
      if (el) {
        el.classList.add('is-dirty');
      }
    }
  }

  function refreshAll() {
    const tab = activeTab();
    if (tab && tab.draw) {
      updateStatus();
      return;
    }
    if (activeMarkdownMode()) {
      updateStatus();
      return;
    }
    renderHighlights();
    updateStatus();
    queueLayoutMetrics();
  }

  function rememberSelection() {
    lastSelection = { start: editor.selectionStart, end: editor.selectionEnd };
  }

  function showToast(message, duration = 1800) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, duration);
  }

  function symbolInfoFor(symbol) {
    return SYMBOL_INFO[symbol] || {
      name: 'logical symbol',
      readAs: '—',
      definition: 'A symbol used in symbolic logic notation.'
    };
  }

  function setHoveredSymbol(element) {
    if (hoveredSymbol === element) {
      return;
    }
    if (hoveredSymbol) {
      hoveredSymbol.classList.remove('is-hovered');
    }
    hoveredSymbol = element;
    if (hoveredSymbol) {
      hoveredSymbol.classList.add('is-hovered');
    }
  }

  function showSymbolTooltip(symbol, clientX, clientY, sourceElement = null) {
    const info = symbolInfoFor(symbol);
    setHoveredSymbol(sourceElement && sourceElement.classList && sourceElement.classList.contains('symbol-char')
      ? sourceElement
      : null);
    symbolTooltipGlyph.textContent = symbol;
    symbolTooltipTitle.textContent = `The ${symbol} symbol is the ${info.name}`;
    symbolTooltipRead.textContent = info.readAs;
    symbolTooltipDefinition.textContent = info.definition;
    symbolTooltip.hidden = false;
    symbolTooltip.style.left = '0px';
    symbolTooltip.style.top = '0px';
    requestAnimationFrame(() => {
      const rect = symbolTooltip.getBoundingClientRect();
      let left = clientX + 14;
      let top = clientY + 16;
      if (left + rect.width > window.innerWidth - 10) {
        left = Math.max(10, clientX - rect.width - 14);
      }
      if (top + rect.height > window.innerHeight - 10) {
        top = Math.max(10, clientY - rect.height - 14);
      }
      symbolTooltip.style.left = `${left}px`;
      symbolTooltip.style.top = `${top}px`;
    });
  }

  function hideSymbolTooltip() {
    symbolTooltip.hidden = true;
    setHoveredSymbol(null);
  }

  function symbolElementAtPoint(x, y) {
    const elements = document.elementsFromPoint(x, y);
    const direct = elements.find((el) => el.classList && el.classList.contains('symbol-char'));
    if (direct) {
      return direct;
    }
    if (elements[0] === editor) {
      const previous = editor.style.pointerEvents;
      editor.style.pointerEvents = 'none';
      const candidate = document.elementFromPoint(x, y);
      editor.style.pointerEvents = previous;
      return candidate && candidate.classList && candidate.classList.contains('symbol-char') ? candidate : null;
    }
    return null;
  }

  function linkElementAtPoint(x, y) {
    const elements = document.elementsFromPoint(x, y);
    const direct = elements.find((el) => el.classList && el.classList.contains('logic-link'));
    if (direct) {
      return direct;
    }
    if (elements[0] === editor) {
      const previous = editor.style.pointerEvents;
      editor.style.pointerEvents = 'none';
      const candidate = document.elementFromPoint(x, y);
      editor.style.pointerEvents = previous;
      return candidate && candidate.classList && candidate.classList.contains('logic-link') ? candidate : null;
    }
    return null;
  }

  function findLinkById(id) {
    return currentLinkSpans.find((link) => link.id === id) || null;
  }

  function basename(filePath) {
    return filePath ? filePath.split(/[\\/]/).pop() : 'Untitled';
  }

  function tabDisplayName(tab) {
    if (tab && tab.path) {
      return basename(tab.path);
    }
    return tab && tab.draw ? 'Drawing' : 'Untitled';
  }

  function fileExtension(filePath) {
    if (!filePath) {
      return '';
    }
    const match = /\.([a-zA-Z0-9]+)$/.exec(filePath);
    return match ? match[1].toLowerCase() : '';
  }

  function isMarkdownPath(filePath) {
    return MARKDOWN_EXTENSIONS.has(fileExtension(filePath));
  }

  function isImagePath(filePath) {
    return IMAGE_EXTENSIONS.has(fileExtension(filePath));
  }

  function isOpenablePath(filePath) {
    const extension = fileExtension(filePath);
    return extension === '' || OPENABLE_EXTENSIONS.has(extension);
  }

  // Directory URL (ending in a slash) used to resolve relative images in the
  // Markdown preview.
  function fileBaseUrl(filePath) {
    if (!filePath) {
      return '';
    }
    const normalized = filePath.replace(/\\/g, '/');
    const slash = normalized.lastIndexOf('/');
    if (slash === -1) {
      return '';
    }
    const directory = normalized.slice(0, slash + 1);
    const withScheme = /^[a-zA-Z]:\//.test(directory)
      ? `file:///${directory}`
      : directory.startsWith('//')
        ? `file:${directory}`
        : `file://${directory.startsWith('/') ? '' : '/'}${directory}`;
    try {
      return new URL(encodeURI(withScheme)).href;
    } catch {
      return '';
    }
  }

  function activeTabIsMarkdown() {
    const tab = activeTab();
    return Boolean(tab && tab.markdown);
  }

  function activeMarkdownMode() {
    const tab = activeTab();
    return Boolean(tab && tab.markdown && tab.mode === 'markdown');
  }

  function focusActiveView() {
    if (findOpen) {
      findInput.focus();
      return;
    }
    const tab = activeTab();
    if (tab && tab.draw) {
      drawSurface.focus();
      return;
    }
    if (activeMarkdownMode()) {
      markdownView.focus();
    } else {
      editor.focus();
    }
  }

  function updateStatusHint() {
    const tab = activeTab();
    if (tab && tab.draw) {
      statusShortcutHint.textContent = 'Pencil, line and text · drag a text box corner to resize · Ctrl+Z undoes';
      return;
    }
    if (tab && tab.markdown) {
      statusShortcutHint.textContent = tab.mode === 'markdown'
        ? 'Ctrl + Shift + M switches to raw text'
        : 'Plain text · Ctrl + Shift + M switches to the preview';
      return;
    }
    statusShortcutHint.textContent = `${displayShortcut(settings.convertShortcut)} converts · Tab autocompletes`;
  }

  function renderMarkdownPreview() {
    const tab = activeTab();
    if (!tab || !tab.markdown) {
      return;
    }
    const engine = window.__MARKDOWN__;
    if (!engine) {
      markdownView.textContent = editor.value;
      return;
    }
    markdownView.innerHTML = engine.render(editor.value, { baseUrl: fileBaseUrl(tab.path) });
  }

  function updateViewMode({ focus = false } = {}) {
    const tab = activeTab();
    const drawing = Boolean(tab && tab.draw);
    const markdownTab = Boolean(tab && tab.markdown);
    const showingMarkdown = Boolean(markdownTab && tab.mode === 'markdown');

    app.classList.toggle('is-draw-mode', drawing);
    app.classList.toggle('is-markdown-mode', showingMarkdown);
    markdownToggle.hidden = drawing || !markdownTab;

    if (drawing) {
      closePopovers();
      hideSymbolTooltip();
      hideContextMenu();
      if (findOpen) {
        closeFind();
      }
      if (drawSurface && drawSurface.getScene() !== tab.scene) {
        drawSurface.setScene(tab.scene);
      }
      requestAnimationFrame(() => drawSurface.resize());
      if (focus) {
        drawSurface.focus();
      }
      updateStatusHint();
      updateStatus();
      return;
    }

    if (markdownTab) {
      markdownToggle.classList.toggle('is-raw', !showingMarkdown);
      markdownToggle.setAttribute('aria-pressed', String(showingMarkdown));
      markdownModeLabel.textContent = showingMarkdown ? 'Markdown' : 'Raw text';
      const hint = showingMarkdown
        ? 'Switch to raw text (Ctrl+Shift+M)'
        : 'Switch to Markdown view (Ctrl+Shift+M)';
      markdownToggle.title = hint;
      markdownToggle.setAttribute('aria-label', hint);
    }

    if (showingMarkdown) {
      closePopovers();
      hideSymbolTooltip();
      hideContextMenu();
      renderMarkdownPreview();
      markdownView.scrollTop = Number(tab.markdownScroll) || 0;
      if (focus) {
        markdownView.focus();
      }
    } else {
      markdownView.replaceChildren();
      if (focus) {
        editor.focus();
      }
    }

    updateStatusHint();
    updateStatus();
    refreshFindForView();
  }

  function toggleMarkdownMode() {
    const tab = activeTab();
    if (!tab || !tab.markdown) {
      return;
    }

    if (tab.mode === 'markdown') {
      tab.markdownScroll = markdownView.scrollTop;
      tab.mode = 'raw';
      updateViewMode({ focus: true });
      refreshAll();
      showToast('Raw text mode', 900);
    } else {
      tab.value = editor.value;
      tab.mode = 'markdown';
      updateViewMode({ focus: true });
      showToast('Markdown view', 900);
    }
  }

  async function openRelativePath(basePath, href) {
    if (!window.mardraw || typeof window.mardraw.openRelative !== 'function') {
      showToast('Relative links are available in the desktop app.', 2400);
      return;
    }

    try {
      const result = await window.mardraw.openRelative({ base: basePath, href });
      if (!result) {
        showToast(`Could not open ${href}`, 2600);
        return;
      }
      const existing = tabs.findIndex((tab) => tab.path === result.path);
      if (existing >= 0) {
        activateTab(existing);
        return;
      }
      openResultInTab(result, { backHistory: basePath ? [basePath] : [] });
      showToast(`Opened ${basename(result.path)}`, 1100);
    } catch {
      showToast(`Could not open ${href}`, 2600);
    }
  }

  function handleMarkdownClick(event) {
    const anchor = event.target.closest('a[href]');
    if (!anchor) {
      return;
    }

    event.preventDefault();
    const href = anchor.getAttribute('href') || '';
    if (!href) {
      return;
    }

    if (href.startsWith('#')) {
      let id = href.slice(1);
      try {
        id = decodeURIComponent(id);
      } catch {
        // Keep the raw fragment.
      }
      const target = id ? markdownView.querySelector(`[id="${CSS.escape(id)}"]`) : null;
      if (target) {
        target.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
      return;
    }

    if (/^(https?:|mailto:)/i.test(href)) {
      if (window.mardraw && typeof window.mardraw.openExternal === 'function') {
        window.mardraw.openExternal(href).catch(() => {
          showToast('Could not open the link in your browser.', 2600);
        });
      } else {
        showToast('Links open in your browser from the desktop app.', 2400);
      }
      return;
    }

    const tab = activeTab();
    if (!tab || !tab.path) {
      showToast('Save this file before following relative links.', 2400);
      return;
    }

    let relative = href;
    try {
      relative = decodeURIComponent(href);
    } catch {
      // Keep the raw href.
    }
    relative = relative.split('#')[0].split('?')[0];
    if (!relative) {
      return;
    }

    const extension = fileExtension(relative);
    if (extension && !OPENABLE_EXTENSIONS.has(extension)) {
      showToast('Only text, Markdown, logic and PNG files open inside LogicG8.', 2600);
      return;
    }

    openRelativePath(tab.path, relative);
  }

  async function openPendingFile() {
    if (!window.mardraw || typeof window.mardraw.takePendingOpen !== 'function') {
      return;
    }
    try {
      const result = await window.mardraw.takePendingOpen();
      if (result && result.path) {
        openResultInTab(result);
      }
    } catch {
      // Nothing was passed on the command line.
    }
  }

  function handleOpenPathFromMain(filePath) {
    if (!filePath) {
      return;
    }

    if (isImagePath(filePath) && window.mardraw && typeof window.mardraw.readImageFile === 'function') {
      window.mardraw.readImageFile(filePath).then((result) => {
        if (!result || !result.dataUrl) {
          showToast('Could not open the image.', 2600);
          return;
        }
        openImageInTab(filePath, result.dataUrl);
      }).catch(() => {
        showToast('Could not open the image.', 2600);
      });
      return;
    }

    readFilePath(filePath).then((content) => {
      if (content === null) {
        showToast('Could not open the file.', 2600);
        return;
      }
      openPathInTab(filePath, content);
    });
  }

  // --- Drag and drop -------------------------------------------------------
  //
  // Dropped files carry absolute paths; the preload resolves them with
  // webUtils, the main process reads them. Files dragged inside the editor
  // (plain text) keep their normal behavior, so only file payloads are caught.

  let dragDepth = 0;

  function eventHasFiles(event) {
    const transfer = event.dataTransfer;
    if (!transfer) {
      return false;
    }
    return Array.from(transfer.types || []).includes('Files');
  }

  function showDropOverlay() {
    if (dropOverlay) {
      dropOverlay.hidden = false;
    }
  }

  function hideDropOverlay() {
    dragDepth = 0;
    if (dropOverlay) {
      dropOverlay.hidden = true;
    }
  }

  function handleDragEnter(event) {
    if (!eventHasFiles(event)) {
      return;
    }
    event.preventDefault();
    dragDepth += 1;
    showDropOverlay();
  }

  function handleDragOver(event) {
    if (!eventHasFiles(event)) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  function handleDragLeave(event) {
    if (!eventHasFiles(event)) {
      return;
    }
    dragDepth = Math.max(0, dragDepth - 1);
    // A null relatedTarget means the pointer left the window entirely, even if
    // nested dragenter events left the counter above zero.
    if (dragDepth === 0 || event.relatedTarget === null) {
      hideDropOverlay();
    }
  }

  async function handleFileDrop(event) {
    if (!eventHasFiles(event)) {
      return;
    }
    event.preventDefault();
    hideDropOverlay();

    const dropped = Array.from(event.dataTransfer.files || []);
    if (dropped.length === 0) {
      return;
    }

    if (!window.mardraw
      || typeof window.mardraw.filePathForFile !== 'function'
      || typeof window.mardraw.openDroppedFiles !== 'function') {
      showToast('Opening dropped files is available in the desktop app.', 2600);
      return;
    }

    const paths = [];
    const rejected = [];
    for (const file of dropped) {
      let filePath = '';
      try {
        filePath = window.mardraw.filePathForFile(file) || '';
      } catch {
        filePath = '';
      }
      if (!filePath || !isOpenablePath(filePath)) {
        rejected.push(file.name || 'that file');
        continue;
      }
      if (!paths.includes(filePath)) {
        paths.push(filePath);
      }
    }

    if (paths.length === 0) {
      showToast(rejected.length === 1
        ? `${rejected[0]} can't be opened. Try a text, Markdown, logic or PNG file.`
        : 'Those files can\'t be opened. Try text, Markdown, logic or PNG files.', 3000);
      return;
    }

    try {
      const result = await window.mardraw.openDroppedFiles(paths);
      const files = result && Array.isArray(result.files) ? result.files : [];
      const unreadable = result && Array.isArray(result.skipped) ? result.skipped : [];
      const skipped = rejected.length + unreadable.length;

      for (const file of files) {
        openResultInTab(file);
        if (!file.image && !isMarkdownPath(file.path)) {
          expandArrowShorthand();
        }
      }

      if (files.length === 0) {
        showToast(`Could not open ${rejected.concat(unreadable).join(', ') || 'the dropped file'}.`, 3000);
      } else if (files.length === 1 && skipped === 0) {
        showToast(`Opened ${basename(files[0].path)}`, 1200);
      } else if (skipped === 0) {
        showToast(`Opened ${files.length} files`, 1600);
      } else {
        showToast(`Opened ${files.length} file${files.length === 1 ? '' : 's'} · ${skipped} could not be opened`, 2800);
      }
    } catch (error) {
      showToast(`Could not open the dropped files: ${error.message}`, 3200);
    }
  }

  // --- Find ----------------------------------------------------------------
  //
  // Find works on whichever view is showing: the raw text (searched by offset,
  // with matches painted through the CSS Custom Highlight API on the syntax
  // layer) or the Markdown preview (searched across its text nodes). The
  // current match is selected in the editor, as Notepad's Find does.

  function findHighlightSupported() {
    return Boolean(window.CSS && CSS.highlights && typeof Highlight === 'function');
  }

  function clearFindHighlights() {
    if (findHighlightSupported()) {
      CSS.highlights.delete(FIND_HIGHLIGHT);
      CSS.highlights.delete(FIND_ACTIVE_HIGHLIGHT);
    }
  }

  function setFindHighlights(ranges, activeRange) {
    if (!findHighlightSupported()) {
      return;
    }
    clearFindHighlights();

    if (ranges.length) {
      const all = new Highlight();
      for (const range of ranges) {
        all.add(range);
      }
      CSS.highlights.set(FIND_HIGHLIGHT, all);
    }

    if (activeRange) {
      const current = new Highlight(activeRange);
      current.priority = 1;
      CSS.highlights.set(FIND_ACTIVE_HIGHLIGHT, current);
    }
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function textMatches(text, query) {
    if (!text || !query) {
      return [];
    }
    let pattern;
    try {
      pattern = new RegExp(escapeRegExp(query), findMatchCase ? 'gu' : 'giu');
    } catch {
      return [];
    }
    const matches = [];
    for (const match of text.matchAll(pattern)) {
      matches.push({ start: match.index, end: match.index + match[0].length, range: null });
    }
    return matches;
  }

  // Maps editor offsets to Range boundaries inside the syntax layer in one
  // pass, skipping the autocomplete ghost text and counting the hidden script
  // markers that the layer does not render.
  function editorPoints(offsets) {
    const unique = [...new Set(offsets)].sort((a, b) => a - b);
    const points = new Map();
    let consumed = 0;
    let pointer = 0;

    const settle = (node, length, script) => {
      const nodeEnd = consumed + length;
      while (pointer < unique.length && unique[pointer] <= nodeEnd) {
        const target = unique[pointer];
        if (target >= consumed) {
          points.set(target, script
            ? { node, script: true }
            : { node, offset: target - consumed, script: false });
        }
        pointer += 1;
      }
      consumed = nodeEnd;
    };

    const visit = (node) => {
      if (pointer >= unique.length) {
        return;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        settle(node, node.textContent.length, false);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }
      if (node.classList.contains('autocomplete-ghost')) {
        return;
      }
      if (node.classList.contains('script-char')) {
        const level = Number(node.dataset.level) || 1;
        settle(node, Math.abs(level) + 1, true);
        return;
      }
      for (const child of node.childNodes) {
        visit(child);
        if (pointer >= unique.length) {
          return;
        }
      }
    };

    visit(highlightContent);
    return points;
  }

  function buildEditorRanges(matches) {
    if (!matches.length) {
      return;
    }

    const offsets = [];
    for (const match of matches) {
      offsets.push(match.start, match.end);
    }
    const points = editorPoints(offsets);

    for (const match of matches) {
      const startPoint = points.get(match.start);
      const endPoint = points.get(match.end);
      if (!startPoint || !endPoint) {
        match.range = null;
        continue;
      }

      const range = document.createRange();
      if (startPoint.script) {
        range.setStart(startPoint.node, 0);
      } else {
        range.setStart(startPoint.node, startPoint.offset);
      }
      if (endPoint.script) {
        range.setEndAfter(endPoint.node);
      } else {
        range.setEnd(endPoint.node, endPoint.offset);
      }
      match.range = range;
    }
  }

  function computePreviewMatches() {
    const matches = [];
    const walker = document.createTreeWalker(markdownView, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const value = node.nodeValue || '';
      if (value.trim()) {
        for (const match of textMatches(value, findQuery)) {
          const range = document.createRange();
          range.setStart(node, match.start);
          range.setEnd(node, match.end);
          matches.push({ start: match.start, end: match.end, range });
        }
      }
      node = walker.nextNode();
    }
    return matches;
  }

  function searchFind() {
    findMode = activeMarkdownMode() ? 'preview' : 'editor';
    if (findMode === 'editor') {
      findMatches = textMatches(editor.value, findQuery);
      buildEditorRanges(findMatches);
    } else {
      findMatches = computePreviewMatches();
    }
  }

  function findStartIndex() {
    if (!findMatches.length) {
      return -1;
    }
    if (findMode === 'preview') {
      return 0;
    }
    for (let index = 0; index < findMatches.length; index += 1) {
      if (findMatches[index].start >= findAnchor) {
        return index;
      }
    }
    return 0;
  }

  function updateFindCount() {
    if (!findQuery) {
      findCount.textContent = '';
      findCount.classList.remove('is-empty');
      return;
    }
    if (!findMatches.length) {
      findCount.textContent = 'No results';
      findCount.classList.add('is-empty');
      return;
    }
    findCount.classList.remove('is-empty');
    const position = findIndex >= 0 ? findIndex + 1 : 1;
    findCount.textContent = `${position} of ${findMatches.length}`;
  }

  function paintFindHighlights() {
    const ranges = [];
    for (const match of findMatches) {
      if (match.range) {
        ranges.push(match.range);
      }
    }
    const current = findIndex >= 0 && findMatches[findIndex] ? findMatches[findIndex].range : null;
    setFindHighlights(ranges, current);
    updateFindCount();
  }

  function scrollEditorToRange(range) {
    if (!range) {
      return;
    }
    const rect = range.getBoundingClientRect();
    const view = editor.getBoundingClientRect();
    const padY = 26;
    const padX = 36;
    let top = editor.scrollTop;
    let left = editor.scrollLeft;

    if (rect.top < view.top + padY) {
      top -= view.top + padY - rect.top;
    } else if (rect.bottom > view.bottom - padY) {
      top += rect.bottom - (view.bottom - padY);
    }
    if (rect.left < view.left + padX) {
      left -= view.left + padX - rect.left;
    } else if (rect.right > view.right - padX) {
      left += rect.right - (view.right - padX);
    }

    editor.scrollTop = Math.max(0, top);
    editor.scrollLeft = Math.max(0, left);
    syncScroll();
  }

  function scrollPreviewToRange(range) {
    if (!range) {
      return;
    }
    const rect = range.getBoundingClientRect();
    const view = markdownView.getBoundingClientRect();
    const pad = 60;

    if (rect.top < view.top + pad) {
      markdownView.scrollTop -= view.top + pad - rect.top;
    } else if (rect.bottom > view.bottom - pad) {
      markdownView.scrollTop += rect.bottom - (view.bottom - pad);
    }
  }

  function revealFindMatch(index) {
    const match = findMatches[index];
    if (!match) {
      return;
    }
    if (findMode === 'preview') {
      scrollPreviewToRange(match.range);
      return;
    }
    editor.setSelectionRange(match.start, match.end);
    rememberSelection();
    scrollEditorToRange(match.range);
    updateStatus();
  }

  function refreshFind({ reveal = false, step = null, reset = false } = {}) {
    if (!findOpen) {
      return;
    }

    const previousIndex = findIndex;
    searchFind();

    if (!findQuery || !findMatches.length) {
      findIndex = -1;
      paintFindHighlights();
      return;
    }

    if (reset) {
      findIndex = findStartIndex();
    } else if (step === 'next') {
      findIndex = previousIndex < 0
        ? findStartIndex()
        : (previousIndex + 1) % findMatches.length;
    } else if (step === 'prev') {
      findIndex = previousIndex < 0
        ? findStartIndex()
        : (previousIndex - 1 + findMatches.length) % findMatches.length;
    } else if (findIndex < 0) {
      findIndex = findStartIndex();
    } else {
      findIndex = Math.min(findIndex, findMatches.length - 1);
    }

    paintFindHighlights();
    if (reveal) {
      revealFindMatch(findIndex);
    }
  }

  function openFind({ fromEnd = false } = {}) {
    const current = activeTab();
    if (current && current.draw) {
      return;
    }
    if (findOpen) {
      findInput.focus();
      findInput.select();
      return;
    }

    closePopovers();
    hideContextMenu();
    hideSymbolTooltip();

    const selected = !activeMarkdownMode() && editor.selectionEnd > editor.selectionStart
      ? editor.value.slice(editor.selectionStart, editor.selectionEnd)
      : '';
    const usable = selected
      && selected.length <= 200
      && !/[\r\n]/.test(selected)
      && !selected.includes(SUBSCRIPT_MARK)
      && !selected.includes(SUPERSCRIPT_MARK)
      ? selected
      : '';

    findOpen = true;
    findAnchor = activeMarkdownMode()
      ? 0
      : (fromEnd ? editor.selectionEnd : editor.selectionStart);
    findIndex = -1;
    findBar.hidden = false;
    findInput.value = usable || findQuery;
    findQuery = findInput.value;
    findMode = activeMarkdownMode() ? 'preview' : 'editor';

    refreshFind({ reveal: Boolean(findQuery), reset: true });

    findInput.focus();
    findInput.select();
  }

  function closeFind() {
    if (!findOpen) {
      return;
    }
    const hadFocus = findBar.contains(document.activeElement);
    findOpen = false;
    findBar.hidden = true;
    findInput.blur();
    findMatches = [];
    findIndex = -1;
    clearFindHighlights();
    findCount.textContent = '';
    findCount.classList.remove('is-empty');
    if (hadFocus) {
      focusActiveView();
    }
  }

  // Called when the text or the view changed underneath an open find bar.
  function refreshFindForView() {
    if (findOpen && findQuery) {
      refreshFind();
    }
  }

  function loadLinks() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LINKS_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveLinks(links) {
    try {
      localStorage.setItem(LINKS_KEY, JSON.stringify(links));
    } catch {
      // Read-only profiles should not stop linking from working this session.
    }
  }

  function lineStartOffset(text, lineNumber) {
    if (lineNumber <= 0) {
      return -1;
    }
    const lines = text.split('\n');
    if (lineNumber > lines.length) {
      return -1;
    }
    let offset = 0;
    for (let i = 0; i < lineNumber - 1; i += 1) {
      offset += lines[i].length + 1;
    }
    return offset;
  }

  function computeLinkRegion(link, text) {
    if (link.kind === 'range') {
      const start = link.start;
      const end = start + link.text.length;
      if (text.slice(start, end) === link.text) {
        return { start, end };
      }
      const found = text.indexOf(link.text);
      if (found !== -1) {
        return { start: found, end: found + link.text.length };
      }
      return null;
    }

    const start = lineStartOffset(text, link.line);
    if (start === -1) {
      return null;
    }
    const lineEnd = text.indexOf('\n', start);
    const end = lineEnd === -1 ? text.length : lineEnd;
    return { start, end };
  }

  function computeLinkSpans(source, text) {
    return loadLinks()
      .filter((link) => link.source === source)
      .map((link) => {
        const region = computeLinkRegion(link, text);
        return region ? { id: link.id, start: region.start, end: region.end, target: link.target } : null;
      })
      .filter(Boolean);
  }

  function showLinkTooltip(link, clientX, clientY) {
    setHoveredSymbol(null);
    symbolTooltipGlyph.textContent = '→';
    symbolTooltipTitle.textContent = `Link to ${basename(link.target)}`;
    symbolTooltipRead.textContent = 'Ctrl + click to open in a new tab';
    symbolTooltipDefinition.textContent = link.target;
    symbolTooltip.hidden = false;
    symbolTooltip.style.left = '0px';
    symbolTooltip.style.top = '0px';
    requestAnimationFrame(() => {
      const rect = symbolTooltip.getBoundingClientRect();
      let left = clientX + 14;
      let top = clientY + 16;
      if (left + rect.width > window.innerWidth - 10) {
        left = Math.max(10, clientX - rect.width - 14);
      }
      if (top + rect.height > window.innerHeight - 10) {
        top = Math.max(10, clientY - rect.height - 14);
      }
      symbolTooltip.style.left = `${left}px`;
      symbolTooltip.style.top = `${top}px`;
    });
  }

  function loadUserDict() {
    try {
      const parsed = JSON.parse(localStorage.getItem(USER_DICT_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.map((word) => word.toLowerCase()) : [];
    } catch {
      return [];
    }
  }

  function addToUserDict(word) {
    const lower = word.toLowerCase();
    const words = loadUserDict();
    if (!words.includes(lower)) {
      words.push(lower);
      try {
        localStorage.setItem(USER_DICT_KEY, JSON.stringify(words));
      } catch {
        // Non-fatal.
      }
    }
  }

  function isWordCorrect(word) {
    const lower = word.toLowerCase();
    if (spellDictionary.has(lower) || keywordWordSet.has(lower) || ignoredWords.has(lower)) {
      return true;
    }
    return loadUserDict().includes(lower);
  }

  function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    if (m === 0) {
      return n;
    }
    if (n === 0) {
      return m;
    }
    let previous = new Array(n + 1);
    let current = new Array(n + 1);
    for (let j = 0; j <= n; j += 1) {
      previous[j] = j;
    }
    for (let i = 1; i <= m; i += 1) {
      current[0] = i;
      for (let j = 1; j <= n; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
      }
      const swap = previous;
      previous = current;
      current = swap;
    }
    return previous[n];
  }

  function suggestWords(word) {
    const lower = word.toLowerCase();
    if (lower.length < 3) {
      return [];
    }
    const candidates = [];
    for (const candidate of spellDictionary) {
      if (Math.abs(candidate.length - lower.length) > 2) {
        continue;
      }
      const distance = levenshtein(lower, candidate);
      if (distance <= 2) {
        candidates.push({ candidate, distance });
      }
    }
    for (const candidate of loadUserDict()) {
      const distance = levenshtein(lower, candidate);
      if (distance <= 2) {
        candidates.push({ candidate, distance });
      }
    }
    candidates.sort((x, y) => x.distance - y.distance || x.candidate.localeCompare(y.candidate));
    return candidates.slice(0, 5).map((item) => item.candidate);
  }

  function misspelledElementAtPoint(x, y) {
    const elements = document.elementsFromPoint(x, y);
    const direct = elements.find((el) => el.classList && el.classList.contains('misspelled'));
    if (direct) {
      return direct;
    }
    if (elements[0] === editor) {
      const previous = editor.style.pointerEvents;
      editor.style.pointerEvents = 'none';
      const candidate = document.elementFromPoint(x, y);
      editor.style.pointerEvents = previous;
      return candidate && candidate.classList && candidate.classList.contains('misspelled') ? candidate : null;
    }
    return null;
  }

  function applyAutocorrect() {
    if (autocorrecting) {
      return;
    }
    const text = editor.value;
    const caret = editor.selectionStart;
    const before = text.slice(0, caret);
    const match = before.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*$/);
    if (!match) {
      return;
    }
    const word = match[0];
    const correction = autocorrectMap[word.toLowerCase()];
    if (!correction || correction === word) {
      return;
    }

    const replacement = word === word.toUpperCase()
      ? correction.toUpperCase()
      : word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()
        ? correction.charAt(0).toUpperCase() + correction.slice(1)
        : correction;

    autocorrecting = true;
    const start = caret - word.length;
    replaceRange(start, caret, replacement);
    autocorrecting = false;
  }

  function updateHoverState(clientX, clientY) {
    const linkElement = linkElementAtPoint(clientX, clientY);
    if (linkElement && ctrlHeld) {
      const link = findLinkById(linkElement.dataset.linkId);
      editor.style.cursor = 'pointer';
      if (link) {
        showLinkTooltip(link, clientX, clientY);
      }
      return;
    }

    editor.style.cursor = '';
    const symbolElement = symbolElementAtPoint(clientX, clientY);
    if (!symbolElement) {
      hideSymbolTooltip();
      return;
    }
    showSymbolTooltip(symbolElement.dataset.symbol, clientX, clientY, symbolElement);
  }

  function expandArrowShorthand() {
    if (activeTabIsMarkdown()) {
      return false;
    }

    const text = editor.value;
    if (!text.includes('->')) {
      return false;
    }

    const ranges = [];
    let index = text.indexOf('->');
    while (index !== -1) {
      ranges.push({ start: index, end: index + 2 });
      index = text.indexOf('->', index + 2);
    }

    if (ranges.length === 0) {
      return false;
    }

    const selectionStart = editor.selectionStart;
    const selectionEnd = editor.selectionEnd;
    let newStart = selectionStart;
    let newEnd = selectionEnd;

    for (const range of ranges) {
      if (range.end <= selectionStart) {
        newStart -= 1;
      } else if (range.start < selectionStart) {
        newStart = range.start + 1;
      }

      if (range.end <= selectionEnd) {
        newEnd -= 1;
      } else if (range.start < selectionEnd) {
        newEnd = range.start + 1;
      }
    }

    for (let i = ranges.length - 1; i >= 0; i -= 1) {
      editor.setRangeText('⇒', ranges[i].start, ranges[i].end, 'preserve');
    }

    editor.setSelectionRange(Math.max(0, newStart), Math.max(0, newEnd));
    rememberSelection();
    return true;
  }

  function replaceRange(start, end, replacement) {
    const max = editor.value.length;
    const safeStart = Math.max(0, Math.min(start, max));
    const safeEnd = Math.max(safeStart, Math.min(end, max));

    editor.focus();
    editor.setSelectionRange(safeStart, safeEnd);

    let inserted = false;
    try {
      inserted = document.execCommand('insertText', false, replacement);
    } catch {
      inserted = false;
    }

    if (!inserted) {
      editor.setRangeText(replacement, safeStart, safeEnd, 'end');
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }

    markDirty();
    rememberSelection();
    refreshAll();
  }

  function insertSymbol(symbol) {
    if (activeMarkdownMode()) {
      const tab = activeTab();
      tab.value = editor.value;
      tab.mode = 'raw';
      updateViewMode();
      refreshAll();
    }
    replaceRange(lastSelection.start, lastSelection.end, symbol);
  }

  function insertBracketPair(opener) {
    const closer = BRACKET_PAIRS[opener];
    const start = editor.selectionStart;
    const end = editor.selectionEnd;

    if (start !== end) {
      const selected = editor.value.slice(start, end);
      replaceRange(start, end, `${opener}${selected}${closer}`);
      editor.setSelectionRange(start + 1, start + 1 + selected.length);
      rememberSelection();
      updateStatus();
      renderHighlights();
      return;
    }

    replaceRange(start, start, `${opener}${closer}`);
    editor.setSelectionRange(start + 1, start + 1);
    rememberSelection();
    updateStatus();
    renderHighlights();
  }

  function baselineMark() {
    if (baseline < 0) {
      return SUBSCRIPT_MARK;
    }
    if (baseline > 0) {
      return SUPERSCRIPT_MARK;
    }
    return null;
  }

  function setBaseline(value) {
    if (value === baseline) {
      return;
    }

    baseline = value;
    app.classList.toggle('has-script-baseline', baseline !== 0);

    if (baseline === 0) {
      baselineMode.hidden = true;
      baselineMode.textContent = '';
    } else {
      baselineMode.hidden = false;
      const kind = baseline < 0 ? 'Subscript' : 'Superscript';
      const depth = Math.abs(baseline);
      baselineMode.textContent = depth > 1 ? `${kind} ×${depth}` : kind;
      showToast(depth > 1 ? `${kind} ×${depth}` : `${kind} mode`, 900);
    }

    placeCaret();
  }

  // Convert nested _{...} / ^{...} markup into zero-width-marker text.
  function fromMarkup(text) {
    const source = String(text == null ? '' : text);
    let index = 0;

    const encode = (ch, level) => {
      if (level === 0) {
        return ch;
      }
      const mark = level < 0 ? SUBSCRIPT_MARK : SUPERSCRIPT_MARK;
      return mark.repeat(Math.abs(level)) + ch;
    };

    const parse = (level) => {
      let out = '';
      while (index < source.length) {
        const ch = source[index];
        if ((ch === '_' || ch === '^') && source[index + 1] === '{') {
          index += 2;
          out += parse(level + (ch === '_' ? -1 : 1));
        } else if (ch === '}' && level !== 0) {
          index += 1;
          return out;
        } else {
          out += encode(ch, level);
          index += 1;
        }
      }
      return out;
    };

    return parse(0);
  }

  // Convert in-memory marker text into nested _{...} / ^{...} markup.
  function toMarkup(text) {
    const items = [];
    let index = 0;

    while (index < text.length) {
      const ch = text[index];
      if (ch === SUBSCRIPT_MARK || ch === SUPERSCRIPT_MARK) {
        const sign = ch === SUBSCRIPT_MARK ? -1 : 1;
        let level = 0;
        while (index < text.length && text[index] === ch) {
          level += sign;
          index += 1;
        }
        if (index < text.length) {
          items.push({ level, char: text[index] });
          index += 1;
        }
      } else {
        items.push({ level: 0, char: ch });
        index += 1;
      }
    }

    let out = '';
    let currentLevel = 0;
    for (const item of items) {
      const target = item.level;
      while (currentLevel !== target) {
        if (currentLevel === 0) {
          out += target > 0 ? '^{' : '_{';
          currentLevel += target > 0 ? 1 : -1;
        } else if (currentLevel > 0) {
          if (target > currentLevel) {
            out += '^{';
            currentLevel += 1;
          } else {
            out += '}';
            currentLevel -= 1;
          }
        } else if (target < currentLevel) {
          out += '_{';
          currentLevel -= 1;
        } else {
          out += '}';
          currentLevel += 1;
        }
      }
      out += item.char;
    }

    while (currentLevel !== 0) {
      out += '}';
      currentLevel += currentLevel > 0 ? -1 : 1;
    }

    return out;
  }

  function deleteScriptAware(direction) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;

    if (start !== end) {
      replaceRange(start, end, '');
      return;
    }

    const value = editor.value;

    if (direction === 'backward') {
      if (start === 0) {
        return;
      }
      const ch = value[start - 1];
      if (ch === SUBSCRIPT_MARK || ch === SUPERSCRIPT_MARK) {
        // Cursor sits after a (possibly orphan) marker run — remove the markers.
        let from = start - 1;
        while (from > 0 && value[from - 1] === ch) {
          from -= 1;
        }
        replaceRange(from, start, '');
      } else if (start >= 2 && (value[start - 2] === SUBSCRIPT_MARK || value[start - 2] === SUPERSCRIPT_MARK)) {
        // Normal char with leading markers — remove the markers and the char.
        const mark = value[start - 2];
        let from = start - 2;
        while (from > 0 && value[from - 1] === mark) {
          from -= 1;
        }
        replaceRange(from, start, '');
      } else {
        replaceRange(start - 1, start, '');
      }
    } else if (start < value.length) {
      const ch = value[start];
      if (ch === SUBSCRIPT_MARK || ch === SUPERSCRIPT_MARK) {
        let cursor = start;
        while (cursor < value.length && value[cursor] === ch) {
          cursor += 1;
        }
        replaceRange(start, Math.min(cursor + 1, value.length), '');
      } else {
        replaceRange(start, start + 1, '');
      }
    }
  }

  function findKeywordAt(text, position) {
    for (const match of text.matchAll(KEYWORD_REGEX)) {
      const start = match.index;
      const end = start + match[0].length;
      if (position >= start && position <= end) {
        const entry = keywordMap.get(normalize(match[0]));
        if (entry) {
          return { start, end, entry };
        }
      }
    }
    return null;
  }

  function convertKeywordAtCursor({ silent = false } = {}) {
    const text = editor.value;
    const selectionStart = editor.selectionStart;
    const selectionEnd = editor.selectionEnd;

    if (selectionStart !== selectionEnd) {
      const raw = text.slice(selectionStart, selectionEnd);
      const trimmed = raw.trim();
      const leading = raw.length - raw.trimStart().length;
      const entry = keywordMap.get(normalize(trimmed));

      if (!entry) {
        if (!silent) {
          showToast('Select a logical keyword to convert.');
        }
        return false;
      }

      const start = selectionStart + leading;
      const end = start + trimmed.length;
      replaceRange(start, end, entry.symbol);
      showToast(`${normalize(trimmed)}  →  ${entry.symbol}`, 1100);
      return true;
    }

    let found = findKeywordAt(text, selectionStart);

    if (!found) {
      let position = selectionStart;
      while (position > 0 && (text[position - 1] === ' ' || text[position - 1] === '\t')) {
        position -= 1;
      }
      if (position !== selectionStart) {
        found = findKeywordAt(text, position);
      }
    }

    if (!found) {
      if (!silent) {
        showToast('No logical keyword at the cursor.');
      }
      return false;
    }

    const keyword = normalize(text.slice(found.start, found.end));
    replaceRange(found.start, found.end, found.entry.symbol);
    showToast(`${keyword}  →  ${found.entry.symbol}`, 1100);
    return true;
  }

  function togglePopover(name) {
    if (openPopover === name) {
      closePopovers();
      return;
    }
    closePopovers();
    openPopover = name;

    if (name === 'logic') {
      logicPopover.hidden = false;
      logicTrigger.setAttribute('aria-expanded', 'true');
      keywordSearch.value = '';
      renderKeywordList();
      requestAnimationFrame(() => keywordSearch.focus());
    } else if (name === 'font') {
      fontPopover.hidden = false;
      fontTrigger.setAttribute('aria-expanded', 'true');
      syncFontControls();
    } else if (name === 'shortcut') {
      shortcutPopover.hidden = false;
      shortcutTrigger.setAttribute('aria-expanded', 'true');
      syncShortcutControls();
      stopShortcutCapture();
    }
  }

  function closePopovers() {
    if (!openPopover) {
      return;
    }
    openPopover = null;
    logicPopover.hidden = true;
    fontPopover.hidden = true;
    shortcutPopover.hidden = true;
    logicTrigger.setAttribute('aria-expanded', 'false');
    fontTrigger.setAttribute('aria-expanded', 'false');
    shortcutTrigger.setAttribute('aria-expanded', 'false');
    stopShortcutCapture();
  }

  function createTab(path, value, options = {}) {
    tabIdCounter += 1;
    const markdown = isMarkdownPath(path);
    return {
      id: tabIdCounter,
      path: path || null,
      value: value ?? '',
      dirty: false,
      markdown,
      draw: false,
      mode: markdown ? 'markdown' : 'raw',
      markdownScroll: 0,
      selection: { start: 0, end: 0 },
      scroll: { left: 0, top: 0 },
      lastSelection: { start: 0, end: 0 },
      backHistory: options.backHistory ? [...options.backHistory] : []
    };
  }

  function createDrawTab(path, scene) {
    tabIdCounter += 1;
    return {
      id: tabIdCounter,
      path: path || null,
      value: '',
      dirty: false,
      markdown: false,
      draw: true,
      mode: 'draw',
      scene,
      selection: { start: 0, end: 0 },
      scroll: { left: 0, top: 0 },
      lastSelection: { start: 0, end: 0 },
      backHistory: []
    };
  }

  function activeTab() {
    return tabs[activeTabIndex];
  }

  function commitActiveTab() {
    const tab = activeTab();
    if (!tab) {
      return;
    }
    if (tab.draw) {
      if (drawSurface) {
        drawSurface.commitEdits();
      }
      tab.dirty = dirty;
      return;
    }
    tab.value = editor.value;
    tab.dirty = dirty;
    tab.selection = { start: editor.selectionStart, end: editor.selectionEnd };
    tab.scroll = { left: editor.scrollLeft, top: editor.scrollTop };
    tab.lastSelection = lastSelection;
    if (tab.mode === 'markdown') {
      tab.markdownScroll = markdownView.scrollTop;
    }
  }

  function loadActiveTab() {
    const tab = activeTab();
    if (!tab) {
      return;
    }
    if (tab.draw) {
      currentFilePath = tab.path;
      editor.value = '';
      dirty = tab.dirty;
      setDirty(dirty);
      if (drawSurface) {
        drawSurface.setScene(tab.scene);
      }
      updateViewMode();
      renderTabBar();
      return;
    }
    editor.value = tab.value;
    currentFilePath = tab.path;
    lastSelection = tab.lastSelection || { start: 0, end: 0 };
    editor.setSelectionRange(tab.selection.start, tab.selection.end);
    editor.scrollLeft = tab.scroll.left;
    editor.scrollTop = tab.scroll.top;
    if (findOpen) {
      findAnchor = activeMarkdownMode() ? 0 : editor.selectionStart;
      findIndex = -1;
    }
    dirty = tab.dirty;
    setDirty(dirty);
    setBaseline(0);
    refreshAll();
    updateViewMode();
    renderTabBar();
  }

  function renderTabBar() {
    const fragment = document.createDocumentFragment();
    tabs.forEach((tab, index) => {
      const button = document.createElement('div');
      button.className = `tab${index === activeTabIndex ? ' is-active' : ''}${tab.dirty ? ' is-dirty' : ''}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(index === activeTabIndex));

      const dot = document.createElement('span');
      dot.className = 'tab-dirty-dot';

      const label = document.createElement('span');
      label.className = 'tab-label';
      label.textContent = tabDisplayName(tab);

      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'tab-close';
      close.textContent = '×';
      close.setAttribute('aria-label', 'Close tab');
      close.addEventListener('click', (event) => {
        event.stopPropagation();
        closeTab(index);
      });

      button.append(dot, label, close);
      button.addEventListener('click', () => activateTab(index));
      fragment.append(button);
    });
    tabsElement.replaceChildren(fragment);
    backButton.disabled = !activeTab().backHistory.length;
  }

  function activateTab(index) {
    if (index < 0 || index >= tabs.length) {
      return;
    }
    if (index !== activeTabIndex) {
      commitActiveTab();
    }
    activeTabIndex = index;
    loadActiveTab();
    focusActiveView();
  }

  function closeTab(index) {
    const tab = tabs[index];
    if (!tab) {
      return;
    }
    if (tab.dirty && !window.confirm(`Discard unsaved changes in ${tabDisplayName(tab)}?`)) {
      return;
    }
    if (index === activeTabIndex) {
      commitActiveTab();
    }
    tabs.splice(index, 1);
    if (tabs.length === 0) {
      tabs.push(createTab(null, ''));
      activeTabIndex = 0;
    } else {
      activeTabIndex = Math.min(activeTabIndex, tabs.length - 1);
    }
    loadActiveTab();
    focusActiveView();
  }

  function closeTabOrWindow() {
    if (tabs.length <= 1) {
      window.close();
      return;
    }
    closeTab(activeTabIndex);
  }

  async function readFilePath(path) {
    if (!window.mardraw) {
      return null;
    }
    try {
      return await window.mardraw.readFile(path);
    } catch {
      return null;
    }
  }

  // Text files come back as content, PNGs as a data URL. Both are returned in
  // the shape openResultInTab() expects.
  async function readAnyPath(filePath) {
    if (!isImagePath(filePath)) {
      const content = await readFilePath(filePath);
      return content === null ? null : { path: filePath, content };
    }
    if (!window.mardraw || typeof window.mardraw.readImageFile !== 'function') {
      return null;
    }
    try {
      return await window.mardraw.readImageFile(filePath);
    } catch {
      return null;
    }
  }

  function openPathInTab(path, content, options = {}) {
    const existing = tabs.findIndex((tab) => tab.path === path);
    if (existing >= 0) {
      if (options.backHistory && options.backHistory.length) {
        tabs[existing].backHistory.push(...options.backHistory);
      }
      activateTab(existing);
      return;
    }
    const value = isMarkdownPath(path) ? String(content ?? '') : fromMarkup(content);
    const tab = createTab(path, value, options);
    tabs.push(tab);
    activateTab(tabs.length - 1);
  }

  async function openLinkTarget(link) {
    const target = link.target;
    if (!target || target === currentFilePath) {
      return;
    }
    const existing = tabs.findIndex((tab) => tab.path === target);
    if (existing >= 0) {
      if (currentFilePath) {
        tabs[existing].backHistory.push(currentFilePath);
      }
      activateTab(existing);
      showToast(`Opened ${basename(target)}`, 1000);
      return;
    }
    const result = await readAnyPath(target);
    if (!result) {
      showToast('Could not open the linked file.', 2800);
      return;
    }
    openResultInTab(result, { backHistory: currentFilePath ? [currentFilePath] : [] });
    showToast(`Opened ${basename(target)}`, 1000);
  }

  function goBack() {
    const tab = activeTab();
    if (!tab || !tab.backHistory.length) {
      return;
    }
    const previous = tab.backHistory.pop();
    renderTabBar();
    const existing = tabs.findIndex((item) => item !== tab && item.path === previous);
    if (existing >= 0) {
      activateTab(existing);
      return;
    }
    readAnyPath(previous).then((result) => {
      if (!result) {
        showToast('Could not open the previous file.', 2800);
        return;
      }
      openResultInTab(result, { backHistory: [] });
    });
  }

  async function openImageInTab(path, dataUrl, options = {}) {
    const existing = tabs.findIndex((tab) => tab.path === path);
    if (existing >= 0) {
      activateTab(existing);
      return;
    }

    let decoded;
    try {
      decoded = await window.__DRAW__.decodeImage(dataUrl);
    } catch {
      showToast(`Could not open ${basename(path)}`, 2800);
      return;
    }

    // The same file may finish decoding while it is already being opened.
    const opened = tabs.findIndex((tab) => tab.path === path);
    if (opened >= 0) {
      activateTab(opened);
      return;
    }

    const scene = window.__DRAW__.createScene({
      width: decoded.width,
      height: decoded.height,
      background: { dataUrl, image: decoded.image }
    });
    const tab = createDrawTab(path, scene);
    if (options.backHistory && options.backHistory.length) {
      tab.backHistory.push(...options.backHistory);
    }
    tabs.push(tab);
    activateTab(tabs.length - 1);
  }

  // Opens whatever shape the main process returned: text files carry
  // `content`, images carry `dataUrl` and the `image` flag.
  function openResultInTab(result, options = {}) {
    if (!result || !result.path) {
      return;
    }
    if (result.image || isImagePath(result.path)) {
      openImageInTab(result.path, result.dataUrl, options);
      return;
    }
    openPathInTab(result.path, result.content, options);
  }

  function createNewFile() {
    const tab = createTab(null, '');
    tabs.push(tab);
    activateTab(tabs.length - 1);
    showToast('New file', 900);
  }

  function createDrawing() {
    const tab = createDrawTab(null, window.__DRAW__.createScene());
    tabs.push(tab);
    activateTab(tabs.length - 1);
    showToast('Draw mode · pencil, line and text', 1400);
  }

  async function openFile() {
    if (!window.mardraw) {
      showToast('File dialogs are available in the desktop app.');
      return;
    }

    try {
      const result = await window.mardraw.openFile();
      if (!result) {
        return;
      }
      openResultInTab(result);
      if (!result.image && !isMarkdownPath(result.path)) {
        expandArrowShorthand();
      }
      showToast(`Opened ${basename(result.path)}`, 1200);
    } catch (error) {
      showToast(`Could not open the file: ${error.message}`, 3200);
    }
  }

  async function saveFile(forceSaveAs = false) {
    if (!window.mardraw) {
      showToast('File dialogs are available in the desktop app.');
      return;
    }

    const current = activeTab();
    if (current && current.draw) {
      await saveDrawing(current, forceSaveAs);
      return;
    }

    const suggestedName = currentFilePath
      ? basename(currentFilePath)
      : 'Untitled.logic';
    const markdownTab = activeTabIsMarkdown();

    const payload = {
      path: forceSaveAs ? null : currentFilePath,
      content: markdownTab ? editor.value : toMarkup(editor.value),
      suggestedName
    };

    try {
      const result = forceSaveAs
        ? await window.mardraw.saveFileAs(payload)
        : await window.mardraw.saveFile(payload);

      if (!result) {
        return;
      }

      const tab = activeTab();
      const nowMarkdown = isMarkdownPath(result.path);
      tab.path = result.path;
      currentFilePath = result.path;

      if (nowMarkdown !== Boolean(tab.markdown)) {
        // The file switched between Markdown and logic text, so convert the
        // live buffer to match the format now on disk.
        editor.value = nowMarkdown ? toMarkup(editor.value) : fromMarkup(editor.value);
        tab.markdown = nowMarkdown;
        tab.mode = 'raw';
      }

      tab.value = editor.value;
      tab.dirty = false;
      setDirty(false);
      renderTabBar();
      updateViewMode();
      showToast(`Saved ${basename(result.path)}`, 1200);
    } catch (error) {
      showToast(`Could not save the file: ${error.message}`, 3200);
    }
  }

  async function saveDrawing(tab, forceSaveAs) {
    let dataUrl;
    try {
      dataUrl = drawSurface.toDataURL();
    } catch (error) {
      showToast(`Could not render the drawing: ${error.message}`, 3200);
      return;
    }

    const payload = {
      path: forceSaveAs ? null : tab.path,
      dataUrl,
      suggestedName: tab.path ? basename(tab.path) : 'Untitled.png'
    };

    try {
      const result = forceSaveAs
        ? await window.mardraw.saveFileAs(payload)
        : await window.mardraw.saveFile(payload);

      if (!result) {
        return;
      }

      tab.path = result.path;
      tab.dirty = false;
      if (activeTab() === tab) {
        currentFilePath = result.path;
        setDirty(false);
      }
      renderTabBar();
      updateViewMode();
      showToast(`Saved ${basename(result.path)}`, 1200);
    } catch (error) {
      showToast(`Could not save the drawing: ${error.message}`, 3200);
    }
  }

  function currentLineNumber() {
    return editor.value.slice(0, editor.selectionStart).split('\n').length;
  }

  function currentLineText() {
    const text = editor.value;
    const start = text.lastIndexOf('\n', editor.selectionStart - 1) + 1;
    const end = text.indexOf('\n', editor.selectionStart);
    return text.slice(start, end === -1 ? text.length : end);
  }

  async function createLinkAtSelection() {
    if (!window.mardraw) {
      showToast('Links are available in the desktop app.');
      return;
    }
    if (!currentFilePath) {
      showToast('Save this file before linking from it.');
      return;
    }

    const selectionStart = editor.selectionStart;
    const selectionEnd = editor.selectionEnd;
    const anchor = selectionEnd > selectionStart
      ? { kind: 'range', text: editor.value.slice(selectionStart, selectionEnd), start: selectionStart }
      : { kind: 'line', line: currentLineNumber(), text: currentLineText() };

    if (!anchor.text.trim()) {
      showToast('Select some text or a non-empty line to link.');
      return;
    }

    const target = await window.mardraw.pickLinkFile();
    if (!target) {
      return;
    }
    if (target === currentFilePath) {
      showToast('Choose a different file to link to.', 2200);
      return;
    }

    const region = anchor.kind === 'range'
      ? { start: anchor.start, end: anchor.start + anchor.text.length }
      : { start: lineStartOffset(editor.value, anchor.line), end: (() => {
        const s = lineStartOffset(editor.value, anchor.line);
        const e = editor.value.indexOf('\n', s);
        return e === -1 ? editor.value.length : e;
      })() };

    const id = `link-${Date.now()}-${tabIdCounter}`;
    const links = loadLinks().filter((link) => {
      if (link.source !== currentFilePath) {
        return true;
      }
      const existing = computeLinkRegion(link, editor.value);
      if (!existing) {
        return true;
      }
      return existing.end <= region.start || existing.start >= region.end;
    });

    links.push({
      id,
      source: currentFilePath,
      target,
      kind: anchor.kind,
      text: anchor.text,
      ...(anchor.kind === 'range' ? { start: anchor.start } : { line: anchor.line })
    });
    saveLinks(links);
    renderHighlights();
    showToast(`Linked to ${basename(target)}`, 1200);
  }

  function removeLink(id) {
    const links = loadLinks().filter((link) => link.id !== id);
    saveLinks(links);
    renderHighlights();
    showToast('Link removed', 1000);
  }

  function stepFontSize(delta) {
    updateSetting('fontSize', Math.min(70, Math.max(12, settings.fontSize + delta)));
  }

  function initializeDrawSurface() {
    const toolButtons = [
      document.getElementById('drawPencil'),
      document.getElementById('drawLine'),
      document.getElementById('drawText')
    ];
    drawSurface = new window.__DRAW__.Surface({
      stage: drawStage,
      frame: drawFrame,
      paper: drawPaper,
      canvas: drawCanvas,
      textLayer: drawTextLayer,
      toolButtons,
      undoButton: drawUndo,
      redoButton: drawRedo,
      pencilSize: drawPencilSize,
      pencilSizeValue: drawPencilSizeValue,
      fontSize: drawFontSize,
      fontSizeValue: drawFontSizeValue,
      onChange: () => markDirty()
    });
  }

  function initialize() {
    populateFontSelect();
    buildSymbolStrip();
    applySettings();
    initializeDrawSurface();
    tabs = [createTab(null, '')];
    activeTabIndex = 0;
    currentFilePath = null;
    setDirty(false);
    refreshAll();
    updateViewMode();
    renderTabBar();
    editor.focus();
    openPendingFile();
  }

  editor.addEventListener('input', () => {
    expandArrowShorthand();
    markDirty();
    refreshAll();
  });

  editor.addEventListener('scroll', syncScroll);

  editor.addEventListener('wheel', (event) => {
    if (!event.ctrlKey) {
      return;
    }
    event.preventDefault();
    stepFontSize(event.deltaY < 0 ? 1 : -1);
  }, { passive: false });

  editor.addEventListener('blur', () => {
    rememberSelection();
    hideSymbolTooltip();
  });

  editor.addEventListener('click', () => {
    rememberSelection();
    renderHighlights();
    updateStatus();
  });

  editor.addEventListener('mousemove', (event) => {
    lastPointer = { x: event.clientX, y: event.clientY };
    updateHoverState(event.clientX, event.clientY);
  });

  editor.addEventListener('mouseleave', () => {
    lastPointer = null;
    editor.style.cursor = '';
    hideSymbolTooltip();
  });

  editor.addEventListener('mousedown', (event) => {
    if (!event.ctrlKey || event.button !== 0) {
      return;
    }
    const linkElement = linkElementAtPoint(event.clientX, event.clientY);
    if (!linkElement) {
      return;
    }
    event.preventDefault();
    const link = findLinkById(linkElement.dataset.linkId);
    if (link) {
      openLinkTarget(link);
    }
  });

  editor.addEventListener('scroll', () => {
    hideSymbolTooltip();
    syncScroll();
  });

  editor.addEventListener('keyup', () => {
    renderHighlights();
    updateStatus();
  });

  editor.addEventListener('select', () => {
    rememberSelection();
    renderHighlights();
    updateStatus();
  });

  document.addEventListener('selectionchange', () => {
    if (document.activeElement === editor) {
      rememberSelection();
      renderHighlights();
      updateStatus();
    }
  });

  editor.addEventListener('keydown', (event) => {
    hideSymbolTooltip();
    if (capturingShortcut) {
      return;
    }

    if (activeTabIsMarkdown()) {
      // Markdown files stay plain text: no keyword conversion, arrow
      // expansion, or sub/superscript markers while editing them.
      return;
    }

    if (formatShortcut(event) === settings.convertShortcut) {
      const converted = convertKeywordAtCursor({ silent: isPlainShiftEnter(event) });
      if (converted || !isPlainShiftEnter(event)) {
        event.preventDefault();
      }
      return;
    }

    if (event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setBaseline(baseline - 1);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setBaseline(baseline + 1);
        return;
      }
    }

    if (baseline !== 0 && event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      const mark = baselineMark();
      event.preventDefault();
      if (event.key === ' ') {
        replaceRange(editor.selectionStart, editor.selectionEnd, ' ');
      } else {
        replaceRange(editor.selectionStart, editor.selectionEnd, mark.repeat(Math.abs(baseline)) + event.key);
      }
      return;
    }

    const plainKey = !event.ctrlKey && !event.altKey && !event.metaKey;

    if (plainKey && (event.key === 'Backspace' || event.key === 'Delete')) {
      event.preventDefault();
      deleteScriptAware(event.key === 'Backspace' ? 'backward' : 'forward');
      return;
    }

    if (plainKey && BRACKET_PAIRS[event.key]) {
      event.preventDefault();
      insertBracketPair(event.key);
      return;
    }

    if (
      plainKey &&
      BRACKET_CLOSERS.has(event.key) &&
      editor.selectionStart === editor.selectionEnd &&
      editor.value[editor.selectionStart] === event.key
    ) {
      event.preventDefault();
      editor.setSelectionRange(editor.selectionStart + 1, editor.selectionStart + 1);
      rememberSelection();
      updateStatus();
      renderHighlights();
      return;
    }

    if (event.key === 'Tab' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      const suggestion = getAutocompleteSuggestion();
      if (suggestion) {
        replaceRange(suggestion.end, suggestion.end, suggestion.suffix);
        showToast(`Completed ${suggestion.keyword}`, 900);
      } else {
        replaceRange(editor.selectionStart, editor.selectionEnd, '\t');
      }
    }
  });

  document.addEventListener('keydown', (event) => {
    if (capturingShortcut) {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'Escape') {
        stopShortcutCapture();
        showToast('Shortcut unchanged', 1100);
        return;
      }

      if (MODIFIER_KEYS.has(event.key)) {
        return;
      }

      const shortcut = formatShortcut(event);
      if (!event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
        shortcutNote.textContent = 'Use at least one modifier key, such as Shift, Ctrl, or Alt.';
        return;
      }

      if (RESERVED_SHORTCUTS.has(shortcut)) {
        shortcutNote.textContent = 'That combination is already used by LogicG8. Try another.';
        return;
      }

      updateSetting('convertShortcut', shortcut);
      stopShortcutCapture();
      shortcutNote.textContent = `Saved as ${displayShortcut(shortcut)}.`;
      showToast(`Converter shortcut set to ${displayShortcut(shortcut)}`, 1400);
      return;
    }

    const modifier = event.ctrlKey || event.metaKey;

    if (event.key === 'Escape' && findOpen) {
      event.preventDefault();
      closeFind();
      return;
    }

    if (event.key === 'F3' && findQuery) {
      event.preventDefault();
      if (!findOpen) {
        openFind({ fromEnd: true });
        if (event.shiftKey) {
          refreshFind({ reveal: true, step: 'prev' });
        }
      } else {
        refreshFind({ reveal: true, step: event.shiftKey ? 'prev' : 'next' });
      }
      return;
    }

    if (event.key === 'Escape' && openPopover) {
      event.preventDefault();
      closePopovers();
      editor.focus();
      return;
    }

    if (!modifier || event.altKey) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === 'f') {
      event.preventDefault();
      openFind();
      return;
    }

    if (key === 'm' && event.shiftKey) {
      if (event.defaultPrevented) {
        return;
      }
      event.preventDefault();
      toggleMarkdownMode();
      return;
    }

    if (key === 's') {
      event.preventDefault();
      saveFile(event.shiftKey);
    } else if (key === 'o') {
      event.preventDefault();
      openFile();
    } else if (key === 'n') {
      event.preventDefault();
      createNewFile();
    } else if (key === 'w') {
      event.preventDefault();
      closeTabOrWindow();
    } else if (key === '=' || key === '+') {
      event.preventDefault();
      stepFontSize(1);
    } else if (key === '-' || key === '_') {
      event.preventDefault();
      stepFontSize(-1);
    }
  });

  logicTrigger.addEventListener('click', () => togglePopover('logic'));
  fontTrigger.addEventListener('click', () => togglePopover('font'));
  shortcutTrigger.addEventListener('click', () => togglePopover('shortcut'));
  fontSizeDown.addEventListener('click', () => stepFontSize(-1));
  fontSizeUp.addEventListener('click', () => stepFontSize(1));

  shortcutSet.addEventListener('click', () => {
    capturingShortcut = true;
    shortcutPopover.classList.add('is-capturing');
    shortcutSet.textContent = 'Listening…';
    shortcutNote.textContent = 'Press the new combination now. Escape cancels.';
  });

  shortcutReset.addEventListener('click', () => {
    updateSetting('convertShortcut', DEFAULT_SETTINGS.convertShortcut);
    stopShortcutCapture();
    showToast(`Converter shortcut reset to ${displayShortcut(DEFAULT_SETTINGS.convertShortcut)}`, 1400);
  });

  keywordSearch.addEventListener('input', renderKeywordList);
  keywordSearch.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const first = keywordList.querySelector('.keyword-row');
      if (first) {
        event.preventDefault();
        first.click();
      }
    }
  });

  document.addEventListener('pointerdown', (event) => {
    if (
      event.target.closest('.popover') ||
      event.target.closest('#logicTrigger') ||
      event.target.closest('#fontTrigger')
    ) {
      return;
    }
    closePopovers();
  }, true);

  document.getElementById('newButton').addEventListener('click', createNewFile);
  document.getElementById('openButton').addEventListener('click', openFile);
  document.getElementById('saveButton').addEventListener('click', () => saveFile(false));
  drawTrigger.addEventListener('click', createDrawing);

  findInput.addEventListener('input', () => {
    findQuery = findInput.value;
    refreshFind({ reveal: true, reset: true });
  });

  findBar.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      refreshFind({ reveal: true, step: event.shiftKey ? 'prev' : 'next' });
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeFind();
    }
  });

  findPrevButton.addEventListener('click', () => refreshFind({ reveal: true, step: 'prev' }));
  findNextButton.addEventListener('click', () => refreshFind({ reveal: true, step: 'next' }));
  findCaseButton.addEventListener('click', () => {
    findMatchCase = !findMatchCase;
    findCaseButton.setAttribute('aria-pressed', String(findMatchCase));
    findCaseButton.title = findMatchCase ? 'Match case (on)' : 'Match case';
    refreshFind({ reveal: true, reset: true });
  });
  findCloseButton.addEventListener('click', closeFind);

  // Keep the query field focused while the bar's buttons are clicked.
  for (const button of findBar.querySelectorAll('button')) {
    button.addEventListener('mousedown', (event) => event.preventDefault());
  }

  markdownToggle.addEventListener('click', toggleMarkdownMode);
  markdownView.addEventListener('click', handleMarkdownClick);
  markdownView.addEventListener('scroll', () => {
    const tab = activeTab();
    if (tab && tab.mode === 'markdown') {
      tab.markdownScroll = markdownView.scrollTop;
    }
  });

  if (window.mardraw && typeof window.mardraw.onOpenPath === 'function') {
    window.mardraw.onOpenPath(handleOpenPathFromMain);
  }

  document.addEventListener('dragenter', handleDragEnter);
  document.addEventListener('dragover', handleDragOver);
  document.addEventListener('dragleave', handleDragLeave);
  document.addEventListener('drop', handleFileDrop);

  backButton.addEventListener('click', goBack);

  function hideContextMenu() {
    contextMenu.hidden = true;
    contextMenuState = null;
  }

  function showContextMenu(x, y, link) {
    const removeItem = contextMenu.querySelector('[data-action="remove"]');
    removeItem.hidden = !link;
    contextMenuState = { link };
    contextMenu.hidden = false;
    contextMenu.style.left = '0px';
    contextMenu.style.top = '0px';
    requestAnimationFrame(() => {
      const rect = contextMenu.getBoundingClientRect();
      let left = x;
      let top = y;
      if (left + rect.width > window.innerWidth - 6) {
        left = Math.max(6, x - rect.width);
      }
      if (top + rect.height > window.innerHeight - 6) {
        top = Math.max(6, y - rect.height);
      }
      contextMenu.style.left = `${left}px`;
      contextMenu.style.top = `${top}px`;
    });
  }

  editor.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    const linkElement = linkElementAtPoint(event.clientX, event.clientY);
    const link = linkElement ? findLinkById(linkElement.dataset.linkId) : null;
    showContextMenu(event.clientX, event.clientY, link);
  });

  contextMenu.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.getAttribute('data-action');
    const linkToRemove = contextMenuState && contextMenuState.link;
    hideContextMenu();
    if (action === 'link') {
      createLinkAtSelection();
    } else if (action === 'remove' && linkToRemove) {
      removeLink(linkToRemove.id);
    }
  });

  document.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('#contextMenu')) {
      hideContextMenu();
    }
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hideContextMenu();
      hideDropOverlay();
    }
  });

  fontFamily.addEventListener('change', () => updateSetting('fontFamily', fontFamily.value));
  fontWeight.addEventListener('change', () => updateSetting('fontWeight', fontWeight.value));
  fontSize.addEventListener('input', () => updateSetting('fontSize', Number(fontSize.value)));
  lineHeight.addEventListener('input', () => updateSetting('lineHeight', Number(lineHeight.value)));
  letterSpacing.addEventListener('input', () => updateSetting('letterSpacing', Number(letterSpacing.value)));
  resetFont.addEventListener('click', () => {
    settings = { ...DEFAULT_SETTINGS };
    saveSettings();
    applySettings();
    showToast('Font settings reset', 1000);
  });

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(() => {
      updateLayoutMetrics();
      syncScroll();
    });
    observer.observe(editor);
    observer.observe(editorFrame);
  }

  window.addEventListener('resize', () => {
    updateLayoutMetrics();
    syncScroll();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Control' || event.key === 'Meta') {
      ctrlHeld = true;
      if (lastPointer) {
        updateHoverState(lastPointer.x, lastPointer.y);
      }
    }
  });

  document.addEventListener('keyup', (event) => {
    if (event.key === 'Control' || event.key === 'Meta') {
      ctrlHeld = false;
      if (lastPointer) {
        updateHoverState(lastPointer.x, lastPointer.y);
      }
    }
  });

  window.addEventListener('blur', () => {
    ctrlHeld = false;
    editor.style.cursor = '';
    hideSymbolTooltip();
    hideDropOverlay();
  });

  window.addEventListener('beforeunload', (event) => {
    commitActiveTab();
    if (!tabs.some((tab) => tab.dirty)) {
      return;
    }
    event.preventDefault();
    event.returnValue = '';
  });

  initialize();
})();
