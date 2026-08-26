import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

import { parseFrontmatter } from './frontmatter.ts'
import { parseTask } from './task.ts'
import type { Board, Column, Task } from './types.ts'

export const BOARD_DIR = '.agent-backlog'

/** `1-doing` is a column; `archive` is not. The prefix is the whole test. */
const COLUMN_DIR = /^(\d+)-([a-z0-9-]+)$/

/** The slug in `- [Title](create-readme/index.md) — …`. */
const INDEX_LINK = /^\s*[-*]\s*\[[^\]]*\]\(([^)]+)\)/

/** Nearest `.agent-backlog/` at or above `from`. */
export async function findBoardRoot(from: string): Promise<string | null> {
  let current = resolve(from)
  for (;;) {
    const candidate = join(current, BOARD_DIR)
    if (await isDirectory(candidate)) return candidate
    const parent = dirname(current)
    if (parent === current) return null
    current = parent
  }
}

export async function readBoard(root: string): Promise<Board> {
  const entries = await readdir(root, { withFileTypes: true })

  const dirs = entries
    .flatMap((entry) => {
      const match = entry.isDirectory() ? COLUMN_DIR.exec(entry.name) : null
      return match?.[1] && match[2]
        ? [{ dir: entry.name, order: Number(match[1]), name: match[2] }]
        : []
    })
    .sort((a, b) => a.order - b.order || a.dir.localeCompare(b.dir))

  // The title is independent of every column, so it has no business waiting
  // behind them.
  const [title, columns] = await Promise.all([
    readBoardTitle(root),
    Promise.all(
      dirs.map(async (column): Promise<Column> => ({
        ...column,
        tasks: await readColumn(root, column.dir, column.name),
      })),
    ),
  ])

  return { root, title, columns }
}

async function readColumn(root: string, dir: string, name: string): Promise<Task[]> {
  const columnPath = join(root, dir)
  const entries = await readdir(columnPath, { withFileTypes: true })
  const onDisk = new Set(entries.filter((entry) => entry.isDirectory()).map((e) => e.name))

  // Concurrently, like the columns above — `Promise.all` keeps the reconciled
  // order, so the only thing serialising these bought was latency.
  const slugs = reconcile(await readIndexOrder(columnPath), onDisk)
  const tasks = await Promise.all(slugs.map((slug) => readTask(root, dir, name, slug)))
  return tasks.filter((task): task is Task => task !== null)
}

/**
 * The column's order, reconciled against what is actually there.
 *
 * The index holds order and disk holds membership, so neither can be taken
 * alone: an index-only read drops a folder somebody added by hand, and a
 * disk-only read throws away an order somebody arranged on purpose. Indexed
 * slugs keep their positions, and anything the index has not heard of lands at
 * the end in a stable order.
 */
export function reconcile(indexOrder: string[], onDisk: ReadonlySet<string>): string[] {
  // A `Set` does both jobs at once: it dedups the index and, preserving
  // insertion order, *is* the ordered prefix — so the membership test for the
  // remainder needs no separate accumulator.
  const ordered = new Set(indexOrder.filter((slug) => onDisk.has(slug)))
  return [...ordered, ...[...onDisk].filter((slug) => !ordered.has(slug)).sort()]
}

async function readIndexOrder(columnPath: string): Promise<string[]> {
  const source = await readFileOrNull(join(columnPath, 'index.md'))
  if (source === null) return []

  const slugs: string[] = []
  for (const line of source.split('\n')) {
    const target = INDEX_LINK.exec(line)?.[1]
    const slug = target?.split('/')[0]
    if (slug && slug !== '.' && slug !== '..') slugs.push(slug)
  }
  return slugs
}

async function readTask(
  root: string,
  dir: string,
  column: string,
  slug: string,
): Promise<Task | null> {
  const path = `${dir}/${slug}`
  const source = await readFileOrNull(join(root, path, 'index.md'))
  if (source === null) return null

  const fields = parseTask(source)
  return { ...fields, title: fields.title || slug, slug, path, column }
}

/**
 * The board's own title, or `null` when it has none.
 *
 * `null` rather than a default: substituting a name here would erase the fact
 * that there wasn't one, and the only consumer that cares — the web chrome,
 * which hides the subtitle when it merely repeats the app name — would have to
 * guess it back by comparing against the same literal. That guess also gets the
 * true positive wrong, since a board legitimately titled `agent-backlog` is
 * indistinguishable from an untitled one. Display fallbacks belong to the view.
 */
async function readBoardTitle(root: string): Promise<string | null> {
  const source = await readFileOrNull(join(root, 'index.md'))
  const title = source === null ? undefined : parseFrontmatter(source)?.fields.get('title')
  return title || null
}

async function readFileOrNull(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}
