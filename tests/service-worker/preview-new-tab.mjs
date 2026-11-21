import { chromium, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createPreviewProxy } from "./preview-proxy.mjs";
import {
  classifyResourceChanges,
  getResourceDownloads,
} from "./resource-downloads.mjs";

const { values } = parseArgs({
  options: {
    port: { type: "string" },
    "pause-ms": { type: "string", default: "4000" },
    "final-pause-ms": { type: "string", default: "10000" },
  },
});
const pauseMs = Number(values["pause-ms"]);
if (!Number.isInteger(pauseMs) || pauseMs < 0) {
  throw new Error("--pause-ms must be a nonnegative integer.");
}
const finalPauseMs = Number(values["final-pause-ms"]);
if (!Number.isInteger(finalPauseMs) || finalPauseMs < 0) {
  throw new Error("--final-pause-ms must be a nonnegative integer.");
}
const root = fileURLToPath(new URL("../../", import.meta.url));
let runningPreview;
let browser;
let outputDirectory;
let cleanupPromise;
let previewProxy;

async function isPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", (error) => {
      if (error.code === "EADDRINUSE") resolve(false);
      else reject(error);
    });
    server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
  });
}

async function choosePort() {
  if (values.port !== undefined) {
    const port = Number(values.port);
    if (!Number.isInteger(port) || port < 3000 || port > 3099) {
      throw new Error("--port must be an integer between 3000 and 3099.");
    }
    if (!(await isPortAvailable(port)))
      throw new Error(`Port ${port} is already in use.`);
    return port;
  }
  return findAvailablePort();
}

async function findAvailablePort(excludedPort) {
  for (let port = 3000; port <= 3099; port++) {
    if (port !== excludedPort && (await isPortAvailable(port))) return port;
  }
  throw new Error("No free preview port between 3000 and 3099.");
}

function startPreview(port) {
  const child = spawn(
    "pnpm",
    [
      "run",
      "preview",
      "--port",
      String(port),
      "--host",
      "127.0.0.1",
      "--outDir",
      outputDirectory,
    ],
    {
      cwd: root,
      stdio: "inherit",
      // The process group contains only this demo's pnpm and preview processes.
      detached: true,
    },
  );
  let exitResult = null;
  const exited = new Promise((resolve) => {
    child.once("error", (error) => {
      exitResult = { error: error.message };
      resolve(exitResult);
    });
    child.once("exit", (code, signal) => {
      exitResult = { code, signal };
      resolve(exitResult);
    });
  });
  runningPreview = {
    child,
    exited,
    get exitResult() {
      return exitResult;
    },
  };
}

function signalPreview(processInfo, signal) {
  if (!processInfo.child.pid) return;
  try {
    process.kill(-processInfo.child.pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

async function stopPreview() {
  const processInfo = runningPreview;
  if (!processInfo) return;
  runningPreview = undefined;
  signalPreview(processInfo, "SIGTERM");
  const timeout = setTimeout(
    () => signalPreview(processInfo, "SIGKILL"),
    10_000,
  );
  try {
    await processInfo.exited;
  } finally {
    clearTimeout(timeout);
  }
}

function cleanup() {
  cleanupPromise ??= (async () => {
    await stopPreview();
    if (previewProxy) await previewProxy.close();
    if (browser) await browser.close();
    if (outputDirectory)
      await rm(outputDirectory, { recursive: true, force: true });
  })();
  return cleanupPromise;
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    void cleanup().finally(() => process.exit(signal === "SIGINT" ? 130 : 143));
  });
}

async function waitForPreview(origin) {
  const deadline = Date.now() + 180_000;
  let lastError;
  while (Date.now() < deadline) {
    if (runningPreview.exitResult) {
      throw new Error(
        `pnpm run preview exited before becoming ready: ${JSON.stringify(runningPreview.exitResult)}`,
      );
    }
    let response;
    try {
      response = await fetch(`${origin}/build-manifest.json`, {
        signal: AbortSignal.timeout(2000),
        cache: "no-store",
      });
    } catch (error) {
      lastError = error;
    }
    if (response?.ok) {
      const manifest = await response.json();
      const [htmlResponse, workerResponse] = await Promise.all([
        fetch(`${origin}/index.html`, { cache: "no-store" }),
        fetch(`${origin}/sw.js`, { cache: "no-store" }),
      ]);
      if (!htmlResponse.ok || !workerResponse.ok)
        throw new Error("Preview is missing its HTML or worker script.");
      const html = await htmlResponse.text();
      const label = html.match(/HTML\s*·\s*(\d+)/u)?.[1];
      if (!label || !manifest.buildInfo?.buildId)
        throw new Error("Preview has no numeric HTML label or build metadata.");
      return {
        label: Number(label),
        manifest,
        buildInfo: manifest.buildInfo,
        workerHash: createHash("sha256")
          .update(await workerResponse.text())
          .digest("hex"),
      };
    }
    if (response) throw new Error(`Preview manifest HTTP ${response.status}`);
    await delay(500);
  }
  throw new Error("Preview did not start within 180 seconds.", {
    cause: lastError,
  });
}

async function readWorkerReply(page, type = "GET_STATE") {
  return page.evaluate(async (commandType) => {
    const controller = navigator.serviceWorker.controller;
    if (!controller) return null;
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timeout = setTimeout(
        () => {
          channel.port1.close();
          reject(new Error(`${commandType} timed out`));
        },
        commandType === "CHECK_MANIFEST" ? 120_000 : 15_000,
      );
      channel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        channel.port1.close();
        if (!event.data.ok) reject(new Error(event.data.error));
        else resolve(event.data.result);
      };
      controller.postMessage({ type: commandType }, [channel.port2]);
    });
  }, type);
}

