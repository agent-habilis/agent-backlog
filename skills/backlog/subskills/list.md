# /backlog list [filter]

Render the board.

## Steps

1. Find the board. No board → offer `init` and stop.
2. List the columns (`../shared/layout.md` — `find`, never `ls`).
3. For each column, reconcile order against membership (see
   `../shared/layout.md`):
   - read `<column>/index.md` for the order,
   - `find <column> -mindepth 1 -maxdepth 1 -type d` for what is actually there,
   - indexed folders keep their position, unknown folders go at the end,
     index lines pointing at nothing are skipped.

   If the two disagree, render the reconciled board and add one line at the
   bottom: `<column>: index is out of date — /backlog lint to fix`. Do not
   rewrite anything here; `list` does not write.
4. Read each task's frontmatter for title, priority, tags, description.
5. Print, grouped by column, newest column last:

   ```
   0-backlog (3)
     high · docs        Create README — seed the repo docs
     med                Wire up CI
     low  · chore       Prune old branches

   1-doing (1)
     high · api         Rate-limit the public endpoint

   2-test (0)
   3-done (2)
     …
   ```

   A grouped list, not an ASCII board — terminal width is not knowable, and a
   list survives being read aloud, piped, and summarised. Empty columns still
   print, with their count; a column that vanishes when empty makes the board
   look smaller than it is.
6. Nothing is logged.

## Filters

The free content, if any, filters:

- a column name, in any of the forms `../shared/resolve.md` accepts → that
  column alone
- `#tag` or a bare tag that matches → tasks carrying it
- `priority:high`, or just `high` → that priority
- anything else → treat as a substring match on title and description

Say what you filtered by, and print the count you dropped.
