import type { Board as BoardData, Task } from 'agent-backlog-core'
import { Stack, Text, t } from 'moonspace-dom'
import { component, keyed, signal } from 'visage-dom'

import { boardState, fetchBoard, watchBoard } from '../../lib/board-source.ts'
import { SURFACE_BORDER } from '../../lib/board-style.ts'
import { Column } from '../column/index.tsx'
import { Detail } from '../detail/index.tsx'

export const Board = component(function* () {
  const selected = signal<string | null>(null)

  void fetchBoard()
  const source = watchBoard()
  try {
    yield () => {
      const { board, error, loading } = boardState.value
      const slug = selected.value

      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Chrome board={board} error={error} />
          {board === null ? (
            <Blank message={loading ? 'Reading the board…' : (error ?? 'No board here.')} />
          ) : (
            <Columns
              board={board}
              selected={slug}
              onSelect={(task) => (selected.value = task.slug)}
              onClear={() => (selected.value = null)}
            />
          )}
        </div>
      )
    }
  } finally {
    source.close()
  }
})

const APP_NAME = 'agent-backlog'

function Chrome({ board, error }: { board: BoardData | null; error: string | null }) {
  const total = board?.columns.reduce((sum, column) => sum + column.tasks.length, 0) ?? 0
  /*
   * Show the board's title beside the app name, unless there is nothing to add.
   *
   * Two cases collapse to no subtitle: a board with no title, and one titled
   * `agent-backlog` — printing that beside the app name reads as a stutter, not
   * as two facts, however legitimately the board came by the name.
   *
   * Both tests live *here*, and that is the point. `readBoardTitle` used to
   * substitute `APP_NAME` for a missing title, which made "untitled" and
   * "named after the app" indistinguishable in the shared read layer and forced
   * this view to recover the difference by string comparison. Core now returns
   * what it read or `null`; suppressing a redundant subtitle is a display
   * decision and belongs to the display.
   */
  const subtitle = board?.title !== APP_NAME ? board?.title : null
  return (
    <div style={{ padding: '0 2ch', flexShrink: 0 }}>
      <Stack direction="row" gap={2} align="center" justify="between">
        <Stack direction="row" gap={2} align="center">
          <Text weight="bold">{APP_NAME}</Text>
          {subtitle ? <Text color="fgSubtle">{subtitle}</Text> : null}
        </Stack>
        {/*
          `flex: none` and `nowrap`: the status is the shortest thing in the row
          and the first to be squeezed, so left to shrink it wraps "4 tasks"
          onto two lines and breaks the one-row header.

          The error sits beside the count rather than replacing the board: what
          is on screen is still what the last good read said, and blanking it
          because one poll failed would throw away the true thing to report a
          transient one.
        */}
        <div style={{ flex: 'none', whiteSpace: 'nowrap' }}>
          <Text color={error === null ? 'fgSubtle' : 'danger'}>
            {error === null ? `${total} tasks` : `stale — ${error}`}
          </Text>
        </div>
      </Stack>
    </div>
  )
}

function Blank({ message }: { message: string }) {
  return (
    <div style={{ padding: '0 2ch', flex: 1 }}>
      <Text color="fgSubtle">{message}</Text>
    </div>
  )
}

function Columns({
  board,
  selected,
  onSelect,
  onClear,
}: {
  board: BoardData
  selected: string | null
  onSelect: (task: Task) => void
  onClear: () => void
}) {
  const task = selected === null ? null : findTask(board, selected)
  return (
    // One raised surface for the whole board; columns share it and draw only a
    // vertical rule between panes rather than each boxing itself.
    <div
      style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        alignItems: 'stretch',
        background: t.bg,
        borderTop: `1px solid ${SURFACE_BORDER}`,
      }}
    >
      {/* Clicking past the cards closes the detail pane — the cards stop the
          event, so this only fires on the empty space around them. */}
      <div
        onclick={onClear}
        style={{ display: 'flex', overflowX: 'auto', flex: 1, minWidth: 0 }}
      >
        {keyed(board.columns, (column) => column.dir, (column) => (
          <Column column={column} selected={selected} onSelect={onSelect} />
        ))}
      </div>
      <Detail task={task} />
    </div>
  )
}

function findTask(board: BoardData, slug: string): Task | null {
  for (const column of board.columns) {
    const task = column.tasks.find((candidate) => candidate.slug === slug)
    if (task) return task
  }
  // The selection outlived the task — it moved to a column the board no longer
  // shows, or it was archived. Fall back to nothing selected rather than to a
  // stale copy of a card that is gone.
  return null
}