async function readLatestReadyBuild(page) {
  return (await readWorkerReply(page))?.latestReadyBuildId ?? null;
}

async function assertOfflineBuild(page, build) {
  await expect(page.locator("#debug-html-build")).toHaveText(
    `HTML · ${build.label}`,
  );
  expect(await page.evaluate(() => globalThis.BUILD_INFO.buildId)).toBe(
    build.buildInfo.buildId,
  );
  await expect(page.getByText("You are offline", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  const diagnostics = await readWorkerReply(page, "GET_DIAGNOSTICS");
  expect(diagnostics.storage.latestReadyBuildId).toBe(build.buildInfo.buildId);
  expect(
    diagnostics.storage.builds.find(
      (stored) => stored.manifest.buildInfo.buildId === build.buildInfo.buildId,
    )?.state,
  ).toBe("ready");
  expect(
    diagnostics.storage.clients.find(
      (pin) => pin.clientId === diagnostics.runtimeClients.requestingClientId,
    ),
  ).toMatchObject({
    buildId: build.buildInfo.buildId,
    navigationSource: "cache",
  });
}

async function openAppTab(context, origin, build, pathname = "/debug") {
  const page = await context.newPage();
  let documentRequests = 0;
  let dialogs = 0;
  page.on("dialog", (dialog) => {
    dialogs++;
    void dialog.dismiss();
  });
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame())
      documentRequests++;
  });
  const response = await page.goto(`${origin}${pathname}`, {
    waitUntil: "domcontentloaded",
  });
  expect(response?.status()).toBe(200);
  expect(await response.text()).toContain(`HTML · ${build.label}`);
  await expect(page.locator("#app h1").first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator("#debug-html-build")).toHaveText(
    `HTML · ${build.label}`,
  );
  if (pathname === "/debug") {
    await expect(page.locator("#debug-title")).toBeVisible();
    await expect(page.locator("#debug-html-build")).toBeVisible();
    // Explicit component opt-out for comparing old/new builds. Debug itself defaults to auto-update.
    await page.getByLabel("Pause automatic updates on this page").check();
  }
  expect(await page.evaluate(() => globalThis.BUILD_INFO.buildId)).toBe(
    build.buildInfo.buildId,
  );
  return {
    page,
    get documentRequests() {
      return documentRequests;
    },
    get dialogs() {
      return dialogs;
    },
  };
}

async function assertSingleDocumentLoad(tab) {
  expect(tab.documentRequests).toBe(1);
  expect(
    await tab.page.evaluate(() =>
      sessionStorage.getItem("preview-demo-document-loads"),
    ),
  ).toBe("1");
}

