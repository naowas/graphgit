## Project Goal

Build a desktop Git GUI client for **Linux and macOS** using **Electron**, with a UI and interaction model closely inspired by GitKraken's commit-graph-centric layout (tabs, sidebar repo tree, visual commit graph, right-hand commit detail panel, diff viewer). This is an **original application** — use your own name, logo, and icon set. Do not copy GitKraken's branding, logo, or trademarked name; only replicate the general layout/UX patterns, which are common across git GUI tools (GitKraken, Fork, Sourcetree, GitUp, etc.).

## Tech Stack

- **Shell**: Electron (latest stable), packaged with `electron-builder` for `.dmg`/`.zip` (macOS) and `.AppImage`/`.deb` (Linux)
- **Renderer**: React 18 + TypeScript
- **Styling**: Tailwind CSS + CSS variables for theming (dark theme as default, light theme as stretch goal)
- **State management**: Zustand or Redux Toolkit
- **Git backend**: Node's `child_process` to shell out to the system `git` binary (via a thin wrapper, or the `simple-git` npm package) — do NOT use a native git binding (nodegit, etc.), since those are painful to keep cross-platform and slower to maintain. All git operations (log, diff, status, branch, stash, pull, push, checkout) run in the **main process**; results are sent to the renderer via IPC (`ipcMain`/`ipcRenderer`, contextBridge with a typed preload API — no `nodeIntegration: true`).
- **Diff rendering**: `diff2html` or a custom unified-diff renderer for the diff view; syntax highlighting via `highlight.js` or `shiki`.
- **Commit graph rendering**: Build a custom SVG/Canvas graph renderer (lanes + connecting lines + colored dots per branch) — this is the most GitKraken-specific visual element, so budget real time for it. Look at existing OSS approaches (e.g. `gitgraph.js`) as a starting reference, not a dependency to lean on entirely, since we need custom lane coloring and branch-tag pills inline with commit rows.

## Window Chrome & Global Layout

- Single main window, custom titlebar optional (native titlebar is fine to start).
- **Tab bar** at the very top: one tab per open repo (or a "Launchpad"/home tab), each tab shows repo name + close (×) button, plus a `+` button to open a new tab / add a repo.
- Below the tab bar, a **toolbar** with, left to right:
  - Repository name dropdown (switch between recently opened repos)
  - Current branch dropdown (switch/checkout branches)
  - Action buttons with icon-over-label style: **Undo, Redo, Pull, Push, Branch, Stash, Pop, Terminal** (opens a terminal in repo root)
  - Right-aligned: **Actions** menu, **Search** (search commits/files/branches)

## Left Sidebar (Repo Explorer)

- Two-mode toggle at top: **List** / **Agents** (Agents can be a stub/placeholder panel for now)
- A small "Viewing N" counter and a filter/search input
- Collapsible sections, each with a count badge:
  - **LOCAL** (local branches)
  - **REMOTE** (remote branches)
  - **STASHES**
  - **CLOUD PATCHES** (can stub — not core git, skip or leave as empty placeholder)
  - **PULL REQUESTS** (stub unless you wire up a GitHub/GitLab API integration later)
  - **ISSUES** (stub)
  - **TEAMS** (stub)
- Sidebar collapses to icon-only rail when narrowed (see diff-view screenshot) — implement as a resizable/collapsible panel.

## Center Panel: Commit Graph

- Table-like view with columns: **Branch/Tag pills**, **Graph** (the visual lane/dot/line graph), **Commit message** (bold summary + greyed-out truncated description on the same row).
- Current branch row highlighted (e.g., subtle highlight + checkmark icon + branch label pill).
- Each commit row: colored dot (colored per branch lane), connecting lines to parent/child commits, avatar or generic icon per commit.
- Hovering/selecting a row updates the right-hand detail panel.
- Support multi-select is a stretch goal; single-select for MVP.

## Right Panel: Commit Detail

- Header: `commit: <short-hash>` and an optional AI/utility action button area (can be a placeholder "Actions" dropdown button, not literally "Recompose with AI" — make it generic, e.g. "Commit Actions").
- Full commit message (title + bullet-point body if present).
- Author row: avatar, name, "authored <date> @ <time>", and `parent: <short-hash>` link (clicking jumps to that commit).
- Stats line: "N modified, +N added" etc.
- Sort icon + **Path / Tree** view toggle for the changed-files list + "View all files" checkbox.
- File list: each entry has a small status icon (modified = pencil, added = +, deleted = -, renamed = arrow) and the file path; clicking a file opens the diff view for that file at this commit.
- In Tree mode, group files by folder (collapsible, with per-folder change counts and an "Expand All" link) — see screenshot 2 for the exact interaction (public/, src/, test/ folders collapsed by default, individual root files like `.env.example` and `README.md` shown flat).

