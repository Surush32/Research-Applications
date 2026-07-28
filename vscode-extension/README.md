# Lineage Copy Check (VS Code Extension)

VS Code extension for **Catching the Copy**. It sends Python files to the existing AST similarity API and shows structural-similarity warnings in the editor.

## What users get after installing

| Command | What it does |
| --- | --- |
| **Lineage: Compare with File…** | Compare the open `.py` file to another file you pick |
| **Lineage: Check Active File** | Compare the open file to a configured reference (or `original.py` if found) |
| **Lineage: Compare with Clipboard** | Compare the open file to code copied from ChatGPT / the web |

Results appear as:
- a notification (flagged / clear + recommendation)
- the **Lineage** output channel (full score report)
- a status-bar indicator

## Settings

- `lineage.apiUrl` — default `https://catching-the-copy-bo.onrender.com`
- `lineage.threshold` — default `0.75`
- `lineage.referenceFile` — optional path for Check Active File (e.g. `AST/AST/original.py`)

## Develop / demo (F5)

```bash
cd vscode-extension
npm install
npm run compile
```

Then open this `vscode-extension` folder in VS Code/Cursor and press **F5**  
→ a new Extension Development Host window opens.

1. Open a `.py` file (e.g. `AST/AST/suspect.py` from the main repo)
2. `Ctrl+Shift+P` → **Lineage: Compare with File…**
3. Pick `original.py`

## Install for teammates (.vsix)

```bash
cd vscode-extension
npm install
npm run compile
npx vsce package --no-dependencies
```

In VS Code: **Extensions → … → Install from VSIX…** → choose the generated `.vsix`.

## Architecture

```text
VS Code extension  →  POST /compare (Render AST API)  →  scores + recommendation
```

Same backend as the Lineage web app. Azure protected-material checks can be added later as a second command once the web `/api/azure-check` route exists.
