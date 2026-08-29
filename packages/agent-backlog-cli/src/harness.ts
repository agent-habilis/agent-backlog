/**
 * The harnesses `plug` knows about, and what it finds on disk for each.
 *
 * Detection is the presence of the harness's config dir, and `plug` never
 * creates one: writing `~/.codex/skills` on a machine without Codex would be
 * litter. Same table and same rule as agent-gossip.
 */

import { homedir } from 'node:os'
import { join } from 'node:path'

export type Harness = {
  name: string
  label: string
  /** Its presence means the harness is installed. */
  detectDir: string
  skillsDir: string
  /** How to make a running session see a freshly written skill. */
  reload: string
}

export function harnesses(home: string = homedir()): Harness[] {
  return [
    {
      name: 'claude-code',
      label: 'Claude Code',
      detectDir: join(home, '.claude'),
      skillsDir: join(home, '.claude', 'skills'),
      reload: 'run /reload-skills',
    },
    {
      name: 'pi',
      label: 'pi',
      detectDir: join(home, '.pi'),
      skillsDir: join(home, '.pi', 'agent', 'skills'),
      reload: 'restart pi',
    },
    {
      name: 'codex',
      label: 'Codex',
      detectDir: join(home, '.codex'),
      skillsDir: join(home, '.codex', 'skills'),
      reload: 'restart Codex',
    },
    {
      name: 'cursor',
      label: 'Cursor',
      detectDir: join(home, '.cursor'),
      skillsDir: join(home, '.cursor', 'skills'),
      reload: '⌘⇧P → Developer: Reload Window',
    },
    {
      name: 'opencode',
      label: 'opencode',
      detectDir: join(home, '.config', 'opencode'),
      skillsDir: join(home, '.config', 'opencode', 'skills'),
      reload: 'restart opencode',
    },
  ]
}
