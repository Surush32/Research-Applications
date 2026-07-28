# Lineage Copy Check (VS Code Extension)

VS Code extension for **Catching the Copy**. It sends Python files to the existing AST similarity API and shows structural-similarity warnings in the editor.

## What users get after installing

| Command | What it does |
| --- | --- |
| **Lineage: Compare with File…** | Compare the open `.py` file to another file you pick |
| **Lineage: Check Active File** | Compare the open file to a configured reference (or `original.py` if found) |
| **Lineage: Compare with Clipboard** | Compare the open file to code copied from ChatGPT / the web |
| **Lineage: Azure Protected Material Check** | Send the open file to Azure (via Lineage web API). If flagged, offer to insert a citation comment with GitHub source links |

### How Azure comments work

```text
1. You run “Lineage: Azure Protected Material Check”
2. Extension sends the open file to http://localhost:3000/api/azure-check
   (or directly to Azure if webAppUrl is empty and azure settings are set)
3. Azure returns detected + license + GitHub citation URLs
4. If detected, extension asks: Insert Comment?
5. Clicking Insert Comment writes a Python header comment with the links
```

Settings:
- `lineage.webAppUrl` — default `http://localhost:3000` (recommended)
- `lineage.azureEndpoint` / `lineage.azureKey` — optional direct Azure fallback

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
