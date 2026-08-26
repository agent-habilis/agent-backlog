/**
 * `bun run start`: serve a production `dist/` build. Run `bun run build` first.
 *
 * The data endpoints come from `serve.ts`, so a built run answers exactly what
 * `bun run dev` does. What is left here is serving the static bundle and the
 * one check that only means anything in a checkout: `dist/` exists.
 */

import { join } from 'node:path'

import { dataRoutes, PORT } from '../packages/agent-backlog-server/src/serve.ts'

const DIST = join(import.meta.dir, '..', 'dist')

if (!(await Bun.file(join(DIST, 'index.html')).exists())) {
  console.error('dist/ missing — run `bun run build` first')
  process.exit(1)
}

const server = Bun.serve({
  port: PORT,
  routes: dataRoutes(),
  // One page, so anything the route table above did not claim, and that is not
  // an asset on disk, is that page. There are no routes to disambiguate from a
  // missing file.
  async fetch(request) {
    const { pathname } = new URL(request.url)
    const asset = Bun.file(join(DIST, pathname === '/' ? 'index.html' : pathname))
    if (await asset.exists()) return new Response(asset)
    return new Response(Bun.file(join(DIST, 'index.html')))
  },
})

console.log(`agent-backlog ${server.url}`)
console.log(`board: ${process.cwd()}/.agent-backlog`)
