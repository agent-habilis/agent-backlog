/**
 * Building a board on disk, for tests.
 *
 * Lives in core rather than beside either suite that uses it because both were
 * growing their own copy, and each grew only what it happened to need — one
 * could write column index order but not vary a task's priority, the other the
 * reverse, so neither suite could test what the other tested. The required
 * shape of a task file (the `type:` key `frontmatter.ts` gates on) now has one
 * definition, so tightening the format cannot leave a stale fixture behind.
 *
 * Exported as `agent-backlog-core/testing`, deliberately not from `index.ts` —
 * this module imports `node:fs`, and the web bundle must never pull it in.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { BOARD_DIR } from './board.ts'

const scratches: string[] = []

/** A throwaway board. `cwd` is where a server would start; `root` is the board. */
export interface Scratch {
  cwd: string
  root: string
}

export async function makeScratch(withBoard = true): Promise<Scratch> {
  const cwd = await mkdtemp(join(tmpdir(), 'agent-backlog-'))
  scratches.push(cwd)
  const root = join(cwd, BOARD_DIR)
  if (withBoard) {
    await mkdir(root, { recursive: true })
    await writeFile(join(root, 'index.md'), frontmatter('Index', { title: 'scratch' }))
    await writeFile(join(root, 'log.md'), frontmatter('Log', {}))
  }
  return { cwd, root }
}

/** Remove every scratch board made so far. Call from `afterEach`. */
export async function cleanScratches(): Promise<void> {
  await Promise.all(scratches.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
}

function frontmatter(type: string, fields: Record<string, string>): string {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`)
  return `---\ntype: ${type}\n${lines.join('\n')}\n---\n\n# ${fields['title'] ?? type}\n`
}

/**
 * A column folder and its index.
 *
 * `indexLines` seeds the order; omit it for a column whose order is whatever
 * disk says.
 */
export async function addColumn(
  scratch: Scratch,
  dir: string,
  indexLines: string[] = [],
): Promise<string> {
  const path = join(scratch.root, dir)
  await mkdir(path, { recursive: true })
  const name = dir.slice(dir.indexOf('-') + 1)
  const head = frontmatter('Index', { title: name })
  await writeFile(join(path, 'index.md'), `${head}\n${indexLines.join('\n')}\n`)
  return path
}

export interface TaskFixture {
  title?: string
  description?: string
  priority?: string
  tags?: string
  body?: string
}

export function taskMarkdown(fields: TaskFixture = {}): string {
  const {
    title = 'A task',
    description = 'a description',
    priority = 'med',
    tags = '[demo]',
    body = 'Why this exists.',
  } = fields
  return [
    '---',
    'type: Task',
    `title: ${title}`,
    `description: ${description}`,
    `priority: ${priority}`,
    `tags: ${tags}`,
    'created: 2026-08-25',
    'timestamp: 2026-08-25',
    '---',
    '',
    `# ${title}`,
    '',
    body,
    '',
  ].join('\n')
}

export async function addTask(
  scratch: Scratch,
  dir: string,
  slug: string,
  fields: TaskFixture = {},
): Promise<string> {
  const path = join(scratch.root, dir, slug)
  await mkdir(path, { recursive: true })
  await writeFile(join(path, 'index.md'), taskMarkdown(fields))
  return path
}

/** One column-index line, in the format `shared/layout.md` defines. */
export function link(slug: string, title: string, rest = 'low — d'): string {
  return `- [${title}](${slug}/index.md) — ${rest}`
}
