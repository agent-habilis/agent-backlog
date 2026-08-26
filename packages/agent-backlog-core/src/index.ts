/**
 * agent-backlog-core — reads a `.agent-backlog/` board from disk.
 *
 * Read-only on purpose. The `/backlog` skill is the board's only writer, so
 * `git mv` and the column-index reconcile exist in exactly one place; a second
 * implementation here is how the two would drift. What this package owns is the
 * *reading* rules — column discovery and the index-vs-disk reconcile — so the
 * web board and the skill agree on what the board says.
 */

/*
 * Only what a consumer outside this package actually imports. The parsing and
 * reconcile internals stay internal — the tests reach them by file path, which
 * is where they belong, and re-exporting them would advertise a surface nothing
 * uses as though it were the package's contract.
 *
 * `src/testing.ts` is the other entry point (`agent-backlog-core/testing`) and
 * is deliberately not re-exported here: it imports `node:fs`, which must never
 * reach the browser bundle.
 */
export { BOARD_DIR, findBoardRoot, readBoard } from './board.ts'
export type { Board, Column, Priority, Task } from './types.ts'
