# Resolving what the user named

Every subcommand that acts on something takes it in prose, not as an argument.
This is how those words become a task and a column. It lives here rather than in
each subskill because a resolution rule that two subskills state differently is
a rule the dispatcher no longer guarantees.

## Which task

1. **Exact folder name**, in any column → that one.
2. **Substring** of a slug, then of a title, across **every column** — a task
   the user names is often not in the column they think.
3. **Word overlap**, when nothing above matched. Split what they wrote into
   words, drop the destination (below) and the filler (`to`, `the`, `in`, `a`),
   and score each task by how many of its slug/title words a query word matches
   — exactly, as a prefix, or within one character. Take it only when **exactly
   one** task scores highest, and say which one you took.
4. **Otherwise stop.** No match, or a tie: print the board and ask.

**Never pick for the user when two tasks are equally good.** A wrong `show` is
free; a wrong `move` or `archive` is not, and they share this ladder.

Step 3 exists because the words people use are approximate — `rendere markdown
list` is meant to be `render-markdown-links`, and a resolver that only does
substrings refuses it while a human reads it instantly. It stays safe by
demanding a *unique* winner: a query matching two tasks stops, exactly as a
query matching none does.

## Which column

Accept any of the forms a person actually types, checked against the columns
discovered on disk (`layout.md`) — never a hardcoded list:

| They write | Means |
|---|---|
| `doing` | the column named `doing` |
| `1-doing` | the same, by folder name |
| `1` | the same, by numeric prefix |
| `done`, `start`, `test` | the column of that name, when one exists |

No such column → print the column names and stop. **Never create one** to
satisfy a move.

## Telling the two apart

`move` and `archive` read a task *and* a destination out of one string.

1. **Quoted spans win.** `move "flaky test" to "test"` → task `flaky test`,
   destination `test`. When the user quotes, they have already done the
   splitting; honour it.
2. **Otherwise strip a trailing destination** — a `to <column>` or a bare
   column name at the end that matches a discovered column. What remains is the
   task query.

Do this before matching, or a word can play both roles: in `move flaky test to
test`, the word `test` is both the destination and half the task's name.
