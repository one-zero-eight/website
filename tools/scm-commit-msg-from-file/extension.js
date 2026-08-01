const fs = require("node:fs");
const path = require("node:path");
const vscode = require("vscode");

const MSG_FILE = ".scm-commit-msg";

/** @type {Map<string, string>} */
const lastSyncedMessage = new Map();

/** @type {Map<string, number>} */
const syncGeneration = new Map();

function bumpGeneration(repoRoot) {
  const root = path.resolve(repoRoot);
  const next = (syncGeneration.get(root) ?? 0) + 1;
  syncGeneration.set(root, next);
  return next;
}

function currentGeneration(repoRoot) {
  return syncGeneration.get(path.resolve(repoRoot)) ?? 0;
}

async function getGitApi() {
  const gitExt = vscode.extensions.getExtension("vscode.git");
  if (!gitExt) {
    return null;
  }
  if (!gitExt.isActive) {
    await gitExt.activate();
  }
  return gitExt.exports.getAPI(1);
}

function findRepository(api, repoRoot) {
  const normalized = path.resolve(repoRoot);
  return api.repositories.find((repo) => path.resolve(repo.rootUri.fsPath) === normalized);
}

function clearMsgFile(repoRoot) {
  const filePath = path.join(repoRoot, MSG_FILE);
  if (!fs.existsSync(filePath)) {
    return;
  }
  fs.unlinkSync(filePath);
}

function normalizeMessage(message) {
  return String(message).replace(/\s+$/, "");
}

async function clearInputIfMatches(repoRoot, expected) {
  if (expected === null || expected === undefined || expected === "") {
    return;
  }
  const api = await getGitApi();
  if (!api) {
    return;
  }
  const repository = findRepository(api, repoRoot);
  if (!repository) {
    return;
  }
  if (normalizeMessage(repository.inputBox.value) === normalizeMessage(expected)) {
    repository.inputBox.value = "";
  }
}

async function setCommitMessage(message, repositoryPath, generation) {
  const trimmed = normalizeMessage(message);
  if (!trimmed) {
    return false;
  }
  const root = path.resolve(repositoryPath);
  const api = await getGitApi();
  if (!api) {
    return false;
  }
  if (currentGeneration(root) !== generation) {
    return false;
  }
  const repository = findRepository(api, root);
  if (!repository) {
    return false;
  }
  if (currentGeneration(root) !== generation) {
    return false;
  }
  repository.inputBox.value = trimmed;
  lastSyncedMessage.set(root, trimmed);
  return true;
}

function readMsgFile(repoRoot) {
  const filePath = path.join(repoRoot, MSG_FILE);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return normalizeMessage(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter((line) => !line.startsWith("#"))
      .join("\n"),
  );
}

async function syncFromFile(repoRoot) {
  const root = path.resolve(repoRoot);
  const message = readMsgFile(root);
  if (!message) {
    return false;
  }
  const generation = bumpGeneration(root);
  lastSyncedMessage.set(root, message);
  return setCommitMessage(message, root, generation);
}

async function cleanupAfterCommit(repoRoot) {
  const root = path.resolve(repoRoot);
  bumpGeneration(root);
  const fromFile = readMsgFile(root);
  const expected = fromFile ?? lastSyncedMessage.get(root) ?? null;
  await clearInputIfMatches(root, expected);
  clearMsgFile(root);
  lastSyncedMessage.delete(root);
}

async function cleanupAfterFileRemoved(repoRoot) {
  const root = path.resolve(repoRoot);
  bumpGeneration(root);
  const expected = lastSyncedMessage.get(root);
  if (!expected) {
    return;
  }
  await clearInputIfMatches(root, expected);
  lastSyncedMessage.delete(root);
}

function handleMsgFileFsEvent(repoRoot) {
  const root = path.resolve(repoRoot);
  const filePath = path.join(root, MSG_FILE);
  if (fs.existsSync(filePath)) {
    void syncFromFile(root);
    return;
  }
  void cleanupAfterFileRemoved(root);
}

function watchMsgFile(context, rootPath, watchedFiles) {
  const normalized = path.resolve(rootPath);
  if (watchedFiles.has(normalized)) {
    return;
  }
  watchedFiles.add(normalized);

  // VS Code watcher (may miss gitignored files on some setups).
  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(vscode.Uri.file(normalized), MSG_FILE),
  );
  watcher.onDidCreate(() => {
    void syncFromFile(normalized);
  });
  watcher.onDidChange(() => {
    void syncFromFile(normalized);
  });
  watcher.onDidDelete(() => {
    void cleanupAfterFileRemoved(normalized);
  });
  context.subscriptions.push(watcher);

  // Node watcher — reliable for agent/CLI create/delete of gitignored files.
  try {
    const fsWatcher = fs.watch(normalized, { persistent: false }, (_event, filename) => {
      if (!filename || filename.toString() !== MSG_FILE) {
        return;
      }
      handleMsgFileFsEvent(normalized);
    });
    fsWatcher.on("error", () => {});
    context.subscriptions.push({ dispose: () => fsWatcher.close() });
  } catch {
    // Directory may be unwatchable; VS Code watcher remains.
  }

  void syncFromFile(normalized);
}

function activate(context) {
  const watchedFiles = new Set();
  const hookedCommits = new Set();

  function trackRepository(repository) {
    const root = path.resolve(repository.rootUri.fsPath);
    watchMsgFile(context, root, watchedFiles);
    if (hookedCommits.has(root)) {
      return;
    }
    hookedCommits.add(root);
    context.subscriptions.push(
      repository.onDidCommit(() => {
        void cleanupAfterCommit(root);
      }),
    );
    // After external git commits, re-check: if msg file is gone, clear matching input.
    context.subscriptions.push(
      repository.state.onDidChange(() => {
        if (fs.existsSync(path.join(root, MSG_FILE))) {
          return;
        }
        const expected = lastSyncedMessage.get(root);
        if (!expected) {
          return;
        }
        void cleanupAfterFileRemoved(root);
      }),
    );
  }

  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    watchMsgFile(context, folder.uri.fsPath, watchedFiles);
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders((event) => {
      for (const folder of event.added) {
        watchMsgFile(context, folder.uri.fsPath, watchedFiles);
      }
    }),
  );

  void (async () => {
    const api = await getGitApi();
    if (!api) {
      return;
    }
    for (const repo of api.repositories) {
      trackRepository(repo);
    }
    context.subscriptions.push(
      api.onDidOpenRepository((repo) => {
        trackRepository(repo);
      }),
    );
  })();

  context.subscriptions.push(
    vscode.commands.registerCommand("scmCommitMsg.set", async () => {
      const api = await getGitApi();
      const roots = new Set([
        ...(vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath),
        ...(api?.repositories ?? []).map((repo) => repo.rootUri.fsPath),
      ]);
      for (const root of roots) {
        await syncFromFile(root);
      }
    }),
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
