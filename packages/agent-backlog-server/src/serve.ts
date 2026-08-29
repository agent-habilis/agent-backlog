/**
 * The two data endpoints, shared by `dev.ts` and the binary's `web.ts` so a hot-reloading
 * run and a built one answer identically.
 *
 * The board is read from the cwd's nearest `.agent-backlog/`, resolved per
 * request rather than captured at start: the server outlives `/backlog init`,
 * and a run started in a repo before the board existed should pick it up
 * without a restart.
 */

import { watch, type FSWatcher } from 'node:fs'

import { BOARD_DIR, findBoardRoot, readBoard } from 'agent-backlog-core'

export const PORT = Number(process.env['PORT'] ?? 4321)

/** One per process; the per-connection instance bought nothing. */
const encoder = new TextEncoder()

/** Coalesces the burst of events one `git mv` produces into a single notice. */
const SETTLE_MS = 50

/**
 * How often the stream proves it is still alive.
 *
 * It exists because an SSE connection can stay *open* while the thing feeding
 * it has stopped: `bun --hot` tears down the previous module instance's watcher
 * on reload, and an idle proxy or a slept laptop does the same. Without a
 * heartbeat the browser cannot tell that apart from a quiet board.
 *
 * A **named** event, not a `:` comment. Comments are the obvious spelling and
 * the wrong one — the SSE spec has clients discard them without dispatching, so
 * a comment heartbeat is invisible to exactly the watchdog it exists to feed.
 * Naming it also keeps it off `onmessage`, which fires only for unnamed events,
 * so a beat resets the clock without triggering a board refetch.
 * Pairs with the client's watchdog in `board-source.ts`.
 */
const HEARTBEAT_MS = 5_000

/**
 * How often to look for a board that does not exist yet.
 *
 * Only runs while there is none, and stops on the first sighting — so this is
 * the cost of having a page open across `/backlog init`, not a standing poll.
 */
const APPEARANCE_MS = 1_000

/**
 * The board as JSON, read fresh.
 *
 * `cwd` is a parameter rather than a direct `process.cwd()` read so a test can
 * point a server at a scratch board instead of at the repo it happens to be
 * running in. Every caller in `scripts/` takes the default, so the deployed
 * behavior is unchanged.
 *
 * Resolved per request, not captured at start: the server outlives
 * `/backlog init`, and a run started before the board existed should pick it up
 * without a restart.
 */
export async function boardResponse(cwd: string = process.cwd()): Promise<Response> {
  const root = await findBoardRoot(cwd)
  if (root === null) {
    return Response.json(
      { error: `no ${BOARD_DIR}/ at or above ${cwd} — run /backlog init` },
      { status: 404 },
    )
  }
  return Response.json(await readBoard(root))
}

/**
 * The data half of the app, as a Bun route table.
 *
 * Exported so `dev.ts`, the binary's `web.ts` and the test harness mount the *same* two
 * routes instead of three hand-copied tables — the harness was otherwise
 * exercising a route map maintained separately from the one users hit, which is
 * the one place a divergence would go unnoticed.
 */
export function dataRoutes(cwd: string = process.cwd()) {
  return {
    '/api/board': () => boardResponse(cwd),
    '/events': (request: Request) => eventsResponse(request.signal, cwd),
  }
}

/**
 * An SSE stream that says "something changed" and nothing more.
 *
 * No payload: the server already knows how to read a board and the client
 * already knows how to ask for one, so shipping a diff would be a second
 * encoding of the board's shape to keep in agreement with the first. The board
 * is small enough that a refetch is cheaper than that agreement.
 *
 * The watcher is created per connection and closed with it. One watcher shared
 * across connections would outlive the last reader, and `fs.watch` on a
 * directory tree is not free to leave running.
 */
export function eventsResponse(signal: AbortSignal, cwd: string = process.cwd()): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let timer: ReturnType<typeof setTimeout> | undefined
      let heartbeat: ReturnType<typeof setInterval> | undefined
      let watcher: FSWatcher | null = null
      let appearance: ReturnType<typeof setInterval> | undefined
      let closed = false

      const close = () => {
        if (closed) return
        closed = true
        // `clearTimeout`/`clearInterval` are no-ops on `undefined`, so the
        // handles are typed that way and need no guards here.
        clearTimeout(timer)
        clearInterval(heartbeat)
        clearInterval(appearance)
        watcher?.close()
        try {
          controller.close()
        } catch {
          // Already closed by the client going away first.
        }
      }

      /** Every write goes through here — a closed controller throws. */
      const send = (frame: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(frame))
        } catch {
          close()
        }
      }

      signal.addEventListener('abort', close)

      // An immediate comment so the browser's `open` fires now rather than on
      // the first board change — the client refetches on `open`, and without
      // this a page loaded before any edit would sit on its initial read with
      // no confirmation the stream is live.
      send(': connected\n\n')
      heartbeat = setInterval(() => send('event: beat\ndata: -\n\n'), HEARTBEAT_MS)

      /*
       * Bind the watcher to the board, whenever the board turns up.
       *
       * One path, not two. A board that already exists is just the first tick
       * finding it immediately — writing that as its own branch meant the
       * "wait for it" branch re-ran `findBoardRoot` anyway, so the same lookup
       * was spelled twice and only one copy could be the one under test.
       *
       * Waiting at all is the point: returning when there is no board yet left
       * the stream open, sending heartbeats over a directory nobody watched.
       * That is the worst shape a bug can take — the heartbeat kept the
       * client's watchdog satisfied, so the liveness mechanism hid the
       * deadness, and a page open across `/backlog init` never updated again.
       *
       * A poll rather than a watch on the parent: the parent is the repo root,
       * and watching it recursively would mean watching `node_modules`. It runs
       * only while there is no board and stops the moment one appears.
       */
      const adopt = async () => {
        if (watcher !== null || closed) return
        const found = await findBoardRoot(cwd)
        // Re-checked after the await: two ticks can be in flight at once.
        if (found === null || watcher !== null || closed) return

        clearInterval(appearance)
        appearance = undefined
        watcher = watch(found, { recursive: true }, () => {
          clearTimeout(timer)
          timer = setTimeout(() => send('data: change\n\n'), SETTLE_MS)
        })
        // Only when the board arrived late — a board that was here all along
        // is already covered by the client's fetch on `open`.
        if (announce) send('data: change\n\n')
      }

      let announce = false
      void adopt().then(() => {
        announce = true
        if (watcher === null && !closed) {
          appearance = setInterval(() => void adopt(), APPEARANCE_MS)
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    },
  })
}