try {
  const port = await choosePort();
  const origin = `http://127.0.0.1:${port}`;
  const backendPort = await findAvailablePort(port);
  const backendOrigin = `http://127.0.0.1:${backendPort}`;
  previewProxy = await createPreviewProxy({ port, backendPort });
  const cacheDirectory = join(root, "node_modules/.cache");
  await mkdir(cacheDirectory, { recursive: true });
  outputDirectory = await mkdtemp(join(cacheDirectory, "sw-preview-demo-"));

  console.info(
    `\n[1/12] Первый pnpm run preview. Браузер: ${origin}; preview: ${backendOrigin}. Другие серверы не останавливаем.`,
  );
  startPreview(backendPort);
  const firstBuild = await waitForPreview(backendOrigin);
  browser = await chromium.launch({
    headless: false,
    slowMo: 150,
    args: ["--start-maximized"],
  });
  const context = await browser.newContext({
    viewport: null,
    locale: "en-US",
  });
  await context.addInitScript(() => {
    const count =
      Number(sessionStorage.getItem("preview-demo-document-loads") ?? "0") + 1;
    sessionStorage.setItem("preview-demo-document-loads", String(count));
  });
  const firstTab = await openAppTab(context, origin, firstBuild);
  console.info(
    `[2/12] Первая вкладка: HTML · ${firstBuild.label}, buildId ${firstBuild.buildInfo.buildId}.`,
  );
  await delay(pauseMs);
  // Wait for the normal registration flow, without forcing CHECK_MANIFEST.
  await expect
    .poll(() => readLatestReadyBuild(firstTab.page), {
      timeout: 180_000,
      intervals: [500],
    })
    .toBe(firstBuild.buildInfo.buildId);
  console.info(
    "Первая сборка закеширована. В Debug явно включена пауза через useAutoUpdateBlocker и собственный реестр блокеров.",
  );
  const viewingTab = await openAppTab(context, origin, firstBuild, "/about");
  const timerTab = await openAppTab(context, origin, firstBuild, "/timer");
  await timerTab.page
    .getByPlaceholder("Timer title...")
    .fill("Active timer: do not reload");
  await timerTab.page
    .getByRole("button", { name: "30 mins", exact: true })
    .click();
  await timerTab.page
    .getByRole("button", { name: "Start", exact: true })
    .click();
  await expect(
    timerTab.page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  console.info(
    `Также открыты About и работающий таймер на ${firstBuild.label}. About можно обновить, таймер — нельзя.`,
  );
  await delay(pauseMs);

  console.info(
    "[3/12] Оставляем первую вкладку открытой. Останавливаем только наш preview и запускаем pnpm run preview заново.",
  );
  await stopPreview();
  previewProxy.clearRequests();
  startPreview(backendPort);
  const secondBuild = await waitForPreview(backendOrigin);
  expect(secondBuild.label).toBe(firstBuild.label + 1);
  expect(secondBuild.buildInfo.buildId).not.toBe(firstBuild.buildInfo.buildId);
  expect(secondBuild.workerHash).toBe(firstBuild.workerHash);
  await expect(firstTab.page.locator("#debug-html-build")).toHaveText(
    `HTML · ${firstBuild.label}`,
  );
  console.info(
    `[4/12] Новая сборка: HTML · ${secondBuild.label}. Код SW не изменился. Старая вкладка остаётся на ${firstBuild.label}.`,
  );
  await firstTab.page.bringToFront();
  await readWorkerReply(firstTab.page, "CHECK_MANIFEST");
  await expect
    .poll(() => readLatestReadyBuild(firstTab.page), { timeout: 180_000 })
    .toBe(secondBuild.buildInfo.buildId);
  const { unchanged, updated } = classifyResourceChanges(
    firstBuild.manifest,
    secondBuild.manifest,
  );
  expect(unchanged.length).toBeGreaterThan(0);
  expect(updated.length).toBeGreaterThan(0);
  const downloads = getResourceDownloads(
    previewProxy.requests,
    secondBuild.manifest,
  );
  expect(downloads.map((request) => request.url).sort()).toEqual(
    updated.map((resource) => resource.url).sort(),
  );
  console.info(
    `Сеть: ${downloads.length}/${secondBuild.manifest.resources.length} файлов снимка (${updated.reduce((bytes, resource) => bytes + resource.size, 0)} байт содержимого); из Cache Storage переиспользовано ${unchanged.length}.`,
  );
  console.info(
    `Скачаны только: ${downloads.map((request) => request.url).join(", ")}`,
  );
  previewProxy.clearRequests();
  await readWorkerReply(firstTab.page, "CHECK_MANIFEST");
  expect(
    getResourceDownloads(previewProxy.requests, secondBuild.manifest),
  ).toEqual([]);
  console.info(
    "Повторная проверка готовой сборки: 0 скачанных файлов снимка; manifest по-прежнему проверяется по сети.",
  );
  await delay(pauseMs);

  console.info(
    "[5/12] Открываем НОВУЮ вкладку в том же контексте. Не нажимаем Reload и не перезагружаем её программно.",
  );
  const secondTab = await openAppTab(context, origin, secondBuild);
  await secondTab.page.bringToFront();
  await assertSingleDocumentLoad(secondTab);
  console.info(
    `Новая вкладка сразу показала HTML · ${secondBuild.label} и соответствующий App buildId.`,
  );
  await delay(pauseMs);
  await expect
    .poll(() => readLatestReadyBuild(secondTab.page), {
      timeout: 180_000,
      intervals: [500],
    })
    .toBe(secondBuild.buildInfo.buildId);
  await assertSingleDocumentLoad(firstTab);
  await assertSingleDocumentLoad(secondTab);
  expect(
    getResourceDownloads(previewProxy.requests, secondBuild.manifest),
  ).toEqual([]);
  console.info(
    "Новая вкладка тоже не скачивала файлы готового снимка повторно: 0 запросов к серверу за этими файлами.",
  );
  console.info(
    `[6/12] Debug остаётся на своей сборке из-за включённого useAutoUpdateBlocker. About обновляется по умолчанию; таймер защищает свой компонент.`,
  );
  await viewingTab.page.bringToFront();
  await expect(viewingTab.page.locator("#debug-html-build")).toHaveText(
    `HTML · ${secondBuild.label}`,
    { timeout: 30_000 },
  );
  expect(
    await viewingTab.page.evaluate(() => globalThis.BUILD_INFO.buildId),
  ).toBe(secondBuild.buildInfo.buildId);
  expect(viewingTab.documentRequests).toBe(2);
  expect(viewingTab.dialogs).toBe(0);
  expect(
    await viewingTab.page.evaluate(() =>
      sessionStorage.getItem("preview-demo-document-loads"),
    ),
  ).toBe("2");
  console.info(
    `About автоматически перешёл ${firstBuild.label} → ${secondBuild.label}, без кнопки Reload и без диалога.`,
  );
  await delay(pauseMs);
  await timerTab.page.bringToFront();
  await expect(timerTab.page.locator("#debug-html-build")).toHaveText(
    `HTML · ${firstBuild.label}`,
  );
  await expect(timerTab.page.getByPlaceholder("Timer title...")).toHaveValue(
    "Active timer: do not reload",
  );
  await expect(
    timerTab.page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await assertSingleDocumentLoad(timerTab);
  expect(timerTab.dialogs).toBe(0);
  console.info(
    `Таймер по-прежнему работает на ${firstBuild.label}, заголовок и состояние сохранены, reload не было.`,
  );
  await delay(pauseMs);

  console.info(
    `[7/12] Выключаем интернет в браузере. Новая офлайн-вкладка должна показать сохранённую HTML · ${secondBuild.label} и плашку офлайна.`,
  );
  await context.setOffline(true);
  const offlineTab = await openAppTab(context, origin, secondBuild);
  await offlineTab.page.bringToFront();
  await assertOfflineBuild(offlineTab.page, secondBuild);
  expect(await offlineTab.page.evaluate(() => navigator.onLine)).toBe(false);
  await assertSingleDocumentLoad(offlineTab);
  await delay(pauseMs);

  console.info(
    "[8/12] Интернет включён, но соединение с сервером сайта оборвано. После reload ожидаем тот же готовый кеш и плашку офлайна.",
  );
  previewProxy.setUnavailable(true);
  await context.setOffline(false);
  await offlineTab.page.reload({ waitUntil: "domcontentloaded" });
  await assertOfflineBuild(offlineTab.page, secondBuild);
  expect(await offlineTab.page.evaluate(() => navigator.onLine)).toBe(true);
  await delay(pauseMs);

  console.info(
    "[9/12] Восстанавливаем сервер. Загружаем текущую готовую сборку из сети перед следующим сценарием.",
  );
  previewProxy.setUnavailable(false);
  await offlineTab.page.reload({ waitUntil: "domcontentloaded" });
  await expect(offlineTab.page.locator("#debug-html-build")).toHaveText(
    `HTML · ${secondBuild.label}`,
  );
  await readWorkerReply(offlineTab.page, "CHECK_MANIFEST");
  await expect(
    offlineTab.page.getByText("You are offline", { exact: true }),
  ).toBeHidden();
  await delay(pauseMs);

  console.info(
    "[10/12] Делаем третий pnpm run preview и удерживаем /index.html офлайн-снимка. Навигация на /debug остаётся доступной из сети.",
  );
  previewProxy.holdResource("/index.html");
  await stopPreview();
  startPreview(backendPort);
  const thirdBuild = await waitForPreview(backendOrigin);
  expect(thirdBuild.label).toBe(secondBuild.label + 1);
  expect(thirdBuild.workerHash).toBe(secondBuild.workerHash);
  await offlineTab.page.evaluate(() =>
    navigator.serviceWorker.controller.postMessage({ type: "CHECK_MANIFEST" }),
  );
  await expect
    .poll(() => previewProxy.pendingResourceRequests, { timeout: 180_000 })
    .toBeGreaterThan(0);
  await expect
    .poll(
      async () =>
        (await readWorkerReply(offlineTab.page)).builds.find(
          (build) =>
            build.manifest.buildInfo.buildId === thirdBuild.buildInfo.buildId,
        )?.completed ?? 0,
      { timeout: 180_000 },
    )
    .toBeGreaterThan(0);
  const partialState = await readWorkerReply(offlineTab.page);
  const partialBuild = partialState.builds.find(
    (build) =>
      build.manifest.buildInfo.buildId === thirdBuild.buildInfo.buildId,
  );
  expect(partialBuild.state).toBe("downloading");
  expect(partialBuild.completed).toBeLessThan(
    partialBuild.manifest.resources.length,
  );
  expect(partialState.latestReadyBuildId).toBe(secondBuild.buildInfo.buildId);
  await offlineTab.page.reload({ waitUntil: "domcontentloaded" });
  await expect(offlineTab.page.locator("#debug-title")).toBeVisible();
  await expect(offlineTab.page.locator("#debug-html-build")).toHaveText(
    `HTML · ${thirdBuild.label}`,
  );
  expect(
    await offlineTab.page.evaluate(() => globalThis.BUILD_INFO.buildId),
  ).toBe(thirdBuild.buildInfo.buildId);
  expect((await readWorkerReply(offlineTab.page)).latestReadyBuildId).toBe(
    secondBuild.buildInfo.buildId,
  );
  console.info(
    `Онлайн страница уже показывает HTML · ${thirdBuild.label}, но её офлайн-кеш неполон: ${partialBuild.completed}/${partialBuild.manifest.resources.length}. Готовая версия — ${secondBuild.label}.`,
  );
  await delay(pauseMs);

  console.info(
    `[11/12] Обрываем интернет во время скачивания HTML · ${thirdBuild.label}, затем перезагружаем страницу.`,
  );
  await context.setOffline(true);
  previewProxy.setUnavailable(true);
  await expect
    .poll(
      async () =>
        (await readWorkerReply(offlineTab.page)).builds.find(
          (build) =>
            build.manifest.buildInfo.buildId === thirdBuild.buildInfo.buildId,
        )?.error,
      { timeout: 30_000 },
    )
    .toBeTruthy();
  await offlineTab.page.reload({ waitUntil: "domcontentloaded" });
  await assertOfflineBuild(offlineTab.page, secondBuild);
  const afterInterruption = await readWorkerReply(offlineTab.page);
  const interruptedBuild = afterInterruption.builds.find(
    (build) =>
      build.manifest.buildInfo.buildId === thirdBuild.buildInfo.buildId,
  );
  expect(interruptedBuild.state).toBe("downloading");
  expect(interruptedBuild.completed).toBeLessThan(
    interruptedBuild.manifest.resources.length,
  );
  expect(afterInterruption.latestReadyBuildId).toBe(
    secondBuild.buildInfo.buildId,
  );
  expect(offlineTab.documentRequests).toBe(5);
  expect(
    await offlineTab.page.evaluate(() =>
      sessionStorage.getItem("preview-demo-document-loads"),
    ),
  ).toBe("5");
  await delay(pauseMs);

  await assertSingleDocumentLoad(firstTab);
  await assertSingleDocumentLoad(secondTab);
  console.info(
    `[12/12] Все проверки пройдены: новая вкладка получила новую версию без reload; About обновился автоматически, таймер не прерывался; офлайн открывается готовая ${secondBuild.label}, незавершённая ${thirdBuild.label} не используется.`,
  );
  await offlineTab.page.bringToFront();
  console.info(
    `Оставляем результат проверки видимым ещё ${finalPauseMs / 1000} секунд, затем закрываем только браузер, прокси и сервер демонстрации.`,
  );
  await delay(finalPauseMs);
  await assertSingleDocumentLoad(firstTab);
  await assertSingleDocumentLoad(secondTab);
  await assertOfflineBuild(offlineTab.page, secondBuild);
  await assertSingleDocumentLoad(timerTab);
  expect(viewingTab.documentRequests).toBe(2);
} finally {
  await cleanup();
}
