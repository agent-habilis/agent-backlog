/**
 * The live-update matrix: does a disk change reach an attached client?
 *
 * Rows are labelled A1, B2, … to match the matrix in the plan. Two grades:
 *
 * - **MUST** — the UI has to reflect it. A red MUST row is a bug.
 * - **SHOULD** — no spurious update. A red SHOULD row is a cost, not a defect;
 *   it is marked `todo` so the suite stays green while still reporting.
 *
 * Timings are generous on purpose. The server debounces 50ms, so a MUST row
 * waits up to `SETTLE` for its frame; a SHOULD row waits `QUIET` and asserts
 * nothing came. Both are far above the real latency, so a red row means a
 * missing notification rather than a slow machine.
 */

import { afterEach, describe, expect, test } from 'bun:test'
import { mkdir, rename, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  addColumn,
  addTask,
  attach,
  boardStatus,
  cleanScratches,
  fetchBoard,
  makeScratch,
  slugsByColumn,
  startServer,
  taskMarkdown,
  type Client,
  type Scratch,
} from './testing.ts'

/** How long a MUST row waits for its frame. Server debounce is 50ms. */
const SETTLE = 1_500
/** How long a SHOULD row waits to conclude nothing is coming. */
const QUIET = 400

const stops: Array<() => void> = []
const clients: Client[] = []

afterEach(async () => {
  for (const client of clients.splice(0)) client.close()
  for (const stop of stops.splice(0)) stop()
  await cleanScratches()
})

/** A board with four columns and one task in the first, plus a live client. */
async function board(): Promise<{ scratch: Scratch; port: number; client: Client }> {
  const scratch = await makeScratch()
  for (const dir of ['0-backlog', '1-doing', '2-test', '3-done']) await addColumn(scratch, dir)
  await addTask(scratch, '0-backlog', 'a-task', { title: 'A task' })

  const server = startServer(scratch.cwd)
  stops.push(server.stop)
  const client = await attach(server.port)
  clients.push(client)
  return { scratch, port: server.port, client }
}

