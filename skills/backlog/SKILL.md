---
name: backlog
description: Manage the kanban board in .agent-backlog/ — a folder per column, a folder per task. Use for anything about the board or its tasks: "what's on the board", "what am I working on", "what's next", "add a task", "create a task for…", "move X to doing", "mark X done", "show me that task", "archive the finished ones", or opening the board's web view. Subcommands are init, list, create, show, move, update, archive, lint, web. Never edit files under .agent-backlog/ by hand — this skill is the board's only writer.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# /backlog

Invocation: `$ARGUMENTS`
Subcommand: `$0`

`$0` is the subcommand. **Everything after it is free content** — the rest of
the request, in the user's own words. Read it as prose and use it for whatever
the subcommand needs it for. Never re-parse it into flags, and never demand a
particular phrasing.

## 1. Validate the subcommand

Resolve `$0` against the table below, in this order:

1. **Exact match** → route.
2. **Empty** → `list`.
3. **Unique prefix, or a known alias** → route, and say in one line which one
   you took: `ls`/`ls -l` → `list`, `add`/`new` → `create`, `mv` → `move`,
   `edit` → `update`, `open`/`ui`/`serve` → `web`, `check` → `lint`.
4. **Anything else** → **stop.** Print the subcommand table and ask which one
   they meant. Change nothing.

On that last branch: do not guess the closest verb, do not invent a subcommand,
and above all **do not fall back to editing board files by hand**. An unknown
verb means the request has not been understood yet, and a dispatcher that
improvises past that is worse than no dispatcher.

`done X` is not a subcommand. It is `move X done` — say so and route there.

| Subcommand | Free content | Does |
|---|---|---|
| `init` | — | scaffold `.agent-backlog/` |
| `list` | optional filter | render the board |
| `create` | the task, in prose | new task in the first column |
| `show` | which task | print one task in full |
| `move` | which task, which column | move the folder between columns |
| `update` | which task, what changed | edit its body or fields |
| `archive` | which task, or nothing | move out to `archive/<year>/` |
| `lint` | — | OKF and index-vs-disk check |
| `web` | — | start the board's web view |

## 2. Run it

Read, in this order, and nothing else up front:

1. `shared/layout.md` — where the board is and what a task looks like.
2. `shared/conventions.md` — how to write to it. Skip for `list`, `show`, `web`.
3. `shared/resolve.md` — how the user's words name a task and a column. For
   `list`, `show`, `move`, `update`, `archive`.
4. `subskills/<subcommand>.md` — the steps.

`shared/okf.md` is read only when a subskill sends you there.

## Rules that hold for every subcommand

- **The board is at `.agent-backlog/`**, in the nearest ancestor of the cwd that
  has one. If there is none, the only valid move is `init` — offer it and stop.
- **Columns are discovered, never assumed.** List them before using one.
- **A task's slug is its folder name and never changes.**
- **There is no `status:` field.** The column folder says where a task is.
- **This skill is the board's only writer.** The web view reads. If the user
  asks you to edit a card outside these subcommands, do it through `update`.
