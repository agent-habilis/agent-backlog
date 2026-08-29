/**
 * `agent-backlog web`: the board page plus the two data endpoints.
 *
 * `scripts/dev.ts` minus `development: true`. The HTML import is a static
 * specifier so the bundler follows it; in the compiled binary the page and its
 * chunks are embedded, so there is no `dist/` to find at runtime.
 */

import index from 'agent-backlog-web/src/pages/index.html'
import { dataRoutes, PORT } from 'agent-backlog-server'

export function serveWeb(): void {
  const server = Bun.serve({
    port: PORT,
    routes: {
      '/': index,
      ...dataRoutes(),
    },
  })
  console.log(`agent-backlog ${server.url}`)
  console.log(`board: ${process.cwd()}/.agent-backlog`)
}
