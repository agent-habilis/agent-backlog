# /backlog show <which task>

Print one task in full.

## Steps

1. Find the board. List the columns.
2. Resolve the task from the free content, per `../shared/resolve.md`.
3. Read `<column>/<slug>/index.md`. Print:
   - the column it sits in, and the path
   - title, priority, tags, created, last updated
   - the body verbatim, `## Todo` checkboxes included
4. If `<slug>/log.md` exists, print its newest three entries.
5. If `<slug>/knowledge/index.md` exists, print its entry lines — not the
   concept files. That is the point of an index.
6. If `<slug>/raw/` exists, print the filenames only. Never their contents.
7. Nothing is logged.

## Rules

- Read-only. `show` never fixes anything it notices — hand that to `lint`.
- No free content → say which task you would need, and print the board.
