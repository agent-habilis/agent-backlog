import { describe, expect, test } from 'bun:test'
import { lstat, mkdir, mkdtemp, readdir, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { plug, targets, unplug } from './plug.ts'
import { skillFiles } from './skills.ts'

async function scratch(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'agent-backlog-plug-'))
}

async function tree(dir: string): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  for await (const rel of new Bun.Glob('**/*').scan({ cwd: dir, onlyFiles: true })) {
    out.set(rel, await Bun.file(join(dir, rel)).text())
  }
  return out
}

describe('plug --path', () => {
  test('writes the skill tree byte for byte', async () => {
    const dir = await scratch()
    await plug({ path: dir })
    const files = await skillFiles()
    const written = await tree(join(dir, 'backlog'))
    expect(written.size).toBe(files.size)
    for (const [rel, bytes] of files) {
      expect(written.get(rel)).toBe(new TextDecoder().decode(bytes))
    }
  })

  test('replaces a symlink with a copy and says so', async () => {
    const dir = await scratch()
    const elsewhere = await scratch()
    await symlink(elsewhere, join(dir, 'backlog'))
    const [report] = await plug({ path: dir })
    expect((await lstat(join(dir, 'backlog'))).isSymbolicLink()).toBe(false)
    expect(report?.line).toContain('replaced a symlink')
    expect(await readdir(elsewhere)).toEqual([])
  })

  test('removes files that are no longer part of the skill', async () => {
    const dir = await scratch()
    await mkdir(join(dir, 'backlog', 'subskills'), { recursive: true })
    await writeFile(join(dir, 'backlog', 'subskills', 'old.md'), 'gone')
    await plug({ path: dir })
    expect(await Bun.file(join(dir, 'backlog', 'subskills', 'old.md')).exists()).toBe(false)
  })
})

describe('unplug --path', () => {
  test('removes only backlog/', async () => {
    const dir = await scratch()
    await writeFile(join(dir, 'other'), 'keep')
    await plug({ path: dir })
    const [report] = await unplug({ path: dir })
    expect(report?.line).toStartWith('Removed')
    expect(await readdir(dir)).toEqual(['other'])
  })

  test('says so when nothing is installed', async () => {
    const dir = await scratch()
    const [report] = await unplug({ path: dir })
    expect(report?.line).toContain('not installed')
  })
})

describe('harness detection', () => {
  test('a harness without its config dir is skipped, never created', async () => {
    const home = await scratch()
    await mkdir(join(home, '.claude'))
    const rows = await targets({ home })
    expect(rows.find((t) => t.label === 'Claude Code')?.detected).toBe(true)
    expect(rows.find((t) => t.label === 'Codex')?.detected).toBe(false)
    const reports = await plug({ home, agent: 'codex' })
    expect(reports[0]?.line).toContain('not detected')
    expect(await readdir(home)).toEqual(['.claude'])
  })

  test('an unknown --agent is an error', async () => {
    await expect(targets({ agent: 'emacs' })).rejects.toThrow('unknown agent')
  })
})
