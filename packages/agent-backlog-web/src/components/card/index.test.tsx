import type { Task } from 'agent-backlog-core'
import { afterEach, expect, test } from 'bun:test'
import { render } from 'visage-dom'

import { Card } from './index.tsx'

const task = (over: Partial<Task> = {}): Task => ({
  slug: 'create-readme',
  path: '0-backlog/create-readme',
  column: 'backlog',
  title: 'Create README',
  description: 'seed the repo docs',
  priority: 'high',
  tags: ['docs'],
  created: '2026-08-25',
  timestamp: '2026-08-25',
  body: '# Create README\n',
  ...over,
})

let host: HTMLElement | null = null

function mount(node: unknown): HTMLElement {
  host = document.createElement('div')
  document.body.append(host)
  render(node as never, host)
  return host
}

afterEach(() => {
  host?.remove()
  host = null
})

/**
 * The element's text with the components' own `<style>` elements dropped.
 *
 * `textContent` alone would return several kilobytes of moonspace CSS, and
 * `innerText` is worse here: happy-dom does not implement `@scope`, so it
 * applies the Badge's `text-transform: uppercase` to the whole subtree and
 * every assertion would be against shouting. What is under test is the DOM
 * text, so read that.
 */
function textOf(el: HTMLElement): string {
  const copy = el.cloneNode(true) as HTMLElement
  for (const style of copy.querySelectorAll('style')) style.remove()
  return copy.textContent ?? ''
}

test('renders the title, description and tags', () => {
  const text = textOf(mount(<Card task={task()} selected={false} onSelect={() => {}} />))
  expect(text).toContain('Create README')
  expect(text).toContain('seed the repo docs')
  expect(text).toContain('docs')
})

test('carries the slug so the board can be addressed from outside', () => {
  const el = mount(<Card task={task()} selected={false} onSelect={() => {}} />)
  expect(el.querySelector('[data-slug]')?.getAttribute('data-slug')).toBe('create-readme')
})

test('aria-pressed is a string, not an empty attribute', () => {
  const off = mount(<Card task={task()} selected={false} onSelect={() => {}} />)
  expect(off.querySelector('[data-slug]')?.getAttribute('aria-pressed')).toBe('false')
  off.remove()

  const on = mount(<Card task={task()} selected onSelect={() => {}} />)
  expect(on.querySelector('[data-slug]')?.getAttribute('aria-pressed')).toBe('true')
})

test('clicking selects', () => {
  let selected = 0
  const el = mount(<Card task={task()} selected={false} onSelect={() => (selected += 1)} />)
  el.querySelector<HTMLElement>('[data-slug]')?.click()
  expect(selected).toBe(1)
})

test('a task with no tags renders no tag badges', () => {
  const el = mount(<Card task={task({ tags: [] })} selected={false} onSelect={() => {}} />)
  // The badge element, not the string "docs" — that also occurs inside the
  // description, so a text assertion would pass for the wrong reason.
  expect(el.querySelectorAll('[data-variant="outline"]').length).toBe(0)
  expect(textOf(el)).toContain('Create README')
})

test('a task with tags renders one badge each', () => {
  const el = mount(
    <Card task={task({ tags: ['docs', 'web'] })} selected={false} onSelect={() => {}} />,
  )
  expect(el.querySelectorAll('[data-variant="outline"]').length).toBe(2)
})
