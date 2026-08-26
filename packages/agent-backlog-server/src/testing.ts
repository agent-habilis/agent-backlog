/**
 * Harness for the live-update matrix.
 *
 * Deliberately not a test file: `live.test.ts` is the matrix, and everything
 * about *how* a client attaches lives here, so a row reads as one mutation and
 * one assertion. Building the board on disk is not here either — that is
 * `agent-backlog-core/testing`, shared with core's own suite.
 *
 * No browser. What is under test is "the server notices a disk change and tells
 * an attached client", which is entirely below the DOM — the render is already
 * covered by the component tests. A raw SSE reader also lets a row assert the
 * *absence* of a frame, which `EventSource` makes awkward.
 */

import type { Board } from 'agent-backlog-core'

import { dataRoutes } from './serve.ts'

export {
  addColumn,
  addTask,
  cleanScratches,
  link,
  makeScratch,
  taskMarkdown,
  type Scratch,
  type TaskFixture,
} from 'agent-backlog-core/testing'

/** Long enough for the fixture's own filesystem events to arrive and be dropped. */
const DRAIN_MS = 120

/**
 * A server bound to an ephemeral port, answering only the two data endpoints.
 *
 * `dataRoutes` is the same table `dev.ts` and `start.ts` mount, so the matrix
 * exercises the routing users hit rather than a copy of it. No page route: the
 * matrix never loads HTML, and leaving the bundler out keeps a run to
 * milliseconds.
 */
export function startServer(cwd: string): { port: number; stop: () => void } {
  const server = Bun.serve({ port: 0, routes: dataRoutes(cwd) })
  // `port` is optional on the type because a unix-socket server has none; this
  // one always binds TCP.
  const port = server.port
  if (port === undefined) throw new Error('server bound no port')
  return { port, stop: () => server.stop(true) }
}

/**
 * An attached SSE client that records frames as they arrive.
 *
 * Frames, not events: a row needs to tell a `change` from a `beat` from the
 * opening comment, and needs to be able to say "nothing arrived", so the raw
 * text is what gets kept.
 */
export interface Client {
  /** How many changes have arrived in total, for rows that count them. */
  received: number
  /** Resolves with the next unread change, or `null` after `ms`. */
  nextChange(ms: number): Promise<string | null>
  /** True if no change arrives within `ms`. */
  quietFor(ms: number): Promise<boolean>
  close(): void
}

export async function attach(port: number): Promise<Client> {
  const controller = new AbortController()
  const response = await fetch(`http://localhost:${port}/events`, {
    signal: controller.signal,
    headers: { accept: 'text/event-stream' },
  })
  const body = response.body
  if (!body) throw new Error('no stream body')

  /** Changes not yet handed to a row. A read consumes; nothing accumulates. */
  const pending: string[] = []
  let received = 0
  let connected = false
  let wake: null | (() => void) = null

  const ring = () => {
    const pull = wake
    wake = null
    pull?.()
  }

  void (async () => {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        // SSE frames are blank-line separated; keep the trailing partial.
        const frames = buffer.split('\n\n')
        buffer = frames.pop() ?? ''
        for (const frame of frames) {
          if (frame.startsWith(':')) {
            connected = true
            ring()
            continue
          }
          if (frame.includes('event: beat')) continue
          const data = frame
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim())
            .join('\n')
          if (!data) continue
          received += 1
          pending.push(data)
          ring()
        }
      }
    } catch {
      // The abort on close lands here.
    }
  })()

  const client: Client = {
    get received() {
      return received
    },
    async nextChange(ms) {
      if (pending.length > 0) return pending.shift() ?? null
      return await new Promise<string | null>((resolve) => {
        const timer = setTimeout(() => {
          wake = null
          resolve(null)
        }, ms)
        wake = () => {
          clearTimeout(timer)
          resolve(pending.shift() ?? null)
        }
      })
    },
    async quietFor(ms) {
      const before = received
      await Bun.sleep(ms)
      pending.length = 0
      return received === before
    },
    close() {
      controller.abort()
    },
  }

  /*
   * Wait for the stream, then discard whatever the fixture's own writes
   * produced.
   *
   * The first half is event-driven — the server sends `: connected` as its
   * first frame, so there is no reason to guess at a duration for it. Only the
   * second half needs a clock: FSEvents coalesces, so building the scratch
   * board can deliver events *after* the watcher attaches, and a row would read
   * a frame about its own fixture and call it a pass.
   */
  await new Promise<void>((resolve) => {
    if (connected) return resolve()
    const timer = setTimeout(resolve, 1_000)
    wake = () => {
      clearTimeout(timer)
      resolve()
    }
  })
  await Bun.sleep(DRAIN_MS)
  pending.length = 0
  received = 0

  return client
}

export async function fetchBoard(port: number): Promise<Board> {
  const response = await fetch(`http://localhost:${port}/api/board`)
  return (await response.json()) as Board
}

/** The raw board response, for rows that assert on the status rather than the body. */
export function boardStatus(port: number): Promise<Response> {
  return fetch(`http://localhost:${port}/api/board`)
}

/** Every task slug on the board, column by column. */
export function slugsByColumn(board: Board): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const column of board.columns) out[column.name] = column.tasks.map((task) => task.slug)
  return out
}
