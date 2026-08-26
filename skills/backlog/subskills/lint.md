# /backlog lint

Check the board against `../shared/layout.md` and `../shared/okf.md`, report,
then fix on confirmation.

## Steps

1. Find the board. List the columns.
2. Walk every column and every task folder, and collect findings. One line each,
   `<path>: <what is wrong>`:

   **Frontmatter**
   - a managed markdown file with no frontmatter, or a block with no `type:`
   - a task `index.md` whose `type:` is not `Task`
   - a column `index.md` whose `type:` is not `Index`
   - **a `status:` field on a task** — the column folder is the source of truth
   - `priority:` that is not `high`, `med`, or `low`
   - `tags:` that is not a flow sequence of kebab-case words
   - a missing `created:` or `timestamp:`, or a date that is not `YYYY-MM-DD`

   **Index vs disk**
   - a task folder no column index lists
   - an index line pointing at a folder that is not there
   - a duplicated index line
   - an index line whose title, priority, tags, or description disagrees with
     the task's frontmatter

   **Structure**
   - a task folder with no `index.md`
   - a folder nested deeper than one level under a column (a task's own
     `knowledge/` and `raw/` excepted)
   - a slug that is not kebab-case
   - a broken relative markdown link
   - a task `index.md` past ~150 lines across three or more topics, or one `##`
     section past ~50 lines — a promotion candidate, not an error

3. Print the findings grouped by kind, with a count. Clean board → say so in one
   line and stop.
4. Ask before fixing. Then fix, in this order:
   - rewrite column indexes from the reconciled order (see `../shared/layout.md`)
   - add missing frontmatter
   - fill missing dates, best source first:
     1. `git log --diff-filter=A --format=%ad --date=short -1 -- <file>
        2>/dev/null` for `created`, and the same without `--diff-filter` for
        `timestamp`. Redirect stderr: a repo with no commits answers with a
        `fatal:` that is not a problem here, just an empty result.
     2. if that is empty — an untracked, ignored, or non-repo board, all normal
        states (`../shared/conventions.md`, Git is optional) — use the file's
        own mtime: `date -r <file> +%F`
     3. say which source each filled date came from. An mtime is weaker
        evidence than a commit, and a reader should be able to tell.
   - normalise `priority` and `tags`
5. Report which findings you fixed and which you left. Log one line:

   ```markdown
   ## <date "+%Y-%m-%d %H:%M">

   Linted: <n> findings, <m> fixed
   ```

## Rules

- **Never delete a task to resolve a finding.** An orphan folder gets listed in
  the index; it does not get removed.
- **Never invent a `status:` fix by moving a task.** A `status: doing` on a card
  in `0-backlog/` is a *field to delete*, not a move to perform — the folder is
  right by definition. Say which value you dropped, in case it was the truth.
- A promotion candidate is reported and never acted on without a yes.
- Report first, always. `lint` that fixes before it prints is a diff nobody
  asked for.
