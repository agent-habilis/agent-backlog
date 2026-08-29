/**
 * `bun run install-local`: install this checkout through the Homebrew formula,
 * the same path a release takes. Writes a copy of `Formula/agent-backlog.rb`
 * whose `head` points at this checkout and branch into a local tap (Homebrew
 * only installs formulae from a tap), then `brew install --HEAD` builds it from
 * source and `agent-backlog plug` installs the skill.
 *
 * Homebrew fetches a head by `git clone`, so what gets built is the branch's
 * last commit — commit before running this, or the build is of stale code.
 */

import { mkdir } from 'node:fs/promises'
import { delimiter, join, resolve } from 'node:path'

const FORMULA = resolve('Formula', 'agent-backlog.rb')
/** A tap of our own, beside the real one, so the release formula is untouched. */
const TAP = 'agent-habilis/local'

async function run(cmd: string[]): Promise<void> {
  const proc = Bun.spawn(cmd, { stdout: 'inherit', stderr: 'inherit' })
  if ((await proc.exited) !== 0) process.exit(1)
}

async function output(cmd: string[]): Promise<string> {
  return (await Bun.$`${cmd}`.quiet().nothrow().text()).trim()
}

const branch = await output(['git', 'rev-parse', '--abbrev-ref', 'HEAD'])
if ((await output(['git', 'status', '--porcelain'])) !== '') {
  console.log('note: the working tree has uncommitted changes; brew builds the last commit, not them')
}

const formula = await Bun.file(FORMULA).text()
const headLine = /^(\s*)url "https:\/\/github\.com\/agent-habilis\/agent-backlog\.git", branch: "main"$/m
if (!headLine.test(formula)) {
  console.error(`${FORMULA}: head url line not found; update this script`)
  process.exit(1)
}
if (!(await output(['brew', 'tap'])).split('\n').includes(TAP)) {
  await run(['brew', 'tap-new', '--no-git', TAP])
}
const localFormula = join(await output(['brew', '--repository', TAP]), 'Formula', 'agent-backlog.rb')
await mkdir(join(localFormula, '..'), { recursive: true })
await Bun.write(localFormula, formula.replace(headLine, `$1url "file://${resolve('.')}", branch: "${branch}", using: :git`))
console.log(`wrote ${localFormula} (head → this checkout, branch ${branch})`)

if ((await output(['brew', 'list', '--formula', 'agent-backlog'])) !== '') {
  await run(['brew', 'uninstall', '--force', 'agent-backlog'])
}
await run(['brew', 'install', '--HEAD', `${TAP}/agent-backlog`])

const prefix = await output(['brew', '--prefix'])
const binary = join(prefix, 'bin', 'agent-backlog')
await run([binary, 'plug'])

if (!(process.env['PATH'] ?? '').split(delimiter).includes(join(prefix, 'bin'))) {
  console.log(`\n${join(prefix, 'bin')} is not on the PATH. Add it to your shell profile.`)
}
