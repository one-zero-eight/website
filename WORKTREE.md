# Git worktrees

Use worktrees to work on several branches in parallel and run multiple frontend dev servers without stashing or switching in the main checkout.

## Layout

```text
one-zero-eight/
├── website/                 # main worktree
│   ├── .env                 # tracked defaults (API URLs)
│   └── .env.local           # optional local overrides (gitignored)
└── website-<name>/          # extra worktree — own node_modules, own port
```

## Create a worktree

From the main `website` checkout:

```bash
# new branch
git worktree add ../website-<name> -b <branch>

# existing branch
git worktree add ../website-<name> <branch>

git worktree list
```

Then in the new worktree:

```bash
cd ../website-<name>
pnpm install
```

Git hooks from Husky live in the shared `.git/hooks` of the main repo — no need to reinstall per worktree.

If you use a local override file, copy or symlink it from the main worktree:

```bash
# copy
cp ../website/.env.local ./.env.local

# or symlink (stays in sync)
ln -s ../website/.env.local ./.env.local
```

Tracked `.env` is already in the tree via git.

## Remove a worktree

Stop the worktree’s dev server first (otherwise `git worktree remove` may fail while Vite still holds files, and the port stays busy):

```bash
# if it is running in a terminal — Ctrl+C

# or free the port from another shell (example: 3001)
fuser -k 3001/tcp
```

Then remove the worktree from the main repo:

```bash
git worktree remove ../website-<name>

# if the directory was deleted manually
git worktree prune
```

`node_modules` inside the removed worktree goes away with the directory.

## Run several frontend instances

Default:

```bash
pnpm run dev
# → https://local.innohassle.ru:3000
```

Use a **different `--port` per worktree** (or per agent). Allowed extra ports: **3001–3005** (main stays on **3000**). Run Vite via `pnpm exec` so flags are not swallowed by pnpm’s `--` separator. Pass `--strictPort` so a busy port exits instead of picking another:

```bash
# main worktree
pnpm run dev

# extra worktree
pnpm exec vite dev --port 3001 --host --strictPort
# → https://local.innohassle.ru:3001
```

Do **not** use `pnpm run dev -- --port 3001`: pnpm inserts a `--` before forwarded args, Vite treats that as end-of-options, and the port flag is ignored.

HTTPS for `local.innohassle.ru` comes from `vite-plugin-mkcert` (same host, any port). Auth cookies and APIs keep working as long as you open that host, not `localhost`.

| Worktree      | Example command                                      | URL                              |
| ------------- | ---------------------------------------------------- | -------------------------------- |
| `website`     | `pnpm run dev`                                       | https://local.innohassle.ru:3000 |
| `website-foo` | `pnpm exec vite dev --port 3001 --host --strictPort` | https://local.innohassle.ru:3001 |
| `website-bar` | `pnpm exec vite dev --port 3002 --host --strictPort` | https://local.innohassle.ru:3002 |

Pick an unused port from `3001`–`3005` for each extra worktree.

For Android USB preview, reverse the same port you use:

```bash
adb reverse tcp:3001 tcp:3001
```

## Do not share `node_modules`

Run `pnpm install` in each worktree.

Reasons:

- branches may differ in lockfile / dependencies
- installs bind to a specific source tree
- parallel Vite processes should not share one `node_modules` mutation

pnpm’s global store is already shared — that is enough.

## Cursor / multi-root

To see a second SCM input and edit an extra worktree in the same window, **add the worktree folder** to the workspace (File → Add Folder to Workspace…), or open it in a separate window.
