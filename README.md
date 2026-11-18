# LogicG8

A dark, fast notepad for symbolic logic.

Type logical keywords in plain English and convert them to proper symbols
(`and` → `∧`, `not` → `¬`, `forall` → `∀`, …), write Markdown, sketch a quick
diagram, and link notes together. LogicG8 is a desktop app built with Electron.

## Features

- **Keyword → symbol conversion** — type a keyword and press the converter
  shortcut to replace it with the matching logic symbol.
- **Symbol palette** — a symbol strip in the toolbar plus a searchable
  "Logic Symbols" popover; hover any symbol in your text to read what it means.
- **Markdown preview** — `.md` files open in a rendered preview with a
  raw-text toggle.
- **Draw mode** — pencil, line and text tools that save as PNG.
- **Links between files** — link a selection or line to another note and
  Ctrl-click to follow it, with a back button.
- **Tabs** — keep many files open at once.
- **Sub/superscript** — step down or up a baseline as you type.
- **Spell-check** — a built-in ~275,000-word dictionary underlines misspelled
  words with a red squiggle; right-click a word for suggestions or to add it
  to your own dictionary.
- **Font controls** — family, weight, size, line height and letter spacing.
- **Formalize** — highlight phrases of a natural-language argument, assign
  them to variables (P, ¬P, …), and see its symbolic form, whether it's
  valid, and where the wording doesn't support the symbols (false
  dichotomies, equivocation).

## Installation

### Windows installer (recommended)

