# /backlog move <which task> <which column>

Move a task between columns. The move *is* the status change.

## Steps

1. Find the board. List the columns (`../shared/layout.md`).
2. **Resolve the task and the destination** — both per `../shared/resolve.md`,
   which also says how to split one from the other.
3. Same column as it is already in → say so and stop. Nothing to do.
4. Move the folder whole with the guarded recipe in `../shared/conventions.md`
   (Moving). Never copy-then-delete: that loses the rename where there is one,
   and can lose the folder anywhere.
5. Remove the task's line from `<from>/index.md`.
6. Append the task's line to the bottom of `<to>/index.md`, rebuilt from the
   task's current frontmatter in the format `../shared/layout.md` defines
   (including its rule for a task with no tags).

   Bottom, not top: a column reads oldest-first, and arriving work has not
   earned the top of the queue.
7. Bump `timestamp:` in the task's `index.md` to `date +%F`.
8. Prepend to the board `log.md`:

   ```markdown
   ## <date "+%Y-%m-%d %H:%M">

   Moved: <slug> — <from> → <to>
   ```

9. Print one line: `<slug>: <from> → <to>`.

## Rules

- **Never rename the folder.** The slug is the identity; only its parent
  changes.
- Never edit the task's body on a move. A move is a move.
- Several tasks named at once → move each, confirm first if there are more than
  three.
- If the move fails — the guard tripped, or `mv` itself errored — stop before
  touching either index. A half-moved task that is still listed in two columns
  is worse than one that never moved. (`git mv` alone failing is not a failure;
  the fallback handles it and nothing needs saying.)
