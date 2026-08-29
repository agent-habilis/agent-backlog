# /backlog web

Open the board's web view.

## Steps

1. Find the board. No board → offer `init` and stop.
2. Check that the binary is on the PATH: `agent-backlog --version`. If it is
   not, stop and tell the user how to install it:

   ```sh
   brew install agent-habilis/tap/agent-backlog && agent-backlog plug
   ```

   From a checkout of the repo: `bun install && bun run build`, then put
   `build/agent-backlog` on the PATH.
3. Start the server in the background, with the board's repo as the working
   directory so it finds the right `.agent-backlog/`:

   ```bash
   cd <board-repo> && agent-backlog web
   ```

   `PORT` picks the port; the default is 4321. If it is taken, set another and
   say which.
4. Print the URL and one line: the view is read-only, and it live-reloads — a
   `/backlog move` in the terminal shows up in the browser within a second.
5. Nothing is logged.

## Rules

- Run it in the background. Never block the session on a server.
- Do not offer to edit the board from the browser. It reads; this skill writes.
