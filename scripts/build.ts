/**
 * `bun run build [--target <bun-target>] [--all]`: compile the binary.
 *
 * One executable holds the server, the bundled page, and the skill tree
 * (`--asset ./skills/backlog`), so `agent-backlog web` and `agent-backlog plug`
 * need nothing from a checkout. Runs the CLI rather than `Bun.build()`: the JS
 * API has no `asset` option.
 *
 * No `--target` builds for this machine as `build/agent-backlog`. `--all` builds
 * the four release targets as `build/agent-backlog-<target>`.
 */

import { rm } from 'node:fs/promises'

const RELEASE_TARGETS = ['bun-darwin-arm64', 'bun-darwin-x64', 'bun-linux-x64', 'bun-linux-arm64']

const args = process.argv.slice(2)
const targets = args.includes('--all')
  ? RELEASE_TARGETS
  : args.includes('--target')
    ? [args[args.indexOf('--target') + 1] ?? '']
    : [null]

await rm('./build', { recursive: true, force: true })

for (const target of targets) {
  const outfile = target === null ? 'build/agent-backlog' : `build/agent-backlog-${target.replace(/^bun-/, '')}`
  const cmd = [
    'bun', 'build', '--compile', '--minify',
    ...(target === null ? [] : [`--target=${target}`]),
    '--asset', './skills/backlog',
    './packages/agent-backlog-cli/src/main.ts',
    '--outfile', outfile,
  ]
  await run(cmd)
  // The ad-hoc signature Bun writes is refused here (the binary dies with
  // SIGKILL before main), and a fresh one is accepted. Only a Mac can sign, so
  // the formula repeats this at install time for the tarballs CI cross-compiles.
  if (process.platform === 'darwin' && (target === null || target.includes('darwin'))) {
    await run(['codesign', '--force', '--sign', '-', outfile])
  }
}

async function run(cmd: string[]): Promise<void> {
  const proc = Bun.spawn(cmd, { stdout: 'inherit', stderr: 'inherit' })
  if ((await proc.exited) !== 0) process.exit(1)
}
