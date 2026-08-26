import type { Column as ColumnData, Task } from 'agent-backlog-core'
import { Badge, Stack, Text } from 'moonspace-dom'
import { keyed } from 'visage-dom'

import { SURFACE_BORDER } from '../../lib/board-style.ts'
import { Card } from '../card/index.tsx'

/** Wide enough for a title plus a description line without constant wrapping. */
export const COLUMN_WIDTH = 34

export interface ColumnProps {
  column: ColumnData
  selected: string | null
  onSelect: (task: Task) => void
}

export function Column({ column, selected, onSelect }: ColumnProps) {
  return (
    <div
      data-column={column.name}
      style={{
        boxSizing: 'border-box',
        width: `${COLUMN_WIDTH}ch`,
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: `2px solid ${SURFACE_BORDER}`,
      }}
    >
      <div style={{ padding: '0 1ch', borderBottom: `1px solid ${SURFACE_BORDER}` }}>
        <Stack direction="row" gap={1} align="center" justify="between">
          <Text weight="bold" caps>
            {column.name}
          </Text>
          {/*
            The count is always shown, zero included. A column that hides its
            emptiness makes the board look further along than it is.
          */}
          <Badge tone={column.tasks.length > 0 ? 'accent' : 'neutral'} variant="outline">
            {String(column.tasks.length)}
          </Badge>
        </Stack>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, paddingTop: '1px' }}>
        {column.tasks.length === 0 ? (
          <div style={{ padding: '0 1ch' }}>
            <Text color="fgSubtle">(empty)</Text>
          </div>
        ) : (
          keyed(column.tasks, (task) => task.slug, (task) => (
            <Card task={task} selected={task.slug === selected} onSelect={() => onSelect(task)} />
          ))
        )}
      </div>
    </div>
  )
}
