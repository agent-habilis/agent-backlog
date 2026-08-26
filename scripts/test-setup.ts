import { GlobalRegistrator } from '@happy-dom/global-registrator'

/**
 * Bun's own `fetch`, kept before happy-dom replaces it.
 *
 * The DOM registrator swaps in a `fetch` built for a simulated browser, and it
 * cannot read a streaming response — an SSE request through it dies with
 * `HPE_UNEXPECTED_CONTENT_LENGTH` before the first frame. That is fine for the
 * component tests, which never open a socket, but the server tests talk to a
 * real one and need the real thing.
 *
 * A global because this file is a *preload*: it runs before any test module, so
 * there is nothing to export to. `bun test` from the repo root applies one
 * bunfig to every package, so the DOM cannot simply be left out for the server
 * package alone.
 */
const nativeFetch = globalThis.fetch

GlobalRegistrator.register()

Object.defineProperty(globalThis, 'nativeFetch', { value: nativeFetch, configurable: true })

/**
 * happy-dom starts on `about:blank`, where the components' style elements have
 * no origin to attach to. Nothing here navigates, so one call at load is
 * enough — agent-share needs a per-test reset only because its router tests
 * follow anchors to another origin.
 */
declare const happyDOM: { setURL(url: string): void }

happyDOM.setURL('http://localhost/')
