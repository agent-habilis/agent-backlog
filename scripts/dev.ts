/**
 * Dev server: the board page, bundled on the fly, plus the two data endpoints.
 *
 * One route. The app has no second page and no router, so `/` is the whole
 * surface — `/api/board` and `/events` are data, not pages.
 *
 * The HTML is imported with a static specifier because Bun's bundler needs a
 * literal to follow at parse time; a path built at runtime would be served as a
 * file rather than bundled.
 *
 * `PORT` picks the port, so one of these can run per checkout.
 */

import index from '../packages/agent-backlog-web/src/pages/index.html'
import { dataRoutes, PORT } from '../packages/agent-backlog-server/src/serve.ts'

const server = Bun.serve({
  port: PORT,
  development: true,
  routes: {
    '/': index,
    ...dataRoutes(),
  },
})

console.log(`agent-backlog ${server.url}`)
console.log(`board: ${process.cwd()}/.agent-backlog`)
