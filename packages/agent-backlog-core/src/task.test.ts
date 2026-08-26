import { describe, expect, test } from 'bun:test'

import { parseFrontmatter, parseList } from './frontmatter.ts'
import { parseTask } from './task.ts'

const CARD = `---
type: Task
title: Create README
description: seed the repo docs
priority: high
tags: [docs, onboarding]
created: 2026-08-25
timestamp: 2026-08-25
---

# Create README

The repo has no front door.

## Todo
- [ ] Write it
`

describe('parseFrontmatter', () => {
  test('reads the block and returns the body after it', () => {
    const parsed = parseFrontmatter(CARD)
    expect(parsed?.fields.get('title')).toBe('Create README')
    expect(parsed?.body.startsWith('# Create README')).toBe(true)
  })

  test('a leading horizontal rule is not frontmatter', () => {
    expect(parseFrontmatter('---\n\n# Title\n')).toBeNull()
  })

  test('a block without a type key is not frontmatter', () => {
    expect(parseFrontmatter('---\ntitle: x\n---\n\nbody\n')).toBeNull()
  })

  test('strips a trailing comment but keeps a hash inside a word', () => {
    const parsed = parseFrontmatter('---\ntype: Task\npriority: high  # loud\ntag: "#docs"\n---\n')
    expect(parsed?.fields.get('priority')).toBe('high')
    expect(parsed?.fields.get('tag')).toBe('#docs')
  })
})

describe('parseList', () => {
  test('reads a flow sequence', () => {
    expect(parseList('[docs, onboarding]')).toEqual(['docs', 'onboarding'])
  })

  test('is empty for a missing or empty value', () => {
    expect(parseList(undefined)).toEqual([])
    expect(parseList('[]')).toEqual([])
  })
})

describe('parseTask', () => {
  test('reads every field', () => {
    const { body, ...fields } = parseTask(CARD)
    expect(fields).toEqual({
      title: 'Create README',
      description: 'seed the repo docs',
      priority: 'high',
      tags: ['docs', 'onboarding'],
      created: '2026-08-25',
      timestamp: '2026-08-25',
    })
    expect(body).toStartWith('# Create README')
  })

  test('returns the body alongside the fields, so no caller parses twice', () => {
    expect(parseTask(CARD).body).toContain('The repo has no front door.')
  })

  test('a file with no frontmatter is all body', () => {
    expect(parseTask('# Bare\n\nJust prose.\n').body).toBe('# Bare\n\nJust prose.\n')
  })

  test('falls back to the first heading when title is missing', () => {
    expect(parseTask('---\ntype: Task\n---\n\n# From the heading\n').title).toBe(
      'From the heading',
    )
  })

  test('an unknown priority reads as med rather than failing the card', () => {
    expect(parseTask('---\ntype: Task\npriority: urgent\n---\n').priority).toBe('med')
  })

  test('ignores a status field — the column folder is the source of truth', () => {
    const fields = parseTask('---\ntype: Task\ntitle: x\nstatus: doing\n---\n')
    expect(fields).not.toHaveProperty('status')
  })
})