describe('A — what changed', () => {
  test('A1 task index.md title edited — MUST update', async () => {
    const { scratch, port, client } = await board()
    await writeFile(
      join(scratch.root, '0-backlog/a-task/index.md'),
      taskMarkdown({ title: 'Renamed' }),
    )
    expect(await client.nextChange(SETTLE)).not.toBeNull()
    expect((await fetchBoard(port)).columns[0]?.tasks[0]?.title).toBe('Renamed')
  })

  test('A2 task priority edited — MUST update', async () => {
    const { scratch, port, client } = await board()
    await writeFile(
      join(scratch.root, '0-backlog/a-task/index.md'),
      taskMarkdown({ priority: 'high' }),
    )
    expect(await client.nextChange(SETTLE)).not.toBeNull()
    expect((await fetchBoard(port)).columns[0]?.tasks[0]?.priority).toBe('high')
  })

  test('A3 task tags edited — MUST update', async () => {
    const { scratch, port, client } = await board()
    await writeFile(
      join(scratch.root, '0-backlog/a-task/index.md'),
      taskMarkdown({ tags: '[docs, web]' }),
    )
    expect(await client.nextChange(SETTLE)).not.toBeNull()
    expect((await fetchBoard(port)).columns[0]?.tasks[0]?.tags).toEqual(['docs', 'web'])
  })

  test('A4 task body edited — MUST update', async () => {
    const { scratch, port, client } = await board()
    await writeFile(
      join(scratch.root, '0-backlog/a-task/index.md'),
      taskMarkdown({ body: 'A different reason.' }),
    )
    expect(await client.nextChange(SETTLE)).not.toBeNull()
    expect((await fetchBoard(port)).columns[0]?.tasks[0]?.body).toContain('A different reason.')
  })

  test('A5 task folder moved between columns — MUST update', async () => {
    const { scratch, port, client } = await board()
    await rename(join(scratch.root, '0-backlog/a-task'), join(scratch.root, '1-doing/a-task'))
    expect(await client.nextChange(SETTLE)).not.toBeNull()
    expect(slugsByColumn(await fetchBoard(port))).toMatchObject({
      backlog: [],
      doing: ['a-task'],
    })
  })

  test('A6 task folder created — MUST update', async () => {
    const { scratch, port, client } = await board()
    await addTask(scratch, '0-backlog', 'second', { title: 'Second' })
    expect(await client.nextChange(SETTLE)).not.toBeNull()
    expect(slugsByColumn(await fetchBoard(port))['backlog']).toContain('second')
  })

  test('A7 task folder deleted — MUST update', async () => {
    const { scratch, port, client } = await board()
    await rm(join(scratch.root, '0-backlog/a-task'), { recursive: true })
    expect(await client.nextChange(SETTLE)).not.toBeNull()
    expect(slugsByColumn(await fetchBoard(port))['backlog']).toEqual([])
  })

  test('A8 column index reordered — MUST update', async () => {
    const { scratch, port, client } = await board()
    await addTask(scratch, '0-backlog', 'second', { title: 'Second' })
    await client.nextChange(SETTLE)

    await writeFile(
      join(scratch.root, '0-backlog/index.md'),
      '---\ntype: Index\ntitle: backlog\n---\n\n# backlog\n\n' +
        '- [Second](second/index.md) — med — d\n' +
        '- [A task](a-task/index.md) — med — d\n',
    )
    expect(await client.nextChange(SETTLE)).not.toBeNull()
    expect(slugsByColumn(await fetchBoard(port))['backlog']).toEqual(['second', 'a-task'])
  })

  test('A9 new column folder — MUST update', async () => {
    const { scratch, port, client } = await board()
    await addColumn(scratch, '4-blocked')
    expect(await client.nextChange(SETTLE)).not.toBeNull()
    expect((await fetchBoard(port)).columns.map((c) => c.name)).toContain('blocked')
  })

  test('A10 column folder removed — MUST update', async () => {
    const { scratch, port, client } = await board()
    await rm(join(scratch.root, '2-test'), { recursive: true })
    expect(await client.nextChange(SETTLE)).not.toBeNull()
    expect((await fetchBoard(port)).columns.map((c) => c.name)).not.toContain('test')
  })

  test('A11 board index title edited — MUST update', async () => {
    const { scratch, port, client } = await board()
    await writeFile(
      join(scratch.root, 'index.md'),
      '---\ntype: Index\ntitle: A new name\n---\n\n# A new name\n',
    )
    expect(await client.nextChange(SETTLE)).not.toBeNull()
    expect((await fetchBoard(port)).title).toBe('A new name')
  })

  test.todo('A12 knowledge/ write (depth 4) — SHOULD not update', async () => {
    const { scratch, client } = await board()
    await mkdir(join(scratch.root, '0-backlog/a-task/knowledge'), { recursive: true })
    await writeFile(
      join(scratch.root, '0-backlog/a-task/knowledge/note.md'),
      '---\ntype: Gotcha\ntitle: n\n---\n\n# n\n',
    )
    expect(await client.quietFor(QUIET)).toBe(true)
  })

  test.todo('A13 raw/ write (depth 4) — SHOULD not update', async () => {
    const { scratch, client } = await board()
    await mkdir(join(scratch.root, '0-backlog/a-task/raw'), { recursive: true })
    await writeFile(join(scratch.root, '0-backlog/a-task/raw/blob.bin'), 'bytes')
    expect(await client.quietFor(QUIET)).toBe(true)
  })

  test.todo('A14 log.md appended — SHOULD not update', async () => {
    const { scratch, client } = await board()
    await writeFile(join(scratch.root, 'log.md'), '---\ntype: Log\n---\n\n# log\n\n## entry\n')
    expect(await client.quietFor(QUIET)).toBe(true)
  })

  test.todo('A15 no-op touch — SHOULD not update', async () => {
    const { scratch, client } = await board()
    const now = new Date()
    await utimes(join(scratch.root, '0-backlog/a-task/index.md'), now, now)
    expect(await client.quietFor(QUIET)).toBe(true)
  })

  test('A16 board created after the client attached — MUST update', async () => {
    const scratch = await makeScratch(false)
    const server = startServer(scratch.cwd)
    stops.push(server.stop)
    const client = await attach(server.port)
    clients.push(client)

    await mkdir(join(scratch.root, '0-backlog'), { recursive: true })
    await writeFile(
      join(scratch.root, 'index.md'),
      '---\ntype: Index\ntitle: late\n---\n\n# late\n',
    )
    await addTask(scratch, '0-backlog', 'a-task', { title: 'A task' })

    expect(await client.nextChange(SETTLE)).not.toBeNull()
    expect((await fetchBoard(server.port)).title).toBe('late')
  })

  test('A17 board deleted while attached — MUST report, not hang', async () => {
    const { scratch, port, client } = await board()
    await rm(scratch.root, { recursive: true })
    await client.nextChange(SETTLE)

    expect((await boardStatus(port)).status).toBe(404)
  })
})

