/**
 * Production bundle for the board page.
 *
 * Bun writes chunk URLs relative to the page. There is only one page and it is
 * served from the root, so nothing needs rewriting here — unlike agent-share,
 * whose SPA shell answers routes at other depths.
 */

import { rm } from 'node:fs/promises'

const APP_HTML = './packages/agent-backlog-web/src/pages/index.html'

await rm('./dist', { recursive: true, force: true })

const result = await Bun.build({
  entrypoints: [APP_HTML],
  outdir: './dist',
  minify: true,
  target: 'browser',
})

if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}

for (const output of result.outputs) console.log(`  ${output.path}`)
