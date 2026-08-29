/**
 * The `/backlog` skill tree, as `relative path → bytes`.
 *
 * Two sources, one shape. In the compiled binary the tree is embedded by
 * `bun build --asset ./skills/backlog` and read back from `Bun.embeddedFiles`.
 * Under plain `bun run` (tests, development) `embeddedFiles` is empty, so the
 * same tree is read from the checkout. Either way `plug` sees a map and never
 * learns which one it got.
 */

import { join } from 'node:path'

/** The skill's directory name inside a harness's skills dir. */
export const SKILL_NAME = 'backlog'

/** Where the asset's paths start: `--asset ./skills/backlog` names them `backlog/…`. */
const EMBEDDED_PREFIX = `${SKILL_NAME}/`

const CHECKOUT_SKILL_DIR = join(import.meta.dir, '..', '..', '..', 'skills', SKILL_NAME)

export type SkillFiles = Map<string, Uint8Array>

export async function skillFiles(): Promise<SkillFiles> {
  const embedded = await fromEmbedded()
  return embedded.size > 0 ? embedded : fromCheckout()
}

async function fromEmbedded(): Promise<SkillFiles> {
  const files: SkillFiles = new Map()
  for (const blob of Bun.embeddedFiles) {
    const name = (blob as Blob & { name?: string }).name ?? ''
    if (!name.startsWith(EMBEDDED_PREFIX)) continue
    files.set(name.slice(EMBEDDED_PREFIX.length), new Uint8Array(await blob.arrayBuffer()))
  }
  return files
}

async function fromCheckout(): Promise<SkillFiles> {
  const files: SkillFiles = new Map()
  const glob = new Bun.Glob('**/*')
  for await (const rel of glob.scan({ cwd: CHECKOUT_SKILL_DIR, onlyFiles: true })) {
    files.set(rel, new Uint8Array(await Bun.file(join(CHECKOUT_SKILL_DIR, rel)).arrayBuffer()))
  }
  return files
}
