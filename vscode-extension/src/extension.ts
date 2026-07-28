import * as path from "path";
import * as vscode from "vscode";
import {
  comparePythonFiles,
  formatComparisonReport,
  type ComparisonResponse,
} from "./api";

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
    statusBar.command = "lineage.checkActiveFile";
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
    getOutput(),
    getStatusBar()
  );
}

export function deactivate() {
  output?.dispose();
  statusBar?.dispose();
}
