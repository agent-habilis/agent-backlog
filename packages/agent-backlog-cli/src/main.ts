/**
 * The `agent-backlog` binary. Four verbs, dispatched by hand — an argument
 * library would be most of the code.
 */

import { version } from '../package.json'
import { plug, unplug, type Options } from './plug.ts'
import { serveWeb } from './web.ts'

const USAGE = `agent-backlog ${version}

Usage:
  agent-backlog web                 serve the board in the cwd (PORT, default 4321)
  agent-backlog plug   [options]    install the /backlog skill into each harness
  agent-backlog unplug [options]    remove it
  agent-backlog --version

Options for plug and unplug:
  --agent <name>    one harness: claude-code, pi, codex, cursor, opencode
  --path <dir>      a skills directory, verbatim; skips harness detection
`

function parseOptions(args: string[]): Options {
  const options: Options = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg !== '--agent' && arg !== '--path') throw new Error(`unknown option ${arg}`)
    const value = args[i + 1]
    if (value === undefined) throw new Error(`${arg} needs a value`)
    if (arg === '--agent') options.agent = value
    else options.path = value
    i++
  }
  return options
}

async function main(argv: string[]): Promise<number> {
  const [verb, ...rest] = argv
  switch (verb) {
    case 'web':
      serveWeb()
      return 0
    case 'plug':
    case 'unplug': {
      const reports = await (verb === 'plug' ? plug : unplug)(parseOptions(rest))
      for (const r of reports) console.log(r.line)
      return 0
    }
    case '--version':
    case '-V':
      console.log(`agent-backlog ${version}`)
      return 0
    case undefined:
    case '--help':
    case '-h':
      console.log(USAGE)
      return 0
    default:
      console.error(`unknown command "${verb}"\n\n${USAGE}`)
      return 2
  }
}

try {
  const code = await main(process.argv.slice(2))
  if (code !== 0) process.exit(code)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
