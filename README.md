# backlog

`agent-backlog` — a kanban board a human and an agent share, stored as plain
files in your repo.

The board lives in `.agent-backlog/`. **A column is a numbered folder and a task
is a folder inside it**, so reading the board is `ls` and moving a task is one
`mv`. Each task is an [Open Knowledge
Format](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing)
bundle — it can grow its own `log.md`, `knowledge/`, and `raw/` when it earns
them, and stays a single file when it doesn't.

Two halves, and the split is the design:

- **The `/backlog` skill** is the board's only writer. One skill, dispatching to
  a subcommand.
- **The web board** only reads. It renders the columns and live-reloads.

Every other file-based board keeps `status:` in frontmatter and derives the
columns. Putting status in the path instead means there is exactly one place a
task's state can be.

**Git is optional.** Commit the board and a move is a `git mv` — a rename in the
diff, and `git log --follow` says when it happened. Ignore it, or keep it in a
directory that is not a repo at all, and everything still works; you just don't
get that history. The column folder is what carries the state, and it does not
need git to do it.

## Install

### Agentic installation

```text
Fetch https://raw.githubusercontent.com/agent-habilis/agent-backlog/main/docs/agentic-installation.md and follow it
```

### Manual installation

The binary carries the skill, so installing both is one line. `plug` writes
the `/backlog` skill into every harness it detects on the machine — Claude
Code, pi, Codex, Cursor, opencode. `unplug` removes it again.

```sh
brew install agent-habilis/tap/agent-backlog && agent-backlog plug
```

From a checkout, on any platform with Bun:

```sh
git clone https://github.com/agent-habilis/agent-backlog
cd agent-backlog
bun install && bun run install-local
```

`install-local` installs the checkout through `Formula/agent-backlog.rb`: it
runs `brew install --HEAD` with the formula's head pointed at the checkout,
then `agent-backlog plug`. Homebrew clones the branch, so it builds the last
commit — commit first.

Then, in any repo:

```
/backlog init
```

## Subcommands

`/backlog <subcommand> <the rest, in your own words>`

Everything after the subcommand is free content — prose, not flags.

| Subcommand | Example |
|---|---|
| `init` | `/backlog init` |
| `list` | `/backlog list doing` · `/backlog list #docs` |
| `create` | `/backlog create write the README, covering install and usage` |
| `show` | `/backlog show the readme one` |
| `move` | `/backlog move write-the-readme to doing` |
| `update` | `/backlog update write-the-readme bump it to high, CI needs it` |
| `archive` | `/backlog archive` |
| `lint` | `/backlog lint` |
| `web` | `/backlog web` |

An unknown subcommand stops and asks. It never guesses, and it never falls back
to editing board files by hand.

## The board

```
.agent-backlog/
├── index.md              type: Index   the board — goal, columns
├── log.md                type: Log     history, newest on top
├── 0-backlog/
│   ├── index.md          type: Index   the column — task order
│   └── write-the-readme/
│       ├── index.md      type: Task
│       ├── log.md        (optional)
│       ├── knowledge/    (optional)
│       └── raw/          (optional)
├── 1-doing/
├── 2-test/
├── 3-done/
└── archive/<year>/
```

Any folder matching `N-name` is a column, sorted by `N`. Add `4-blocked/` by
hand and it appears in `list`, in `move`, and on the web board — nothing needs
telling. `archive/` has no number, which is exactly why it is not a column.

A task's `index.md`:

```yaml
---
type: Task
title: Write the README
description: install, the four columns, and the single-writer rule
priority: high        # high | med | low
tags: [docs]
created: 2026-08-25
timestamp: 2026-08-25
---
```

There is **no `status:` field**. The column folder is the single source of
truth, and `lint` reports one if it finds it.

The column's `index.md` holds the *order* of its tasks; the folders on disk hold
*membership*. Readers reconcile the two — a folder the index has not heard of
still shows up, and an index line pointing at nothing is dropped. So you can
reorder a column in your editor, or drop a task folder in by hand, and neither
loses to the other.

## Why one writer

The skill writes; the web board reads. A board you could drag cards on would
need `git mv` and the index reconcile implemented a second time, in TypeScript,
and the two copies would drift — silently, because both would look right in
isolation. Reading is shared instead: `agent-backlog-core` parses the board and
both halves agree on what it says.

## The web board

```sh
cd <your repo>
agent-backlog web        # or: /backlog web
```

One page. Columns left to right, cards inside, a detail pane for the selected
task showing its body and its path. It watches `.agent-backlog/` and re-renders
within a second of a `/backlog move` in your terminal — no refresh.

Built with [visage-dom](https://github.com/visage-ui) and the
[moonspace](https://github.com/visage-ui) design system, same stack and same
palette as `agent-share`. One font, one size; hierarchy comes from colour and
weight, never from scale.

```sh
bun run dev        # the board, hot-reloading, against the cwd's board
bun run build      # compile build/agent-backlog (--all: the four release targets)
bun run install-local  # brew install --HEAD from this checkout, then plug
bun run plug       # install the skill from this checkout (--agent, --path pass through)
bun run unplug     # remove it
bun run typecheck
bun run test       # not bare `bun test` — see below
```

`bun run test` runs each package's own suite rather than one pass over the
repo, because a DOM is not a repo-wide need. `agent-backlog-web` and the
vendored packages register happy-dom; `agent-backlog-server` must not, since
happy-dom replaces `Response` and `ReadableStream` and `Bun.serve` refuses a
happy-dom `Response`. A single root preload would break the server package from
inside its own source.

`packages/agent-backlog-server/src/live.test.ts` is the live-update matrix —
does a disk change reach an attached client? Rows are labelled to match: A is
*what* changed, B is *how* the write happened, C is transport and liveness.

## Layout

```
skills/backlog/            SKILL.md, shared/, subskills/ — the only writer
packages/
  agent-backlog-core/      read a board from disk (read-only by design)
  agent-backlog-server/    the JSON endpoint and the change stream
  agent-backlog-web/       the one-page board
  agent-backlog-cli/       the binary: web, plug, unplug
  visage-dom/ visage-style/
  moonspace/ moonspace-theme/ moonspace-dom/
scripts/                   dev, build, install-local
Formula/agent-backlog.rb   the Homebrew formula; the release workflow bumps it
docs/vendoring.md          where the five vendored packages came from
```

## Releasing

The version lives in `packages/agent-backlog-cli/package.json`, and the tag
must match it.

1. Bump `version` there and commit: `chore: release vX.Y.Z`.
2. `git tag vX.Y.Z && git push origin main --follow-tags`.

The tag runs `.github/workflows/release.yml`: it compiles the four targets
(macOS and Linux, arm64 and x64) with `bun build --compile`, uploads them to a
GitHub Release, rewrites the version and checksums in
`Formula/agent-backlog.rb`, commits that to `main`, and mirrors the formula to
[agent-habilis/homebrew-tap](https://github.com/agent-habilis/homebrew-tap).
The mirror step needs the `TAP_PUSH_TOKEN` repository secret: a fine-grained
PAT with contents read/write on the tap.

a tool by agent-habilis
