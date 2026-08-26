# Vendored packages

Five of the members of `packages/` are copies of upstream libraries, not code
written here. Nothing in the directory layout says so — they sit beside
`agent-backlog-web` and `agent-backlog-core` as equals — so this file is the
list, and each one's `package.json` carries a `description` pointing back at it.

They were copied on 2026-08-25 from `agent-share/packages/`, not from the
visage-ui repos directly. That copy already carries the local patches listed in
`agent-share/docs/vendoring.md`, and re-deriving them here would be work with a
worse result:

- `visage-dom`, `visage-style` ← `agent-share/packages/*`
- `moonspace`, `moonspace-theme`, `moonspace-dom` ← `agent-share/packages/*`

Copied with `node_modules`, `dist`, and `.git` excluded.

`visage-router` was **not** copied. The app has exactly one route.

## Patches carried in from agent-share

These are already applied in the copied source. Re-read
`agent-share/docs/vendoring.md` before re-vendoring from upstream — its list is
authoritative, and these are the ones this repo depends on:

1. `visage-style/src/compile/index.ts` — `flex` kept unitless (`flex: 1`, not
   `flex: 1px`).
2. `visage-dom/src/dom/index.ts` — `UNITLESS` property set + `cssNumber()`, so
   numeric inline styles like `opacity`/`flex` don't get `px` appended.
3. `visage-dom/src/jsx-runtime/index.ts` — plain stateless view functions
   usable directly in JSX (`<MyFn/>` without `component()`). The board's
   `Column`, `Card`, and `Detail` are written this way.
4. `moonspace/src/theme/grid.ts` — row height 22.5px (line-height 1.5);
   upstream is 18px.
5. `moonspace-dom` and `moonspace-theme` — files and folders renamed to
   kebab-case. Exported symbols are untouched.

## Workspace wiring

- `moonspace-dom/package.json` declares `visage-dom`/`visage-style` as
  `workspace:*` deps; upstream wires them via tsconfig `paths` to a sibling
  checkout.
- `moonspace-dom/tsconfig.json` repeats `jsx` and `jsxImportSource` instead of
  extending `tsconfig.base.json`. It has to: the bundler reaches this package
  through a `node_modules` symlink, and `extends` is ignored across one. Do not
  normalize it.
