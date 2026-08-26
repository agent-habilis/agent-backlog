# /backlog init

Scaffold `.agent-backlog/` in the current repo.

## Steps

1. If `.agent-backlog/` already exists at or above the cwd, say where it is and
   **fill in only what is missing**. Never overwrite a file that is there.
2. Pick the root: the git toplevel (`git rev-parse --show-toplevel`), else the
   cwd. Say which one you chose.
3. Ask for the board's one-line goal — what this board is for. One question, and
   accept a short answer.
4. Write `.agent-backlog/index.md`:

   ```markdown
   ---
   type: Index
   title: <repo name>
   description: <the goal, one line>
   ---

   # <repo name>

   A kanban board. Each column is a numbered folder; each task is a folder
   inside it, with its own `index.md`.

   Managed by the `/backlog` skill — it is the only writer. Read it with
   `/backlog list`, or `/backlog web` for the board view.
   ```

5. Write `.agent-backlog/log.md`:

   ```markdown
   ---
   type: Log
   ---

   # log
   ```

6. Create the four columns — `0-backlog`, `1-doing`, `2-test`, `3-done` — each
   with an `index.md`:

   ```markdown
   ---
   type: Index
   title: <name>
   ---

   # <name>
   ```

   Use different columns if the user named their own. The numeric prefix sets
   the left-to-right order.

7. Log the creation, then print the tree and the four column names.

## Rules

- Never overwrite. Scaffold only what is missing.
- Do not create `archive/` — `archive` makes it on first use.
- Do not seed an example task. An empty board is not a broken one.
