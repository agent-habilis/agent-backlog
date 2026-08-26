import { parseFrontmatter, parseList } from './frontmatter.ts'
import { isPriority, type Priority, type TaskFields } from './types.ts'

const DEFAULT_PRIORITY: Priority = 'med'

/**
 * A task's `index.md` as fields, plus the body that followed them.
 *
 * The body comes back with the fields because it is already in hand here — a
 * caller that parsed again to get it would be running the whole scan twice and,
 * worse, would need its own copy of "the body is what follows the frontmatter,
 * or the whole file if there is none". Two statements of that rule in two
 * modules is the drift this package exists to prevent.
 *
 * Nothing here reads a `status:`. The column folder is the only thing that says
 * where a task sits, and a reader that would fall back to a frontmatter field
 * is how a second source of truth gets established.
 *
 * A missing or malformed field is filled from the body rather than refused —
 * a half-written card should still show on the board. `/backlog lint` is what
 * reports it.
 */
export function parseTask(markdown: string): TaskFields & { body: string } {
  const parsed = parseFrontmatter(markdown)
  const fields = parsed?.fields ?? new Map<string, string>()
  const body = parsed?.body ?? markdown

  const priority = fields.get('priority') ?? ''

  return {
    title: fields.get('title') || headingOf(body) || '',
    description: fields.get('description') ?? '',
    priority: isPriority(priority) ? priority : DEFAULT_PRIORITY,
    tags: parseList(fields.get('tags')),
    created: fields.get('created') ?? '',
    timestamp: fields.get('timestamp') ?? '',
    body,
  }
}

function headingOf(body: string): string {
  for (const line of body.split('\n')) {
    const heading = /^#\s+(.*)$/.exec(line.trim())
    if (heading?.[1]) return heading[1].trim()
  }
  return ''
}