describe('B — how the write happened', () => {
  test('B1 direct write — MUST update', async () => {
    const { scratch, client } = await board()
    await writeFile(
      join(scratch.root, '0-backlog/a-task/index.md'),
      taskMarkdown({ title: 'Direct' }),
    )
    expect(await client.nextChange(SETTLE)).not.toBeNull()
  })

  test('B2 temp file in /tmp then rename over the target — MUST update', async () => {
    const { scratch, port, client } = await board()
    // The skill's mandated write path (shared/conventions.md, Atomic writes).
    // The temp file lives outside the watched tree, so what the watcher sees is
    // a rename arriving from nowhere.
    const temp = join(tmpdir(), `backlog-tmp-${Date.now()}`)
    await writeFile(temp, taskMarkdown({ title: 'Atomic' }))
    await rename(temp, join(scratch.root, '0-backlog/a-task/index.md'))

    expect(await client.nextChange(SETTLE)).not.toBeNull()
    expect((await fetchBoard(port)).columns[0]?.tasks[0]?.title).toBe('Atomic')
  })

  test('B3 temp file beside the target then rename — MUST update', async () => {
    const { scratch, port, client } = await board()
    const dir = join(scratch.root, '0-backlog/a-task')
    await writeFile(join(dir, 'index.md.tmp'), taskMarkdown({ title: 'Editor' }))
    await rename(join(dir, 'index.md.tmp'), join(dir, 'index.md'))

    expect(await client.nextChange(SETTLE)).not.toBeNull()
    expect((await fetchBoard(port)).columns[0]?.tasks[0]?.title).toBe('Editor')
  })

  test('B4 git mv on a tracked board — MUST update', async () => {
    const { scratch, port, client } = await board()
    await Bun.$`git init -q .`.cwd(scratch.cwd).quiet()
    await Bun.$`git config user.email t@t`.cwd(scratch.cwd).quiet()
    await Bun.$`git config user.name t`.cwd(scratch.cwd).quiet()
    await Bun.$`git add -A`.cwd(scratch.cwd).quiet()
    await Bun.$`git commit -qm init`.cwd(scratch.cwd).quiet()
    // Drain whatever git's own writes produced before timing the move.
    await client.nextChange(SETTLE)

    await Bun.$`git mv .agent-backlog/0-backlog/a-task .agent-backlog/1-doing/a-task`
      .cwd(scratch.cwd)
      .quiet()

    expect(await client.nextChange(SETTLE)).not.toBeNull()
    expect(slugsByColumn(await fetchBoard(port))['doing']).toEqual(['a-task'])
  })

  test('B5 plain mv on a non-repo board — MUST update', async () => {
    const { scratch, port, client } = await board()
    await rename(join(scratch.root, '0-backlog/a-task'), join(scratch.root, '2-test/a-task'))
    expect(await client.nextChange(SETTLE)).not.toBeNull()
    expect(slugsByColumn(await fetchBoard(port))['test']).toEqual(['a-task'])
  })

  test('B6 many files rewritten at once — MUST update', async () => {
    const { scratch, port, client } = await board()
    await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        addTask(scratch, '0-backlog', `bulk-${index}`, { title: `Bulk ${index}` }),
      ),
    )
    expect(await client.nextChange(SETTLE)).not.toBeNull()
    expect(slugsByColumn(await fetchBoard(port))['backlog']?.length).toBe(21)
  })

  test('B7 a simultaneous burst coalesces into far fewer frames than writes', async () => {
    const { scratch, client } = await board()

    // Twenty files at once, the shape of a `git checkout` or a multi-folder
    // archive. Issued concurrently on purpose: five *sequential* awaits already
    // span more than the 50ms window, so they legitimately produce two frames
    // and would be testing the clock rather than the coalescing.
    await Promise.all(
      Array.from({ length: 20 }, (_, n) =>
        writeFile(join(scratch.root, `0-backlog/a-task/index.md`), taskMarkdown({ title: `B${n}` })),
      ),
    )

    expect(await client.nextChange(SETTLE)).not.toBeNull()
    await Bun.sleep(QUIET)
    // Not exactly one: the debounce measures idle time, not batch boundaries,
    // so a burst that straddles a window is entitled to a second frame. What
    // matters is that twenty writes do not cost twenty re-renders.
    expect(client.received).toBeLessThanOrEqual(3)
  })

  test('B8 sustained writes faster than the debounce — MUST still update', async () => {
    const { scratch, client } = await board()
    const target = join(scratch.root, '0-backlog/a-task/index.md')

    // A write every 15ms for 2s — comfortably inside the 50ms settle window,
    // so every event clears the timer before it can fire. A debounce with no
    // ceiling starves here: it keeps promising to notify and never does.
    //
    // 40ms was the first attempt and it passed, which proved nothing: the write
    // itself takes long enough that the gaps drifted past 50ms and the timer
    // got through. The bug is real but it needs a genuinely tighter loop to
    // show, and a racy repro is worse than none.
    const stopAt = Date.now() + 2_000
    const churn = (async () => {
      let n = 0
      while (Date.now() < stopAt) {
        await writeFile(target, taskMarkdown({ title: `Churn ${n++}` }))
        await Bun.sleep(15)
      }
    })()

    const arrived = await client.nextChange(1_800)
    await churn
    expect(arrived).not.toBeNull()
  })
})

