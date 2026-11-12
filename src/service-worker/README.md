# Service worker

The service worker gives the website three things:

- **Offline mode.** The last complete version of the site opens without a network.
- **Updates without stale tabs.** A new tab gets the newest version right away, and open tabs reload by themselves once a new version is fully downloaded.
- **Cached API data.** Calendars, maps and account data are available offline.
- **A second route to the API.** When the network cannot reach the API host at all, requests go through its mirror.

It is a hand-written worker (no Workbox). It exists only in production builds: `pnpm build` or `pnpm preview`.

## Contents

- [In one minute](#in-one-minute)
- [Where the code is](#where-the-code-is)
- [What a build produces](#what-a-build-produces)
- [How an update arrives](#how-an-update-arrives)
- [Which version a tab uses](#which-version-a-tab-uses)
- [Offline](#offline)
- [Automatic reloads](#automatic-reloads)
- [API cache](#api-cache)
- [Mirror of an unreachable API host](#mirror-of-an-unreachable-api-host)
- [Storage](#storage)
- [Reset](#reset)
- [Messages between pages and the worker](#messages-between-pages-and-the-worker)
- [Debug page](#debug-page)
- [Server requirements](#server-requirements)
- [Tests](#tests)
- [Known limitations](#known-limitations)

## In one minute

1. Every build publishes `build-manifest.json`: the list of all its files with their hashes.
2. The worker regularly downloads the manifest and copies the build into Cache Storage. Only new or changed files are downloaded.
3. A build becomes **ready** only when every file is downloaded and its hash is verified.
4. Online, pages always load from the network. Offline, the worker serves the latest **ready** build. A partly downloaded build is never used.
5. When the server's build differs from a tab's build and is ready, the tab reloads automatically, unless a component asks to wait.
6. Rebuilding the same code produces the same files, so a deploy without changes is not an update at all.

## Where the code is

| File                                                                                                   | What it does                                                                       |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| [`src/service-worker/worker/sw.ts`](worker/sw.ts)                                                      | Worker entry: startup cleanup, install/activate, routing of requests and commands. |
| [`src/service-worker/worker/site-update.ts`](worker/site-update.ts)                                    | Downloading builds, offline navigation, serving files, deleting old builds.        |
| [`src/service-worker/worker/api-cache.ts`](worker/api-cache.ts)                                        | Caching selected API responses.                                                    |
| [`src/service-worker/proxy-fallback.ts`](proxy-fallback.ts)                                            | Retrying a request on the mirror of its host when the host is unreachable.         |
| [`src/service-worker/storage.ts`](storage.ts)                                                          | The worker's state in IndexedDB, the storage lock, purge.                          |
| [`src/service-worker/protocol.ts`](protocol.ts)                                                        | Shared types and constants for the worker and the pages.                           |
| [`../api/helpers/mirror-session.ts`](../api/helpers/mirror-session.ts)                                 | Page side: the session the API knows on the mirror host.                           |
| [`src/service-worker/page/register-sw.ts`](page/register-sw.ts)                                        | Page side: registers the worker, reports the tab, schedules update checks.         |
| [`src/service-worker/page/sw-client.ts`](page/sw-client.ts)                                            | Page side: sending commands to the worker, manifest check, reset.                  |
| [`src/service-worker/page/auto-update.ts`](page/auto-update.ts)                                        | Page side: automatic reloads and `useAutoUpdateBlocker`.                           |
| [`src/service-worker/page/site-availability.ts`](page/site-availability.ts)                            | Whether this page was opened from the offline copy (drives the offline banner).    |
| [`src/service-worker/page/AppUpdatePrompt.tsx`](page/AppUpdatePrompt.tsx)                              | "Reload" prompt, used only on TV pages.                                            |
| [`src/components/debug/`](../components/debug/)                                                        | The `/debug` page.                                                                 |
| [`scripts/build-service-worker.ts`](../../scripts/build-service-worker.ts)                             | Vite plugin that creates `sw.js`, the manifest and the build-info file.            |
| [`scripts/build-labels.ts`](../../scripts/build-labels.ts), [`preview.mjs`](../../scripts/preview.mjs) | Local build number for the Debug page; `pnpm preview`.                             |
| [`tests/service-worker/`](../../tests/service-worker/)                                                 | All tests and the visible demo.                                                    |

## What a build produces

| File                              | Contents                                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [`index.html`](../../index.html)  | `<html data-build-id="…">` and, first in `<head>`, a script with the build-info file.                      |
| `/assets/build-info-<buildId>.js` | Sets `globalThis.BUILD_INFO` for the app.                                                                  |
| `/build-manifest.json`            | Build info, commit, build time, entry point (`/index.html`) and every file with its URL, SHA-384 and size. |
| `/sw.js`                          | First line: `globalThis.BUILD_INFO = { serviceWorkerHash }`. Then the worker code.                         |

The manifest lists every file of the build except `sw.js`, the manifest itself and source maps.

### Build identity

The app and the worker have separate identities:

| Field               | Where                        | Meaning                                                                     |
| ------------------- | ---------------------------- | --------------------------------------------------------------------------- |
| `buildId`           | App (`BUILD_INFO`)           | Hash of the build's files (see below). Names its cache and build-info file. |
| `version`           | App (`BUILD_INFO`)           | Version from [`package.json`](../../package.json).                          |
| `commitHash`        | Manifest only                | Git commit of the build that published the manifest.                        |
| `builtAt`           | Manifest only                | Time of that build.                                                         |
| `serviceWorkerHash` | Worker (`sw.js`, first line) | SHA-256 of the worker code only.                                            |

**The same code always gets the same `buildId`.** It is the first 16 hex digits of SHA-256 over `version` and the list of built files (URL, SHA-384, size). The id is computed after the build: at that moment `index.html` still has the `__BUILD_ID__` placeholder, and the build-info file does not exist yet. Then the id is written into `index.html` and the build-info file name.

So the commit and the build time are kept out of the built files: a commit that does not change the site (for example, a README edit) or a repeated deploy produces exactly the same files. Clients then download nothing and no tab reloads. The commit and time are still recorded in the manifest and shown on the Debug page.

Because `sw.js` contains only the worker's own hash, it stays byte-identical when only the app changes. The browser therefore keeps the same worker, and the app update goes through the manifest.

The build-info file is named after `buildId`. HTML always loads exactly its own build's metadata, whatever the HTTP cache or CDN does.

Next to the Debug page title, a static `HTML · …` marker shows which HTML the page was loaded from. It is baked into the HTML and does not depend on JavaScript:

| Build                         | Marker                                                            |
| ----------------------------- | ----------------------------------------------------------------- |
| `pnpm dev`                    | `HTML · dev`                                                      |
| `pnpm preview` (local)        | `HTML · N`, increased on every run; history in `build-labels.txt` |
| `pnpm build` (production, CI) | `HTML · production`                                               |

The number is enabled by the `INNOHASSLE_BUILD_LABEL_HISTORY` variable (path to the history file). `pnpm preview` sets it to `build-labels.txt` (ignored by git); the tests use their own file.

## How an update arrives

```mermaid
sequenceDiagram
    participant Tab
    participant Worker
    participant Server
    Tab->>Worker: CHECK_MANIFEST
    Worker->>Server: build-manifest.json
    Worker->>Worker: copy unchanged files from older builds
    Worker->>Server: download only new or changed files
    Worker->>Server: build-manifest.json again (still the same build?)
    Worker->>Worker: mark the build ready
    Worker-->>Tab: BUILD_READY (to every tab)
    Tab->>Tab: reload when safe
```

**When a check starts:**

- when a page starts, and on every navigation;
- every 30 minutes (every minute on `/tv`);
- when the tab is shown or focused again, and when the browser goes back online.

Checks running at the same time are merged into one.

**Downloading a build:**

1. The worker downloads `build-manifest.json` without the HTTP cache. It records the build as `downloading` in the cache `app-build-<generation>-<buildId>`.
2. For each file (4 at a time):
   - if the build's cache already has it, it is skipped;
   - if an older **ready** build has the same file (same URL and hash), it is copied from there;
   - otherwise it is downloaded with `cache: "no-store"` and the expected integrity.

   **Every file is verified (SHA-384 and size) once, before it is stored.** A mismatch fails the download, and so does HTML returned for a `.js`/`.css` file. Files already in the cache are not hashed again, so a check without changes costs one manifest request.

3. If anything was stored, the worker downloads the manifest again. If the server now has another build, this one is not promoted.
4. The build becomes **ready** and the latest ready build. Every tab receives `BUILD_READY`.
5. Old builds that nobody needs are deleted (see below).

If anything fails, the build stays `downloading` with an error. The next check continues it and downloads only the missing files. A ready build that has lost files is demoted from ready.

## Which version a tab uses

Each tab is **pinned** to one build: the one its HTML belongs to.

- **During navigation** the worker reads `data-build-id` from the received HTML and pins the new tab to it. Offline, it pins the tab to the build it served. This temporary pin lives up to 60 seconds.
- **When the page starts**, it sends `CLIENT_HELLO` with its `BUILD_INFO.buildId`. This replaces the temporary pin.

How the worker answers the tab's other requests to the same site:

| Request                        | Answer                                                                |
| ------------------------------ | --------------------------------------------------------------------- |
| A file of the tab's own build  | From that build's cache; if missing, from the network with integrity. |
| Another `/assets/*` file       | From any build's cache (these names contain a content hash).          |
| Anything else                  | Network.                                                              |
| `build-manifest.json`, `sw.js` | Never intercepted.                                                    |
| Other sites (API)              | See [API cache](#api-cache); everything else is not intercepted.      |

So an old tab keeps working, including lazy-loaded pages, even after the server has deleted its files.

**Deleting old builds.** A build is deleted when it is not downloading, is not the latest ready build, and no live tab is pinned to it. If a window exists that has not reported itself yet, nothing is deleted.

## Offline

Navigation always goes to the network first and revalidates the HTML (`cache: "no-cache"`). The worker falls back to the offline copy when:

- there is no network or the connection fails, or
- the server answers 5xx.

It serves the latest **ready** build. Before that, it checks that every file of that build is still in the cache. A build with missing files is demoted, and the next ready build is tried. A build that is still downloading is never used.

The page learns from the `CLIENT_HELLO` reply that it was served from the cache. It then shows the "You are offline" banner, even if the browser reports being online (for example, the site's server is down). The banner disappears after the next successful manifest check.

The very first visit cannot work offline: the worker is not installed yet.

## Automatic reloads

When a tab receives `BUILD_READY` for a build other than its own, it reloads once it is safe. It waits while any of these is true, in this order:

| Reason              | Meaning                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| `already-attempted` | This tab already reloaded for this build (protects from reload loops). |
| `offline`           | The browser is offline.                                                |
| `navigation`        | The router is navigating or loading.                                   |
| `mutation`          | A TanStack Query mutation is running.                                  |
| `component-blocker` | A component called `useAutoUpdateBlocker`.                             |

Then the tab asks the worker to check the manifest again. The target is **the build the server serves now**, once it is completely ready — not necessarily the one that was announced. If that is the tab's own build, nothing happens. After this asynchronous check, the conditions are checked once more.

Builds are not ordered by time. So rolling the server back to an older build switches the tabs back as well.

This applies to every page, including hidden tabs. The current status is shown on the Debug page.

On TV pages (`/tv`) a "Reload" prompt also appears, in case a `beforeunload` handler cancels the reload.

### Pausing reloads in a component

```tsx
import { useAutoUpdateBlocker } from "@/service-worker/page/auto-update.ts";

// Wait while the user has a draft.
useAutoUpdateBlocker(draft.length > 0);

// Wait for the whole lifetime of the component.
useAutoUpdateBlocker();
```

The update resumes on the same page as soon as the last blocker is released (disabled or unmounted).

`useAutoUpdateBlocker` does not stop manual navigation, F5 or closing the tab. For that, use TanStack Router's `useBlocker` separately:

```tsx
useAutoUpdateBlocker();
useBlocker({
  enableBeforeUnload: true,
  shouldBlockFn: () => hasUnsavedChanges() && !confirm("Leave?"),
});
```

## API cache

Only `GET` responses with status 200 are stored. URLs are matched against the `VITE_*_API_URL` values that were built into `sw.js`.

| Cache           | What                                                                                                                                                                                  | Strategy                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `api-user-data` | `.ics` calendar feeds (from any host), `check-calendar-url-to-link`, schedule `users/me`, `users/me/predefined`, `event-groups/`, when2meet meetings, accounts API except `/tokens/*` | Network first. The cache is used offline, or if the network takes over 3 seconds. |
| `api-maps`      | Map scenes and floor SVGs                                                                                                                                                             | The cache is served at once; a fresh copy is saved in the background.             |

- Each cache keeps up to **128** entries. The entries saved longest ago are removed first. Every online view saves an entry again, so frequently used entries stay.
- There is no expiry time.
- `api-user-data` is deleted on logout ([`AuthManager`](../api/helpers/AuthManager.tsx)). It contains the user's calendar URLs, including access keys of linked calendars.
- Access tokens are never cached.

## Mirror of an unreachable API host

Some networks block the API host by IP, and every request to it fails with a reset connection instead of a status. A mirror host is another domain that proxies the same API, and the worker retries such a failed request on it:

- The host pairs come from `VITE_PROXY_HOSTS` (`original=mirror`, comma-separated) and are built into `sw.js`. Empty means no fallback.
- Only a rejected `fetch` is retried: a status is the answer of a reachable host, so it is passed through. The method, the body, the headers, the credentials and the path stay the same, so the mirror answers exactly what the original host would have.
- The fallback is used on every route: cached API `GET`s, other `GET`s and the requests with a body. A cached `GET` stores the mirror's answer in the cache as usual, under the URL of the host, so offline it is still there.
- A request whose signal was aborted is not retried.
- A `401` from the mirror means only that the mirror has no session of this user, not that the user signed out. The page would take it for a sign-out and delete the tokens and the cached user data, so the request fails as it would without the mirror: offline, with the cached copy.

The mirror is another site, so it cannot use the session cookie of the main host: the browser never sends that one there. Accounts keeps a separate session on the mirror, a `SameSite=None; Partitioned` cookie (CHIPS), and gives it out for a 1-minute transfer token from the main host. [`mirror-session.ts`](../api/helpers/mirror-session.ts) does that exchange once per page load while the main host still answers, and clears the mirror session on sign out. Without it the mirror would only answer as a signed-out user: the fallback is for a host that stops answering, not for one that never answered, because the session has to be copied before that.

## Storage

**IndexedDB** — database `innohassle-service-worker`, store `state`, key `current`:

| Field                                    | Meaning                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `builds`                                 | Each known build: its manifest, cache name, `downloading`/`ready`/`deleting`, progress. |
| `latestReadyBuildId`                     | The build used offline.                                                                 |
| `clients`                                | Tab pins (see above) and each tab's last `CLIENT_HELLO`.                                |
| `generation`                             | Increases on every reset; work started before the reset refuses to write.               |
| `blocked`                                | After a reset, caches are neither used nor filled until a new page registers again.     |
| `resetPending`                           | A purge started but has not finished.                                                   |
| `manifestCheck`, `lastSuccessfulCheckAt` | Result of the last check (for diagnostics).                                             |

All writers go through the Web Lock `innohassle-sw-storage`. This includes several worker versions and pages that reset without a worker.

**Cache Storage** — `app-build-*` (builds), `api-user-data` and `api-maps`. On every start, the worker deletes any other cache, and the `workbox-expiration` database. This also removes the caches of the former Workbox worker.

## Reset

The "Clear ALL caches, unregister, and reload" button on the Debug page:

1. Stops automatic updates in this tab.
2. Sends `RESET` to the worker, which first stops its running download. Without a worker, the page does the purge itself. The purge:
   - increases `generation`, sets `blocked` and `resetPending`;
   - deletes **all** caches, then clears `resetPending`;
   - announces `CACHE_INVALIDATED` on the `BroadcastChannel` `innohassle-sw-reset`. Every open tab stops its automatic updates and clears its query cache.
3. Unregisters all workers and reloads the page.
4. The new page lifts `blocked` and registers the worker again.

If a purge is interrupted (for example, the browser stops the worker), `resetPending` stays set, and the next worker start finishes the purge.

## Messages between pages and the worker

Commands go over a `MessageChannel` (`requestWorker` in [`sw-client.ts`](page/sw-client.ts)). The timeout is 15 seconds, or 2 minutes for `CHECK_MANIFEST`.

| Command           | Reply                                                                             |
| ----------------- | --------------------------------------------------------------------------------- |
| `CLIENT_HELLO`    | Pins the tab. Replies with `generation` and whether the page came from the cache. |
| `CHECK_MANIFEST`  | Build info once the build is ready, or `null`.                                    |
| `GET_STATE`       | The stored state.                                                                 |
| `GET_DIAGNOSTICS` | Worker identity, stored state, live tabs and a Cache Storage summary.             |
| `RESET`           | Purges everything. Returns the new state.                                         |

| Notification        | Sent how                                   |
| ------------------- | ------------------------------------------ |
| `BUILD_READY`       | `postMessage` to every tab of the site.    |
| `CACHE_INVALIDATED` | `BroadcastChannel("innohassle-sw-reset")`. |

## Debug page

`/debug` shows separately, with the source of each value:

- what the **app** knows: its `BUILD_INFO`, its last `CLIENT_HELLO`, its automatic update status, and the last notification;
- what the **browser** knows: registrations and worker roles;
- what **each worker** reports: its hash, the manifest chosen for this tab, all tabs and pins, stored builds, caches.

It refreshes every 5 seconds. Reading it does not start a check or a download. It also has the "Pause automatic updates on this page" checkbox (off by default) and the reset button.

## Server requirements

The code no longer depends on HTTP caching for correctness. The recommended headers are:

| Path                                                        | `Cache-Control`                       |
| ----------------------------------------------------------- | ------------------------------------- |
| `/index.html`, SPA routes, `/sw.js`, `/build-manifest.json` | `no-cache`                            |
| `/assets/*`                                                 | `public, max-age=31536000, immutable` |

Also keep the old `/assets/*` files for a while after a deploy. This helps tabs that have no offline copy yet.

## Tests

```bash
pnpm run test:sw            # unit tests + Playwright tests in Chromium
pnpm run test:sw:preview    # visible demo with real `pnpm preview` builds
pnpm run test:sw:preview --pause-ms 1000 --final-pause-ms 10000 --port 3001
pnpm exec playwright install chromium   # once, if Chromium is missing
```

- The Playwright tests build three real versions of the site (A, B, C) and serve them on port 5201, with a mock API on 5202. They also rebuild A from two commits to check that the files are identical. They cover:
  - identical rebuilds, partial and interrupted downloads, and downloading only changed files;
  - offline, connection-error and 5xx navigation;
  - pins and deleting old builds;
  - automatic reloads, rollbacks and blockers;
  - TV, reset, worker restarts, the API cache and removal of old caches.
- The demo opens a visible Chromium window and walks through the main scenarios step by step. It uses its own ports in 3000–3099 and a temporary directory. It never stops other servers.

## Known limitations

- **Unsaved input can be lost.** Automatic reloads happen on every page that has no `useAutoUpdateBlocker`, including forms with drafts.
- **Changed bytes in Cache Storage are not detected.** Files are verified only when stored; the browser itself never changes them, but a manual edit (for example, in DevTools) would go unnoticed. The main scripts and styles still have SRI in `index.html`, and the Debug reset repairs everything.
- **Old tabs.** Tabs opened before this worker was deployed do not reload automatically until they are reloaded once.
- **A host that drops packets is only retried late.** The fallback needs `fetch` to fail, and a connection that is silently dropped fails only when the browser gives up on it. A cached `GET` is served from the cache meanwhile; other requests wait. Asking the mirror in parallel after a second was rejected: it sends every `GET` to the mirror twice whenever the host is merely slow, and a 401 from the mirror would then sign the user out locally.
- **Safari blocks cross-site cookies.** The mirror session is exactly that, so on Safari the fallback only helps with requests that need no session; the others fail as without the mirror. Chrome, Edge and Firefox keep it.
- **The mirror needs a recent session.** The exchange happens once per page load, while the main host answers. If the mirror session expires (14 days) or was never copied, requests that fall back are answered as a signed-out user until a page load with a reachable main host.
- **Browser support.** Requires Web Locks, `BroadcastChannel` and `Array.prototype.findLast`, so Safari / iOS 15.4 or newer.