1. Download the latest `LogicG8-Setup-*.exe` from
   [Releases](../../releases) (or build it yourself — see
   [Building from source](#building-from-source)).
2. Run the installer. It installs per user, so no administrator rights are
   required.
3. Launch **LogicG8** from the Start menu or the desktop shortcut.

The installer sets up two convenient integrations automatically:

- **`.logic` files open in LogicG8 by default** — double-click any `.logic`
  file to open it.
- **"New → Logic File"** — right-click in a folder, hover **New**, and pick
  **Logic File** to create a blank `.logic` file.

> The installer is unsigned, so Windows SmartScreen may show a
> "Windows protected your PC" prompt on first run — choose
> **More info → Run anyway**.

### Run from source

Requires [Node.js](https://nodejs.org) (LTS) and npm.

```sh
git clone https://github.com/martreedev/logicg8.git
cd logicg8
npm install
npm start
```

## Usage

### Writing logic

1. Type a keyword such as `and`, `or`, `not`, `implies`, or `forall`.
2. Press **Shift + Enter** (the default converter shortcut) — the word becomes
   its symbol: `∧`, `∨`, `¬`, `⇒`, `∀`.

You can also press **Tab** to autocomplete the keyword under the cursor, or
click a symbol in the toolbar strip / "Logic Symbols" popover to insert it.

Common keywords:

| Keyword(s)                    | Symbol | Name             |
| ----------------------------- | :----: | ---------------- |
| `and`, `both`                 |   ∧    | conjunction      |
| `or`, `either`                |   ∨    | disjunction      |
| `not`                         |   ¬    | negation         |
| `implies`, `then`             |   ⇒    | conditional      |
| `iff`, `if and only if`       |   ↔    | biconditional    |
| `xor`                         |   ⊕    | exclusive or     |
| `forall`, `for all`           |   ∀    | universal        |
| `exists`, `there exists`      |   ∃    | existential      |
| `therefore`, `thus`           |   ∴    | therefore        |
| `entails`, `models`           |   ⊨    | entailment       |
| `proves`                      |   ⊢    | provability      |
| `necessary`                   |   □    | necessity        |
| `possible`                    |   ◇    | possibility      |
| `contradiction`               |   ⊥    | falsum           |

Typing `->` also turns into `⇒` as you type. Hover any symbol in your text to
see its name, how it's read, and its definition.

The converter shortcut is configurable — click **Shortcut** in the toolbar,
then "Press a new shortcut".

### Markdown

Open a `.md` file (or save one with a `.md` name) to get a rendered preview.
Press **Ctrl + Shift + M** to switch between preview and raw text. Relative
links and images in the preview resolve against the file's folder.

### Drawing

Click **Draw mode** in the toolbar. Use the pencil, line and text tools
(**P** / **L** / **T**), then **Ctrl + S** to save as a PNG.

### Linking notes

1. Select some text (or place the cursor on a line) in a saved file.
2. Right-click → **Link selection to file…** and pick the target file.
3. **Ctrl + click** the highlighted link to open it in a new tab; the back
   button (↩) returns you to where you came from.

### Subscript / superscript

- **Shift + ArrowDown** — step to subscript; type normally to write subscripts.
- **Shift + ArrowUp** — step to superscript.
- Step back to the normal baseline with the opposite arrow.

### Formalizing an argument

1. Write the argument with labelled lines: `P1.`, `P2.`, … for premises and
   `C.` (or a line starting with "Therefore") for the conclusion.
2. Select a phrase, right-click → **Assign to variable…**, and type a name
   (`P`) — or `¬P` (`!P`, `~P`) if the phrase denies P. Existing variables
   appear as one-click chips.
3. Include or leave the connective words around your selections — *if,
   then, only if, or, and, unless, not* (or the symbols) become ⇒ ∨ ∧ ¬.

The **Formalize** panel shows each line as a formula, a valid/invalid
verdict with a counterexample, and wording checks. If a phrase assigned to
¬P doesn't actually negate P ("from another" vs "from itself"), it's flagged
as an assumed dichotomy and the argument is re-checked with that phrase as
its own variable. **Insert symbolic form** appends the formal version to the
file. Variables are stored per file on this machine, like links.

### Spell checking

Misspelled words are underlined with a red squiggle as you type.

- **Right-click** a squiggled word to see up to five suggested corrections;
  click one to replace the word.
- Choose **Add to dictionary** to stop flagging a word (for example a name or
  a logic term). Your added words are remembered and kept separate from the
  built-in dictionary.

Single letters (logic variables like `P`, `Q`, `x`) are never flagged, and
logic keywords (such as `forall` or `implies`) are treated as correct.

## Keyboard shortcuts

| Shortcut          | Action                                          |
| ----------------- | ----------------------------------------------- |
| `Ctrl + N`        | New file                                        |
| `Ctrl + O`        | Open file                                       |
| `Ctrl + S`        | Save                                            |
| `Ctrl + Shift + S`| Save as                                         |
| `Ctrl + W`        | Close tab (or window when it's the last tab)    |
| `Ctrl + F`        | Find                                            |
| `F3` / `Shift + F3` | Next / previous match                         |
| `Ctrl + Shift + M`| Toggle Markdown preview / raw text              |
| `Ctrl + =` / `Ctrl + -` | Increase / decrease font size             |
| `Ctrl + scroll`   | Increase / decrease font size                   |
| `Tab`             | Autocomplete the keyword under the cursor       |
| `Shift + Enter`   | Convert keyword to symbol (default, configurable)|
| `Shift + ArrowDown` / `Shift + ArrowUp` | Subscript / superscript          |
| `Esc`             | Close find / popovers / context menu            |

In draw mode: **P** pencil, **L** line, **T** text, **Ctrl + Z** undo,
**Ctrl + Shift + Z** redo.

## File types

LogicG8 opens and saves these files:

- Logic and plain text — `.logic`, `.syllogism`, `.txt`, extensionless files
- Markdown — `.md`, `.markdown`, `.mdown`, `.mkd`
- Images (draw mode) — `.png`

You can also drag and drop any of these onto the window.

## Uninstalling

**Settings → Apps → LogicG8 → Uninstall**, or run
`Uninstall LogicG8.exe` from the install folder
(`%LOCALAPPDATA%\Programs\LogicG8`). Uninstalling also removes the "New →
Logic File" menu entry and the file association.

## Building from source

```sh
npm install

# Run the app
npm start

# Build a Windows installer into dist/
npm run dist

# Build an unpacked standalone app (no installer)
npm run pack
```

The installer is produced by [electron-builder](https://www.electron.build).
The file association lives in the `fileAssociations` block of `package.json`,
and the "New → Logic File" entry is added by `scripts/installer.nsh`.

### Releasing an update

Packaged builds check GitHub Releases on launch, before the main window opens.
To publish a new version:

1. Bump `version` in `package.json` (for example to `1.2.0`).
2. Commit the change and create a matching tag (`git tag v1.2.0`).
3. Publish with a GitHub token that can write to this repository:

```sh
set GH_TOKEN=your-token
npm run dist:publish
```

electron-builder uploads the installer, `latest.yml`, and the blockmap to the
GitHub release for that version. Installed copies find the release on their
next launch, download it, and restart into the new version. A build can only
update to a strictly higher version, so the bump is required every time.

## Project structure

```
src/        app source (main, preload, renderer, styles)
assets/     app icon
scripts/    dev helpers and the NSIS installer add-on
```

## License

No license is currently specified for this project.