describe('C — transport and liveness', () => {
  test('C1 healthy stream delivers promptly', async () => {
    const { scratch, client } = await board()
    const started = Date.now()
    await writeFile(
      join(scratch.root, '0-backlog/a-task/index.md'),
      taskMarkdown({ title: 'Prompt' }),
    )
    expect(await client.nextChange(SETTLE)).not.toBeNull()
    expect(Date.now() - started).toBeLessThan(600)
  })

  test('C5 two clients both receive the frame', async () => {
    const { scratch, port } = await board()
    const second = await attach(port)
    clients.push(second)
    const first = clients[0]!

    await writeFile(
      join(scratch.root, '0-backlog/a-task/index.md'),
      taskMarkdown({ title: 'Both' }),
    )
    expect(await first.nextChange(SETTLE)).not.toBeNull()
    expect(await second.nextChange(SETTLE)).not.toBeNull()
  })

  test('C6 ten clients all receive the frame', async () => {
    const { scratch, port } = await board()
    const many = await Promise.all(Array.from({ length: 10 }, () => attach(port)))
    clients.push(...many)

    await writeFile(
      join(scratch.root, '0-backlog/a-task/index.md'),
      taskMarkdown({ title: 'Ten' }),
    )
    const results = await Promise.all(many.map((client) => client.nextChange(SETTLE)))
    expect(results.filter((frame) => frame !== null).length).toBe(10)
  })
})
