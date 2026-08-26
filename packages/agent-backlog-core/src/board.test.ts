import { afterEach, describe, expect, test } from 'bun:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { findBoardRoot, readBoard, reconcile } from './board.ts'
import {
  addColumn as makeColumn,
  addTask as makeTask,
  cleanScratches,
  link,
  makeScratch,
  type Scratch,
} from './testing.ts'

afterEach(cleanScratches)

/*
 * These wrappers take a bare root rather than a `Scratch` because the assertions
 * below only ever need the board path. The shared builders in `testing.ts` take
 * the `Scratch` so the server suite can reach `cwd` too.
 */
let current: Scratch

async function scratchBoard(): Promise<string> {
  current = await makeScratch()
  await writeFile(join(current.root, 'index.md'), '---\ntype: Index\ntitle: demo\n---\n\n# demo\n')
  return current.root
}

const addColumn = (_root: string, dir: string, indexLines: string[] = []) =>
  makeColumn(current, dir, indexLines)

const addTask = (_root: string, dir: string, slug: string, title: string) =>
  makeTask(current, dir, slug, { title, description: 'd', priority: 'low', tags: '[x]' })

describe('findBoardRoot', () => {
  test('walks up to the nearest board', async () => {
    const root = await scratchBoard()
    const nested = join(root, '..', 'src', 'deep')
    await mkdir(nested, { recursive: true })
    expect(await findBoardRoot(nested)).toBe(root)
  })

  test('is null when there is no board above', async () => {
    expect(await findBoardRoot(tmpdir())).toBeNull()
  })
})

describe('readBoard', () => {
  test('discovers numbered folders as columns, in numeric order', async () => {
    const root = await scratchBoard()
    await addColumn(root, '10-late')
    await addColumn(root, '2-test')
    await addColumn(root, '0-backlog')
    await mkdir(join(root, 'archive'), { recursive: true })

    const board = await readBoard(root)
    expect(board.columns.map((column) => column.name)).toEqual(['backlog', 'test', 'late'])
    expect(board.title).toBe('demo')
  })

  test('takes order from the column index', async () => {
    const root = await scratchBoard()
    await addColumn(root, '0-backlog', [link('zebra', 'Zebra'), link('apple', 'Apple')])
    await addTask(root, '0-backlog', 'apple', 'Apple')
    await addTask(root, '0-backlog', 'zebra', 'Zebra')

    const board = await readBoard(root)
    expect(board.columns[0]?.tasks.map((task) => task.slug)).toEqual(['zebra', 'apple'])
  })

  test('a folder the index has not heard of still shows, at the end', async () => {
    const root = await scratchBoard()
    await addColumn(root, '0-backlog', [link('zebra', 'Zebra')])
    await addTask(root, '0-backlog', 'zebra', 'Zebra')
    await addTask(root, '0-backlog', 'hand-made', 'Hand made')

    const board = await readBoard(root)
    expect(board.columns[0]?.tasks.map((task) => task.slug)).toEqual(['zebra', 'hand-made'])
  })

  test('an index line pointing at a deleted folder is dropped', async () => {
    const root = await scratchBoard()
    await addColumn(root, '0-backlog', [link('gone', 'Gone'), link('here', 'Here')])
    await addTask(root, '0-backlog', 'here', 'Here')

    const board = await readBoard(root)
    expect(board.columns[0]?.tasks.map((task) => task.slug)).toEqual(['here'])
  })

  test('a task carries its column and path', async () => {
    const root = await scratchBoard()
    await addColumn(root, '1-doing', [link('create-readme', 'Create README')])
    await addTask(root, '1-doing', 'create-readme', 'Create README')

    const task = (await readBoard(root)).columns[0]?.tasks[0]
    expect(task?.column).toBe('doing')
    expect(task?.path).toBe('1-doing/create-readme')
    expect(task?.tags).toEqual(['x'])
  })

  test('a board with no title reads as null, not as a substituted name', async () => {
    const root = await scratchBoard()
    await writeFile(join(root, 'index.md'), '---\ntype: Index\n---\n\n# untitled\n')
    expect((await readBoard(root)).title).toBeNull()
  })

  test('a folder with no index.md is not a task', async () => {
    const root = await scratchBoard()
    await addColumn(root, '0-backlog')
    await mkdir(join(root, '0-backlog', 'raw'), { recursive: true })

    expect((await readBoard(root)).columns[0]?.tasks).toEqual([])
  })
})

describe('reconcile', () => {
  test('keeps indexed order, appends the rest sorted', () => {
    expect(reconcile(['b', 'a'], new Set(['a', 'b', 'c']))).toEqual(['b', 'a', 'c'])
  })

  test('drops a duplicate index line', () => {
    expect(reconcile(['a', 'a'], new Set(['a']))).toEqual(['a'])
  })
})
