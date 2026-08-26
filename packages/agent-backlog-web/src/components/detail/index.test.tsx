import { describe, expect, test } from 'bun:test'

import { toBlocks } from './index.tsx'

const kinds = (body: string) => toBlocks(body).map((block) => block.kind)
const texts = (body: string) => toBlocks(body).map((block) => block.text)

describe('toBlocks', () => {
  test('joins a hard-wrapped paragraph back into one block', () => {
    const body = 'The repo has no front door. Someone arriving\ncannot tell why.\n'
    expect(texts(body).filter(Boolean)).toEqual([
      'The repo has no front door. Someone arriving cannot tell why.',
    ])
  })

  test('a blank line separates two paragraphs', () => {
    const blocks = toBlocks('First para.\n\nSecond para.\n')
    expect(blocks.filter((b) => b.text !== '').map((b) => b.text)).toEqual([
      'First para.',
      'Second para.',
    ])
  })

  test('drops the `#` title, which the pane already shows', () => {
    expect(kinds('# Create README\n')).toEqual([])
  })

  test('keeps `##` and below as headings', () => {
    expect(toBlocks('## Scope\n')).toEqual([{ kind: 'heading', text: 'Scope' }])
  })

  test('reads both checkbox states', () => {
    expect(toBlocks('- [x] done\n- [ ] open\n')).toEqual([
      { kind: 'todo', done: true, text: 'done' },
      { kind: 'todo', done: false, text: 'open' },
    ])
  })

  test('adjacent bullets stay separate points', () => {
    expect(toBlocks('- one\n- two\n')).toEqual([
      { kind: 'bullet', text: 'one' },
      { kind: 'bullet', text: 'two' },
    ])
  })

  test('a bullet does not absorb the paragraph after it', () => {
    expect(kinds('- a bullet\nA new paragraph.\n')).toEqual(['bullet', 'para'])
  })

  test('collapses a run of blank lines to one gap', () => {
    expect(kinds('a\n\n\n\nb\n')).toEqual(['para', 'para', 'para'])
  })

  test('a whole task body parses into the expected shape', () => {
    const body = [
      '# Create README',
      '',
      'The repo has no front door.',
      '',
      '## Scope',
      '- Install section',
      '',
      '## Todo',
      '- [x] Written',
      '- [ ] Reviewed',
      '',
    ].join('\n')
    expect(kinds(body).filter((kind, index) => !(kind === 'para' && texts(body)[index] === '')))
      .toEqual(['para', 'heading', 'bullet', 'heading', 'todo', 'todo'])
  })
})

test('a body that is nothing but its title yields no blocks', () => {
  expect(toBlocks('# Create README\n')).toEqual([])
})

test('an empty body yields no blocks', () => {
  expect(toBlocks('')).toEqual([])
  expect(toBlocks('\n\n\n')).toEqual([])
})
