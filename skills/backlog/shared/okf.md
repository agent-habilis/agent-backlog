# OKF, as it applies to a board

Every folder under `.agent-backlog/` is an [Open Knowledge
Format](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing)
bundle: a directory of markdown files where **each file is one concept**, YAML
frontmatter types it, and standard markdown links relate them. The file path is
the concept's identity. `index.md` and `log.md` are reserved names —
navigation and chronological history.

**Frontmatter.** Every managed markdown file starts with a YAML block whose only
required key is `type`. A file *has* frontmatter only when line 1 is `---`, a
closing `---` follows, and the block holds a `type:` key. That last condition is
what stops a document opening on a horizontal rule from being read as
frontmatter.

| File | `type` | Other fields |
|------|--------|--------------|
| `.agent-backlog/index.md` | `Index` | `title`, `description` |
| `.agent-backlog/log.md` | `Log` | — (per-entry `## YYYY-MM-DD HH:MM` headers carry the dates) |
| `<column>/index.md` | `Index` | `title` (the column name) |
| `<column>/<task>/index.md` | `Task` | `title`, `description`, `priority`, `tags`, `created`, `timestamp` |
| `<column>/<task>/log.md` | `Log` | — |
| `<column>/<task>/knowledge/index.md` | `Index` | `title` |
| `<column>/<task>/knowledge/<concept>.md` | `Decision` \| `Pattern` \| `Gotcha` \| `Blocker` \| `Dependency` | `title`, `timestamp`, `tags` |
| `<column>/<task>/raw/*` | — | **never touched** |

**Links** are markdown links relative to the containing file:
`[Create README](create-readme/index.md)` from a column index.

**`raw/` exemption.** Files in `raw/` never get frontmatter or edits of any
kind. They are verbatim artifacts — link *targets*, not concepts.

## Progressive disclosure: when a task grows a bundle

A task is one file until it isn't. Promote a file to a folder-with-`index.md`
when **both** hold:

1. It holds more than one distinguishable concept. One concept stays one file,
   however long.
2. A reader typically needs only a slice. Bundling helps random access; it does
   nothing for a document read start to finish.

**Trip-wires** (symptoms, not the rule — they make `lint` flag a candidate):
`index.md` past ~150 lines spanning three or more topics, or a single `##`
section past ~50 lines.

**Never promote** `log.md` (a chronological stream — rotate to `log-<year>.md`
if it gets huge) or `raw/` (artifacts, not concepts).

**Mechanics**, the same at every depth: create `<name>/`, move content into
per-concept files, write `<name>/index.md` with one line per entry, rewrite
inbound links, delete the original file last.

In practice: a task that accumulates findings while it sits in `2-test/` grows
`knowledge/`, one topic per file. A task that is three bullets stays three
bullets.

## What a task bundle is not

A task is not a notes folder. It carries no `sources.md`, no `preamble.md`, and
no `Memory` type — a memory is about the collaboration, and it belongs in
`~/Notes/`, not on a board that gets archived. If a task teaches something
durable, say so and let the user put it where durable things live.