## File Diff View

- Opens when a file is selected from the commit detail panel (or via double-click in the graph).
- Header: filename + encoding (e.g., UTF-8) + close (×) button.
- "Edit in Working Directory" link/button (opens the file in the user's default editor or the OS file manager — configurable).
- **File View / Diff View** toggle.
- Diff toolbar: **Blame**, **History** buttons; hunk navigation (up/down arrows between changed hunks); view-mode icons (unified vs split/side-by-side); wrap-toggle icon.
- Unified diff body: old-line-number | new-line-number | content, with a `@@ -a,b +c,d @@` hunk header row, added lines highlighted green, removed lines highlighted red, and a **Revert Hunk** button appearing on hover per hunk (calls `git apply -R` on that hunk).
- Right panel stays visible showing the same commit-detail info as before (keeps context while reviewing the diff).

## Status Bar (bottom)

- Left: current branch/PR context info (can be blank if no PR integration) or a short status message.
- Right: view-density toggle icons, zoom-level indicator/control, a "Support"/help link, and an app version number.

## Theming / Visual Style

- Dark theme by default: near-black background (~`#1e1f24` / `#181a1f`), panel backgrounds slightly lighter (~`#24262c`), accent color a saturated blue (~`#3b82f6`/`#4f8cff`) for active branch highlights, selected rows, and primary buttons.
- Diff additions: dark green background (~`#1f3d2b`) with brighter green text/markers; deletions dark red (~`#3d1f1f`).
- Use a monospace font for commit hashes, diffs, and file paths (e.g., "JetBrains Mono" or system monospace); UI font can be a standard system sans-serif.
- Small, consistent iconography (16–20px) — use an icon set like `lucide-react` throughout for toolbar/sidebar/status icons.

## Core Git Features (MVP scope, roughly in priority order)

1. Open/clone a repo; recent-repos list; multi-tab (multi-repo) support
2. Read and render commit log/graph (`git log --graph` equivalent, parsed structurally not from ASCII output — use `git log --pretty=format:... --parents` and build the graph yourself)
3. Branch list (local + remote), checkout, create, delete, rename
4. Commit detail view + changed-file list (Path and Tree modes)
5. Diff viewer (unified) with syntax highlighting
6. Stage/unstage/commit workflow (a "working directory changes" view, separate from history — GitKraken shows this as an entry at the top of the graph when there are uncommitted changes)
7. Pull / Push / Fetch
8. Stash / Pop / Apply / Drop
9. Merge / Rebase (at least fast-forward + simple merge to start; interactive rebase UI is a stretch goal)
10. Revert hunk / revert commit / undo-redo of GUI actions
11. Terminal launch button (opens system terminal at repo root, or an embedded terminal via `node-pty` as a stretch goal)
12. Basic conflict resolution UI (stretch goal — even a simple "open in external merge tool" button is a reasonable v1)

## Explicitly Out of Scope for v1

- AI-powered commit-message generation/"explain" features
- Cloud patches / hosted PR & issue integrations (leave sidebar sections present but empty/stubbed so the layout matches, functionality wired later)
- Team/user management features

## Suggested Project Structure

```
/src
  /main         # Electron main process: window mgmt, git IPC handlers
    git/        # git command wrappers (log, diff, branch, stash, etc.)
    ipc/
  /preload      # contextBridge-exposed typed API
  /renderer     # React app
    /components
      TabBar/
      Toolbar/
      Sidebar/
      CommitGraph/
      CommitDetailPanel/
      DiffViewer/
      StatusBar/
    /store       # Zustand/Redux state
    /styles      # Tailwind config, theme tokens
```

## Deliverables for the First Iteration

1. Electron + React + TS scaffold that builds and runs on both Linux and macOS
2. Tab bar + toolbar + sidebar shell (static, no real git wiring yet) matching the layout above
3. Git IPC layer: open repo, get status, get commit log with parent info
4. Commit graph rendering with real data from an opened repo
5. Commit detail panel wired to the selected commit
6. Diff viewer wired to a selected file
7. Working `electron-builder` config producing a Linux AppImage and a macOS build

Ask me clarifying questions only if something above is ambiguous for your chosen libraries — otherwise scaffold the project and start with the shell layout first, then wire in git functionality module by module.
