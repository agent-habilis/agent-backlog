export const PRIORITIES = ['high', 'med', 'low'] as const

export type Priority = (typeof PRIORITIES)[number]

export function isPriority(value: string): value is Priority {
  return (PRIORITIES as readonly string[]).includes(value)
}

/** The frontmatter half of a task, before the folder says where it lives. */
export interface TaskFields {
  title: string
  description: string
  priority: Priority
  tags: string[]
  created: string
  timestamp: string
}

export interface Task extends TaskFields {
  /** Folder name. The identity — it survives a move and a retitle. */
  slug: string
  /** Path from the board root, e.g. `1-doing/create-readme`. */
  path: string
  /** Column name without its numeric prefix, e.g. `doing`. */
  column: string
  /** Markdown after the frontmatter block. */
  body: string
}

export interface Column {
  /** The numeric prefix, which is also the left-to-right board order. */
  order: number
  /** The name after the prefix, e.g. `doing`. */
  name: string
  /** Folder name as it is on disk, e.g. `1-doing`. */
  dir: string
  tasks: Task[]
}

export interface Board {
  /** Absolute path to `.agent-backlog/`. */
  root: string
  /** The board's own title, or `null` when its `index.md` gives none. */
  title: string | null
  columns: Column[]
}
