import type { Task } from 'agent-backlog-core'
import { Badge, Stack, Text, t } from 'moonspace-dom'

import { PRIORITY } from '../../lib/board-style.ts'

export interface CardProps {
  task: Task
  selected: boolean
  onSelect: () => void
}

export function Card({ task, selected, onSelect }: CardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-slug={task.slug}
      // A string, not the boolean: an ARIA state is a string enum, and a
      // `false` serialises to the empty attribute value, which reads as
      // unsupported rather than as "not pressed".
      aria-pressed={selected ? 'true' : 'false'}
      onclick={(event: MouseEvent) => {
        event.stopPropagation()
        onSelect()
      }}
      onkeydown={(event: KeyboardEvent) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onSelect()
      }}
      style={{
        boxSizing: 'border-box',
        width: '100%',
        cursor: 'pointer',
        padding: '0 1ch',
        // Full-bleed selection, like a row in a file browser. `t.bgSelected` is
        // the CSS var rather than a hex — it has to be, or a selected card
        // would not follow the light/dark switch.
        background: selected ? t.bgSelected : 'transparent',
      }}
    >
      <Stack direction="row" gap={1} align="start">
        <Text color={PRIORITY[task.priority].color} title={`priority: ${task.priority}`}>
          {PRIORITY[task.priority].mark}
        </Text>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Text weight="bold">{task.title}</Text>
          {task.description ? (
            <div>
              <Text color="fgMuted">{task.description}</Text>
            </div>
          ) : null}
          {task.tags.length > 0 ? (
            <Stack direction="row" gap={1} wrap>
              {task.tags.map((tag) => (
                <Badge tone="neutral" variant="outline">
                  {tag}
                </Badge>
              ))}
            </Stack>
          ) : null}
        </div>
      </Stack>
    </div>
  )
}
