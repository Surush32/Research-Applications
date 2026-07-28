import * as path from "path";
import * as vscode from "vscode";
import {
  comparePythonFiles,
  formatComparisonReport,
  type ComparisonResponse,
} from "./api";
import {
  buildAzureCitationComment,
  formatAzureReport,
  runAzureProtectedCheck,
  type AzureFileResult,
} from "./azure";

let output: vscode.OutputChannel | undefined;
let statusBar: vscode.StatusBarItem | undefined;

function getOutput() {
  if (!output) {
    output = vscode.window.createOutputChannel("Lineage");
  }
  return output;
}

function getStatusBar() {
  if (!statusBar) {
    statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      50
    );
    statusBar.command = "lineage.azureCheckActiveFile";
  }
  return statusBar;
}

function config() {
  const cfg = vscode.workspace.getConfiguration("lineage");
  return {
    apiUrl: cfg.get<string>(
      "apiUrl",
      "https://catching-the-copy-bo.onrender.com"
    ),
    threshold: cfg.get<number>("threshold", 0.75),
    referenceFile: cfg.get<string>("referenceFile", ""),
    webAppUrl: cfg.get<string>("webAppUrl", "http://localhost:3000"),
    azureEndpoint: cfg.get<string>("azureEndpoint", ""),
    azureKey: cfg.get<string>("azureKey", ""),
  };
}

function requirePythonEditor() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    throw new Error("Open a Python file first.");
  }
  if (editor.document.languageId !== "python") {
    throw new Error("Lineage currently checks Python (.py) files only.");
  }
  return editor;
}

async function pickPythonFile(label: string) {
  const uris = await vscode.window.showOpenDialog({
    canSelectMany: false,
    openLabel: label,
    filters: { Python: ["py"] },
  });
  return uris?.[0];
}

async function readUri(uri: vscode.Uri) {
  const bytes = await vscode.workspace.fs.readFile(uri);
  return Buffer.from(bytes).toString("utf8");
}

function showResult(
  fileA: string,
  fileB: string,
  result: ComparisonResponse
) {
  const report = formatComparisonReport(fileA, fileB, result);
  const channel = getOutput();
  channel.clear();
  channel.appendLine(report);
  channel.show(true);

  const bar = getStatusBar();
  if (result.exceeds_threshold) {
    bar.text = `$(alert) Lineage: ${(result.aggregate * 100).toFixed(0)}% similar`;
    bar.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground"
    );
  } else {
    bar.text = `$(check) Lineage: ${(result.aggregate * 100).toFixed(0)}% similar`;
    bar.backgroundColor = undefined;
  }
  bar.tooltip = result.recommendation;
  bar.show();

  const title = result.exceeds_threshold
    ? "High similarity detected"
    : "No significant similarity";

  void vscode.window
    .showInformationMessage(
      `${title}: ${(result.aggregate * 100).toFixed(1)}% — ${result.recommendation}`,
      "Show Report"
    )
    .then((choice) => {
      if (choice === "Show Report") {
        channel.show(true);
      }
    });
}

async function insertAzureCitationComment(
  editor: vscode.TextEditor,
  result: AzureFileResult
) {
  const comment = buildAzureCitationComment(result);
  const alreadyTagged = editor.document.getText().includes("LINEAGE WARNING");
  if (alreadyTagged) {
    const replace = await vscode.window.showWarningMessage(
      "This file already has a Lineage warning comment. Replace it?",
      "Replace",
      "Cancel"
    );
    if (replace !== "Replace") {
      return;
    }
  }

  await editor.edit((editBuilder) => {
    // Remove a previous Lineage warning block if present at the top.
    const text = editor.document.getText();
    const marker = "# =============================================================================\n# LINEAGE WARNING";
    if (text.startsWith("# =============================================================================\n# LINEAGE WARNING")) {
      const endMarker = "# =============================================================================\n\n";
      const endIndex = text.indexOf(endMarker);
      if (endIndex >= 0) {
        const endPos = editor.document.positionAt(
          endIndex + endMarker.length
        );
        editBuilder.delete(new vscode.Range(new vscode.Position(0, 0), endPos));
      }
    }
    editBuilder.insert(new vscode.Position(0, 0), comment);
  });

  void vscode.window.showInformationMessage(
    "Inserted Azure citation guidance at the top of the file."
  );
}

async function showAzureResult(
  editor: vscode.TextEditor,
  result: AzureFileResult
) {
  const channel = getOutput();
  channel.clear();
  channel.appendLine(formatAzureReport(result));
  channel.show(true);

  const bar = getStatusBar();
  if (result.detected) {
    bar.text = "$(alert) Lineage Azure: protected material";
    bar.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground"
    );
  } else {
    bar.text = `$(check) Lineage Azure: ${result.status}`;
    bar.backgroundColor = undefined;
  }
  bar.tooltip = result.recommendation;
  bar.show();

  if (result.detected) {
    const choice = await vscode.window.showWarningMessage(
      `Azure flagged ${result.name}. Insert citation comment with GitHub source links?`,
      "Insert Comment",
      "Show Report",
      "Open First Source"
    );

    if (choice === "Insert Comment") {
      await insertAzureCitationComment(editor, result);
    } else if (choice === "Show Report") {
      channel.show(true);
    } else if (choice === "Open First Source") {
      const url = result.citations[0]?.sourceUrls[0];
      if (url) {
        await vscode.env.openExternal(vscode.Uri.parse(url));
      }
    }
    return;
  }

  void vscode.window.showInformationMessage(
    `Azure: ${result.status} — ${result.recommendation}`,
    "Show Report"
  ).then((choice) => {
    if (choice === "Show Report") {
      channel.show(true);
    }
  });
}

