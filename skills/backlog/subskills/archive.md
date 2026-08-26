# /backlog archive [which task]

File finished work out of the board so the columns stay readable.

## Steps

1. Find the board. List the columns.
2. Pick the targets:
   - free content naming a task → resolve it per `../shared/resolve.md`
   - **no free content → every task in the last column** (highest numeric
     prefix). List them and confirm before moving more than one.
3. `mkdir -p .agent-backlog/archive/<year>` — `date +%Y`.
4. For each task:

   ```bash
   SRC=.agent-backlog/<column>/<slug>
   DST=.agent-backlog/archive/<year>/<slug>

   [ -e "$DST" ] && DST="$DST-2"   # see the renaming note below
   git mv "$SRC" "$DST" 2>/dev/null || mv "$SRC" "$DST"
   ```

   Same `git mv || mv` fallback as `move.md`, for the same reason — it works
   whether or not the board is in git. **The guard is the opposite one**, and
   the difference is deliberate: `move` *stops* on a collision, this *renames*.
   A move to an occupied slug means two live tasks are fighting over a name and
   the user should settle it; a finished task landing on an archived one is just
   two pieces of history, and neither should be lost.

   So a slug already in that year's archive gets `-2`. This is the one place a
   folder is renamed, and only to avoid clobbering a finished task.
5. Remove each task's line from its column `index.md`.
6. Append one line per task to `.agent-backlog/archive/<year>/index.md`,
   creating it with frontmatter if missing:

   ```markdown
   ---
   type: Index
   title: archive <year>
   ---

   # archive <year>

   - [<title>](<slug>/index.md) — archived <date +%F> from <column>
   ```

7. Prepend one entry to the board `log.md` covering the whole run:

   ```markdown
   ## <date "+%Y-%m-%d %H:%M">

   Archived: <n> from <column> — <slugs, comma separated>
   ```

8. Print the count and where they went.

## Rules

- **Never delete.** Archiving is a move; the task keeps its history and its
  bundle. If the user wants a task gone, that is their own `rm`.
- `archive/` is not a column — it has no numeric prefix, so `list` and `move`
  never see it. That is deliberate.
- Confirm before archiving more than one task, always.
- A task still in an early column can be archived if the user names it —
  abandoned work is finished work of a kind — but say which column it came from.
