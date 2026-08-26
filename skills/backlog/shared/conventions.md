# Conventions (apply to every backlog subcommand)

**Atomic writes.** Write to a temp file, then rename. A half-written `index.md`
is a task that vanishes from the board.

```bash
cat > /tmp/backlog-tmp-$$ << 'EOF'
<content>
EOF
mv /tmp/backlog-tmp-$$ <target-file>
```

**Read before write.** Always read the file you are about to change. Never
reconstruct one from what you remember of it.

**Git is optional.** A board lives in one of three states, and every subcommand
works in all three. Never require one, never report the absence of one as a
problem:

| State | How it happens | Moves use |
|---|---|---|
| tracked | the normal case — the board is committed with the code | `git mv` |
| untracked or ignored | a fresh board, or `.agent-backlog/` in `.gitignore` | `mv` |
| no repo at all | a plain directory | `mv` |

Only the *history* differs. Tracked, a move is a rename in the diff and
`git log --follow` says when it happened; otherwise the move is just a move. The
board reads identically either way, because the column folder is what carries
the state — not anything git knows.

**Moving.** Guard the collision first, then let git handle it if it can:

```bash
SRC=.agent-backlog/<from>/<slug>
DST=.agent-backlog/<to>/<slug>

[ -e "$DST" ] && { echo "$DST already exists — stopping"; exit 1; }
git mv "$SRC" "$DST" 2>/dev/null || mv "$SRC" "$DST"
```

The guard is what makes the `||` safe. Without it the fallback hides every
reason `git mv` can fail, including the one that matters — a destination that
already exists — and turns a refusal into an overwrite. With it, the only
failures left are "not a repo", "not tracked", and "ignored", and `mv` is the
right answer to all three.

**Log order.** Newest on top — the new entry goes *after* the frontmatter and
the `# log` heading, and *before* the first existing `##`. Use this recipe
rather than reassembling the file with `head`/`tail`, which is how the heading
ends up duplicated or an entry ends up at the bottom:

```bash
ENTRY="Moved: create-readme — 0-backlog → 1-doing"
STAMP="$(date '+%Y-%m-%d %H:%M')"

awk -v stamp="$STAMP" -v entry="$ENTRY" '
  !seen && /^## / { print "## " stamp "\n\n" entry "\n"; seen = 1 }
  { print }
  END { if (!seen) print "\n## " stamp "\n\n" entry }
' .agent-backlog/log.md > /tmp/backlog-tmp-$$
mv /tmp/backlog-tmp-$$ .agent-backlog/log.md
```

The `END` branch is what handles the first entry on a fresh board, where there
is no `##` to insert before.

**Dates are absolute.** `2026-08-25`, from `date +%F`. Never "today". Timestamps
in the log are `date "+%Y-%m-%d %H:%M"`.

**One write per statement.** A subcommand that touches the task, the source
index, the destination index, and the log does four writes, each atomic, in that
order. If one fails, say which ones landed.

**Never delete a task.** `archive` moves it. Deleting is the user's own call,
made with their own hands.

**Never edit another task to make one fit.** If a change implies work on a
second task, say so and stop; do not reach across.
