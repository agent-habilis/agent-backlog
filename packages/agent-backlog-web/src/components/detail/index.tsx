import { BOARD_DIR, type Task } from 'agent-backlog-core'
import { glyphs } from 'moonspace'
import { Badge, Divider, Stack, Text, t } from 'moonspace-dom'

import { PRIORITY, SURFACE_BORDER } from '../../lib/board-style.ts'

/** Wide enough for the 80-column measure a task body is written against. */
export const DETAIL_WIDTH = 62

export interface DetailProps {
  task: Task | null
}

/**
 * Nothing selected, nothing rendered.
 *
 * An empty pane holding "select a task" would cost 62 columns to say something
 * the board says better by having cards in it. Collapsing gives that width back
 * to the columns, which is what the page is for — and the pane arriving on the
 * first click is its own affordance.
 */
export function Detail({ task }: DetailProps) {
  if (!task) return null
  return (
    <div
      class="selectable"
      style={{
        boxSizing: 'border-box',
        width: `${DETAIL_WIDTH}ch`,
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '0 2ch',
        background: t.bg,
        borderLeft: `2px solid ${SURFACE_BORDER}`,
      }}
    >
      <Body task={task} />
    </div>
  )
}

function Body({ task }: { task: Task }) {
  return (
    <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
      <Stack direction="column" gap={1}>
        <Text weight="bold">{task.title}</Text>

        <Stack direction="row" gap={1} wrap>
          <Badge tone={PRIORITY[task.priority].tone} variant="outline">
            {task.priority}
          </Badge>
          <Badge tone="info" variant="outline">
            {task.column}
          </Badge>
          {task.tags.map((tag) => (
            <Badge tone="neutral" variant="outline">
              {tag}
            </Badge>
          ))}
        </Stack>

        {/*
          The path, verbatim and selectable. It is what turns a card back into a
          file you can open, and it is the whole point of storing a board this
          way — so it belongs on screen, not behind a tooltip.
        */}
        <Text color="fgSubtle">{`${BOARD_DIR}/${task.path}/index.md`}</Text>

        {task.created || task.timestamp ? (
          <Text color="fgSubtle">
            {[
              task.created && `created ${task.created}`,
              task.timestamp && `updated ${task.timestamp}`,
            ]
              .filter(Boolean)
              .join(`  ${glyphs.bullet}  `)}
          </Text>
        ) : null}

        <Divider />

        {renderBody(task.body)}
      </Stack>
    </div>
  )
}

export type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'todo'; done: boolean; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'para'; text: string }

const HEADING = /^#{1,6}\s+(.*)$/
const TODO = /^[-*]\s+\[([ xX])\]\s+(.*)$/
const BULLET = /^[-*]\s+(.*)$/

/**
 * The task body as blocks: `##` headings, `- [ ]` checkboxes, bullets, and
 * paragraphs.
 *
 * Not a markdown parser. A task is written by the skill against a known shape,
 * and pulling in a parser to re-derive that shape would ship a dependency for
 * syntax this board never produces. Anything unrecognised falls through as a
 * paragraph, which is what an unrecognised line should look like anyway.
 *
 * Consecutive prose lines join into one paragraph. A task body is hard-wrapped
 * near 80 columns for the file, and rendering each source line as its own
 * element would freeze that wrap into the layout — the pane is a different
 * width, so the text has to reflow to it. A bullet is the exception: its
 * continuation lines are its own, and joining two adjacent bullets would merge
 * two separate points into one.
 */
export function toBlocks(body: string): Block[] {
  const blocks: Block[] = []

  for (const line of body.split('\n')) {
    const trimmed = line.trim()

    if (trimmed === '') {
      blocks.push({ kind: 'para', text: '' })
      continue
    }

    const heading = HEADING.exec(trimmed)
    if (heading) {
      // A `#` title repeats the name already at the top of this pane.
      if (!trimmed.startsWith('# ')) blocks.push({ kind: 'heading', text: heading[1] ?? '' })
      continue
    }

    const todo = TODO.exec(trimmed)
    if (todo) {
      blocks.push({ kind: 'todo', done: todo[1] !== ' ', text: todo[2] ?? '' })
      continue
    }

    const bullet = BULLET.exec(trimmed)
    if (bullet) {
      blocks.push({ kind: 'bullet', text: bullet[1] ?? '' })
      continue
    }

    const previous = blocks[blocks.length - 1]
    if (previous?.kind === 'para' && previous.text !== '') {
      previous.text = `${previous.text} ${trimmed}`
    } else {
      blocks.push({ kind: 'para', text: trimmed })
    }
  }

  // One rule: a blank following a blank — or following nothing — is dropped.
  // `isBlank(undefined)` being true is what makes the second half of that work,
  // so a leading blank is already gone by the time this returns and only the
  // trailing one (from the body's final newline) is left to remove.
  const collapsed = blocks.filter((block, index, all) => !(isBlank(block) && isBlank(all[index - 1])))
  if (isBlank(collapsed.at(-1))) collapsed.pop()
  return collapsed
}

const isBlank = (block: Block | undefined): boolean =>
  block === undefined || (block.kind === 'para' && block.text === '')

function renderBody(body: string) {
  return toBlocks(body).map((block) => {
    switch (block.kind) {
      case 'heading':
        return (
          <Text weight="bold" caps>
            {block.text}
          </Text>
        )
      case 'todo':
        // `[x]` and `[ ]` literally, not a glyph pair. moonspace's checkbox
        // marks are drawn to sit inside a bordered control, and there is none
        // here — and the brackets are what the file on disk says, which is the
        // thing this pane is a view of.
        return (
          <Stack direction="row" gap={1} align="start">
            <Text color={block.done ? 'success' : 'fgSubtle'}>
              {block.done ? `[${glyphs.checkbox.on}]` : '[ ]'}
            </Text>
            <Text color={block.done ? 'fgMuted' : 'fg'}>{block.text}</Text>
          </Stack>
        )
      case 'bullet':
        return (
          <Stack direction="row" gap={1} align="start">
            <Text color="fgSubtle">{glyphs.bullet}</Text>
            <Text>{block.text}</Text>
          </Stack>
        )
      case 'para':
        return block.text === '' ? <div style={{ height: '0.5em' }} /> : <Text>{block.text}</Text>
    }
  })
}
