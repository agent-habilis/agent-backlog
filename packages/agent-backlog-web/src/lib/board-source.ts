import type { Board } from 'agent-backlog-core'
import { signal } from 'visage-dom'

/**
 * The board as the server currently reads it, plus how it got here.
 *
 * `error` rather than a thrown failure: the board on screen stays on screen
 * when a poll fails, and a line of chrome says the view is stale. Blanking a
 * board that is still true on disk because one fetch lost a race would be the
 * worse answer.
 */
export interface BoardState {
  board: Board | null
  error: string | null
  loading: boolean
}

export const boardState = signal<BoardState>({ board: null, error: null, loading: true })

/**
 * The read in flight, if any, and whether another was asked for while it ran.
 *
 * Four things trigger a read — mount, reconnect, a change frame, and returning
 * to the tab — and a burst legitimately produces several change frames in a
 * row. Without coalescing, one `git checkout` issues three overlapping requests
 * per tab and whichever *resolves* last wins, which is not necessarily the one
 * issued last. One in flight at a time, with a single re-run queued behind it,
 * makes the newest request the one that decides the board.
 */
let inFlight: Promise<void> | null = null
let again = false

export function fetchBoard(): Promise<void> {
  if (inFlight) {
    again = true
    return inFlight
  }
  inFlight = read().finally(() => {
    inFlight = null
    if (again) {
      again = false
      void fetchBoard()
    }
  })
  return inFlight
}

async function read(): Promise<void> {
  try {
    const response = await fetch('/api/board')
    if (!response.ok) throw new Error(await response.text())
    boardState.value = { board: (await response.json()) as Board, error: null, loading: false }
  } catch (cause) {
    boardState.value = {
      board: boardState.peek().board,
      error: cause instanceof Error ? cause.message : String(cause),
      loading: false,
    }
  }
}

/**
 * How long the stream may stay silent before it is presumed dead.
 *
 * Twice the server's 5s heartbeat plus room for a slow tick. `EventSource`
 * reconnects when a connection *drops*, but not when one stays open and stops
 * carrying anything — which is exactly what happens when `bun --hot` reloads
 * away the watcher feeding it, and what a proxy timeout or a slept laptop
 * produces too. A board that silently stopped updating looks identical to a
 * board nobody has touched, so the silence has to be measured.
 */
const WATCHDOG_MS = 12_000

/**
 * Refetch whenever the server says `.agent-backlog/` changed.
 *
 * The event carries no payload on purpose. The server already knows how to read
 * a board and the client already knows how to ask for one; shipping the diff
 * down the stream would be a second encoding of the board's shape, and the
 * board is small enough that refetching it costs less than keeping the two in
 * agreement.
 *
 * Three things restart the read, and each covers a gap the others leave:
 * `open` catches whatever changed while the stream was down, the watchdog
 * catches a stream that is up but no longer fed, and returning to the tab
 * catches the ordinary case — you ran `/backlog move` in a terminal and came
 * back to look.
 */
export function watchBoard(): { close: () => void } {
  let events: EventSource | null = null
  let watchdog: ReturnType<typeof setTimeout> | null = null
  let stopped = false

  const onVisible = () => {
    if (document.visibilityState === 'visible') void fetchBoard()
  }

  /**
   * Whether this is a *re*connect.
   *
   * The refetch on `open` exists to catch what changed while the stream was
   * down — true for a reconnect, vacuous for the first one, where it merely
   * repeats the read the component already issued at mount.
   */
  let reconnecting = false

  const connect = () => {
    if (stopped) return
    events?.close()
    events = new EventSource('/events')
    // One rule, stated once: any frame rearms the watchdog, and the two that
    // carry news also cost a read. `message` is unnamed events only, so a
    // `beat` lands on its own listener and never triggers a fetch.
    for (const type of ['open', 'message', 'beat'] as const) {
      events.addEventListener(type, () => {
        kick()
        if (type === 'message' || (type === 'open' && reconnecting)) void fetchBoard()
      })
    }
    reconnecting = true
    kick()
  }

  function kick() {
    if (watchdog) clearTimeout(watchdog)
    if (stopped) return
    watchdog = setTimeout(connect, WATCHDOG_MS)
  }

  document.addEventListener('visibilitychange', onVisible)
  connect()

  return {
    close() {
      stopped = true
      if (watchdog) clearTimeout(watchdog)
      document.removeEventListener('visibilitychange', onVisible)
      events?.close()
    },
  }
}
