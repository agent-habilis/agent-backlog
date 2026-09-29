import { expect, test } from 'bun:test'

import { skillFiles } from './skills.ts'

// Claude Code reads frontmatter leniently. pi does not, and skips a skill whose
// frontmatter is not strict YAML, so the test parses it the strict way.
test('SKILL.md frontmatter is strict YAML', async () => {
  const bytes = (await skillFiles()).get('SKILL.md')
  const text = new TextDecoder().decode(bytes)
  const frontmatter = text.split(/^---$/m)[1] ?? ''
  const meta = Bun.YAML.parse(frontmatter) as { name: string; description: string }
  expect(meta.name).toBe('backlog')
  expect(meta.description).toContain('its tasks: "what\'s on the board"')
})
