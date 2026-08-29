/**
 * `plug` writes the embedded skill into a harness's skills dir; `unplug`
 * removes it. Both touch exactly one path per harness — `<skills dir>/backlog`
 * — and nothing beside it.
 */

import { lstat, mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { type Harness, harnesses } from './harness.ts'
import { SKILL_NAME, type SkillFiles, skillFiles } from './skills.ts'

export type Target = { label: string; skillsDir: string; detected: boolean; reload?: string }

export type Options = { agent?: string; path?: string; home?: string }

/**
 * Which skills dirs a command acts on.
 *
 * `--path` is the escape hatch for a harness not in the table, so it skips
 * detection entirely; `--agent` narrows to one row but keeps the detection
 * rule, because asking for Codex on a machine without Codex is still a no.
 */
export async function targets(options: Options): Promise<Target[]> {
  if (options.path !== undefined) {
    return [{ label: options.path, skillsDir: options.path, detected: true }]
  }
  let rows = harnesses(options.home)
  if (options.agent !== undefined) {
    rows = rows.filter((h) => h.name === options.agent)
    if (rows.length === 0) {
      throw new Error(`unknown agent "${options.agent}"; one of ${harnesses().map((h) => h.name).join(', ')}`)
    }
  }
  return Promise.all(rows.map(async (h) => ({ ...(await asTarget(h)) })))
}

async function asTarget(h: Harness): Promise<Target> {
  return { label: h.label, skillsDir: h.skillsDir, detected: await exists(h.detectDir), reload: h.reload }
}

export type Report = { label: string; line: string }

export async function plug(options: Options): Promise<Report[]> {
  const files = await skillFiles()
  if (files.size === 0) throw new Error('no skill files to install — nothing embedded and no checkout')
  const out: Report[] = []
  for (const t of await targets(options)) {
    if (!t.detected) {
      out.push({ label: t.label, line: `Skipped ${t.label} (not detected)` })
      continue
    }
    const dir = join(t.skillsDir, SKILL_NAME)
    const wasLink = await isSymlink(dir)
    await install(dir, files)
    const note = wasLink ? ' — replaced a symlink with a copy' : ''
    const reload = t.reload === undefined ? '' : `; ${t.reload}`
    out.push({ label: t.label, line: `Installed ${t.label} · ${dir}${note}${reload}` })
  }
  return out
}

export async function unplug(options: Options): Promise<Report[]> {
  const out: Report[] = []
  for (const t of await targets(options)) {
    if (!t.detected) {
      out.push({ label: t.label, line: `Skipped ${t.label} (not detected)` })
      continue
    }
    const dir = join(t.skillsDir, SKILL_NAME)
    if (!(await exists(dir))) {
      out.push({ label: t.label, line: `Skipped ${t.label} (not installed)` })
      continue
    }
    await rm(dir, { recursive: true, force: true })
    out.push({ label: t.label, line: `Removed ${t.label} · ${dir}` })
  }
  return out
}

/**
 * Make `dir` hold exactly `files`. A symlink is unlinked first, so the copy
 * lands where the link was rather than being written through it into whatever
 * checkout it pointed at. Files not in the set are removed, so a renamed
 * subskill does not linger after an upgrade.
 */
async function install(dir: string, files: SkillFiles): Promise<void> {
  if (await isSymlink(dir)) await rm(dir)
  await mkdir(dir, { recursive: true })
  for (const rel of (await treeOf(dir)).keys()) {
    if (!files.has(rel)) await rm(join(dir, rel))
  }
  for (const [rel, bytes] of files) {
    const path = join(dir, rel)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, bytes)
  }
}

async function treeOf(dir: string): Promise<SkillFiles> {
  const files: SkillFiles = new Map()
  const glob = new Bun.Glob('**/*')
  for await (const rel of glob.scan({ cwd: dir, onlyFiles: true })) {
    files.set(rel, new Uint8Array(await Bun.file(join(dir, rel)).arrayBuffer()))
  }
  return files
}

async function exists(path: string): Promise<boolean> {
  try {
    await lstat(path)
    return true
  } catch {
    return false
  }
}

async function isSymlink(path: string): Promise<boolean> {
  try {
    return (await lstat(path)).isSymbolicLink()
  } catch {
    return false
  }
}
