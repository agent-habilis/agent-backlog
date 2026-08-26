# /backlog web

Open the board's web view.

## Steps

1. Find the board. No board → offer `init` and stop.
2. Find the `agent-backlog` checkout — the repo holding this skill. The skill
   directory is usually a symlink into it:

   ```bash
   dirname "$(dirname "$(readlink -f "<skill-dir>")")"
   ```

   If that does not land on a directory holding `package.json` and `scripts/`,
   ask the user where the checkout is.
3. From that checkout, start the server in the background, with the board's repo
   as the working directory so it finds the right `.agent-backlog/`:

   ```bash
   cd <board-repo> && bun --hot <checkout>/scripts/dev.ts
   ```

   `PORT` picks the port; the default is 4321. If it is taken, set another and
   say which.
4. Print the URL and one line: the view is read-only, and it live-reloads — a
   `/backlog move` in the terminal shows up in the browser within a second.
5. Nothing is logged.

## Rules

- Run it in the background. Never block the session on a server.
- If `bun` is missing, say so and stop. Do not reach for another runtime.
- Do not offer to edit the board from the browser. It reads; this skill writes.