async function runCompare(
  fileAName: string,
  fileAContent: string,
  fileBName: string,
  fileBContent: string
) {
  const { apiUrl, threshold } = config();

  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Lineage: comparing Python files…",
      cancellable: false,
    },
    async () => {
      const result = await comparePythonFiles({
        apiUrl,
        threshold,
        fileAName,
        fileAContent,
        fileBName,
        fileBContent,
      });
      showResult(fileAName, fileBName, result);
      return result;
    }
  );
}

async function compareWithFile() {
  const editor = requirePythonEditor();
  const other = await pickPythonFile("Compare with this file");
  if (!other) {
    return;
  }

  const fileAName = path.basename(editor.document.fileName);
  const fileBName = path.basename(other.fsPath);
  const fileBContent = await readUri(other);

  await runCompare(
    fileAName,
    editor.document.getText(),
    fileBName,
    fileBContent
  );
}

async function resolveReferenceUri(): Promise<vscode.Uri | undefined> {
  const { referenceFile } = config();
  if (referenceFile.trim()) {
    const folders = vscode.workspace.workspaceFolders;
    if (folders?.[0]) {
      return vscode.Uri.joinPath(folders[0].uri, referenceFile.trim());
    }
  }

  const guesses = ["original.py", "AST/AST/original.py", "reference.py"];
  const folders = vscode.workspace.workspaceFolders;
  if (folders?.[0]) {
    for (const guess of guesses) {
      const uri = vscode.Uri.joinPath(folders[0].uri, guess);
      try {
        await vscode.workspace.fs.stat(uri);
        return uri;
      } catch {
        // try next
      }
    }
  }

  return pickPythonFile("Choose reference file to check against");
}

async function checkActiveFile() {
  const editor = requirePythonEditor();
  const reference = await resolveReferenceUri();
  if (!reference) {
    return;
  }

  await runCompare(
    path.basename(editor.document.fileName),
    editor.document.getText(),
    path.basename(reference.fsPath),
    await readUri(reference)
  );
}

async function compareWithClipboard() {
  const editor = requirePythonEditor();
  const clip = await vscode.env.clipboard.readText();
  if (!clip.trim()) {
    throw new Error("Clipboard is empty. Copy some Python code first.");
  }

  await runCompare(
    path.basename(editor.document.fileName),
    editor.document.getText(),
    "clipboard.py",
    clip
  );
}

/**
 * Flow:
 * 1) User runs “Lineage: Azure Protected Material Check”
 * 2) Extension sends the open file to Lineage web /api/azure-check (or Azure directly)
 * 3) Azure returns detected + citations
 * 4) If detected, extension offers “Insert Comment” and writes a header with GitHub links
 */
async function azureCheckActiveFile() {
  const editor = requirePythonEditor();
  const { webAppUrl, azureEndpoint, azureKey } = config();
  const fileName = path.basename(editor.document.fileName);
  const filePath = vscode.workspace.asRelativePath(editor.document.uri);

  const result = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Lineage: Azure protected-material check…",
      cancellable: false,
    },
    async () =>
      runAzureProtectedCheck({
        webAppUrl,
        azureEndpoint,
        azureKey,
        path: filePath,
        name: fileName,
        content: editor.document.getText(),
      })
  );

  await showAzureResult(editor, result);
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("lineage.compareWithFile", async () => {
      try {
        await compareWithFile();
      } catch (error) {
        void vscode.window.showErrorMessage(
          error instanceof Error ? error.message : "Lineage compare failed."
        );
      }
    }),
    vscode.commands.registerCommand("lineage.checkActiveFile", async () => {
      try {
        await checkActiveFile();
      } catch (error) {
        void vscode.window.showErrorMessage(
          error instanceof Error ? error.message : "Lineage check failed."
        );
      }
    }),
    vscode.commands.registerCommand(
      "lineage.compareWithClipboard",
      async () => {
        try {
          await compareWithClipboard();
        } catch (error) {
          void vscode.window.showErrorMessage(
            error instanceof Error
              ? error.message
              : "Lineage clipboard compare failed."
          );
        }
      }
    ),
    vscode.commands.registerCommand(
      "lineage.azureCheckActiveFile",
      async () => {
        try {
          await azureCheckActiveFile();
        } catch (error) {
          void vscode.window.showErrorMessage(
            error instanceof Error
              ? error.message
              : "Lineage Azure check failed."
          );
        }
      }
    ),
    getOutput(),
    getStatusBar()
  );
}

export function deactivate() {
  output?.dispose();
  statusBar?.dispose();
}
