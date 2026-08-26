# Board layout

The board is `.agent-backlog/`, at the nearest ancestor of the cwd that has one.
If none exists, the only valid next step is `init`.

```
.agent-backlog/
├── index.md              type: Index   board root — goal, columns
├── log.md                type: Log     board history, newest on top
├── 0-backlog/
│   ├── index.md          type: Index   column — ordered task list
│   └── create-readme/                  a task bundle
│       ├── index.md      type: Task
│       ├── log.md        (optional) per-task history
│       ├── knowledge/    (optional) OKF bundle, once it earns one
│       └── raw/          (optional) verbatim artifacts
├── 1-doing/
├── 2-test/
├── 3-done/
└── archive/<year>/<task>/
```

## Columns are read from disk

A child folder is a column when its name matches `^[0-9]+-[a-z0-9-]+$`. Columns
sort by the numeric prefix; the column **name** is the part after the first `-`.
`archive/` has no prefix, so it is not a column — that is the whole
discriminator. A board with `4-blocked/` added by hand has five columns, and
nothing needs to be told about it.

```bash
# columns, in board order
find .agent-backlog -maxdepth 1 -type d -name '[0-9]*-*' | sort -V

# task folders in one column
find .agent-backlog/1-doing -mindepth 1 -maxdepth 1 -type d
```

`find`, not `ls`. `ls` is aliased to a long-format lister on plenty of machines
(this one included), and a recipe that parses its output silently returns
garbage there rather than failing.

Never hardcode `backlog/doing/test/done`. Always list first.

## A task

The task folder's name is its **slug** — kebab-case, `-2` on collision. The slug
is the identity: it survives a move between columns and it survives a retitle.
Never rename a task folder.

`<column>/<slug>/index.md`:

```markdown
---
type: Task
title: Create README
description: seed the repo docs
priority: high
tags: [docs, onboarding]
created: 2026-08-25
timestamp: 2026-08-25
---

# Create README

<why this task exists, in prose — a paragraph, not a restatement of the title>

## Scope
- <what is in, one bullet each>
- <what is deliberately out>

## Todo
- [ ] <the steps>
```

- `priority` is `high`, `med`, or `low`. Nothing else. Default `med`.
- `tags` is a flow sequence of kebab-case words: `[docs, onboarding]`.
- `created` never changes. `timestamp` is bumped on every write.
- `description` is one line, and it is what the column index shows.
- `## Scope` and `## Todo` are optional on a small task; the prose is not.

**There is no `status:` field.** The column folder is the single source of
truth for where a task sits. If you find one, that is a lint finding, not a
value to read. Two sources of truth for status is the one failure this whole
layout exists to prevent.

## Column index: order lives here, membership lives on disk

`<column>/index.md`:

```markdown
---
type: Index
title: doing
---

# doing

- [Create README](create-readme/index.md) — high · docs — seed the repo docs
- [Prune old branches](prune-old-branches/index.md) — low — housekeeping
```

**The line format, stated once — every subskill that writes one uses this:**

```
- [<title>](<slug>/index.md) — <priority> · <tags, comma-separated> — <description>
```

**Omit the ` · <tags>` run entirely when the task has no tags** — the second
example above. Keeping the separator for an empty list writes
`— low ·  — housekeeping`, which `lint` then reports as disagreeing with the
frontmatter it came from.

A write appends or removes exactly one line and leaves the rest alone.

The two halves are reconciled, never one trusted alone:

- **Index order wins** for tasks that exist on disk — somebody arranged that.
- **A folder the index has not heard of is still a task**, listed at the end.
- **An index line pointing at a folder that is gone is dropped.**

So a hand-added folder is never lost and a hand-sorted column is never
clobbered. `list` reconciles as it reads; `lint` reports the drift and rewrites
the index on confirmation.

## Board root and log

`.agent-backlog/index.md` carries `type: Index`, the board `title`, and a
one-line `description` of what this board is for.

`.agent-backlog/log.md` is `type: Log`, newest entry on top:

```markdown
## 2026-08-25 14:32

Moved: create-readme — 0-backlog → 1-doing
```

Every mutating subcommand writes one line here. `list`, `show`, `lint`, and
`web` write nothing.
