# /backlog update <which task> <what changed>

Edit a task in place.

## Steps

1. Find the board, resolve the task per `../shared/resolve.md`.
2. **Read the whole file first.** Never reconstruct it from memory.
3. Read the free content for what changed, and apply only that:
   - a new priority → rewrite `priority:`
   - tags added or dropped → rewrite `tags:`
   - a better title or description → rewrite that field, **and the `# heading`**
     when the title changed
   - anything else → it is body text. Add it to `## Scope`, tick or add a
     `## Todo` line, or extend the opening paragraph, whichever it belongs to.
4. Bump `timestamp:` to `date +%F`. `created:` never changes.
5. If `title`, `description`, `priority`, or `tags` changed, rewrite that task's
   line in its column `index.md` — in place, keeping its position.
6. Prepend to the board `log.md`:

   ```markdown
   ## <date "+%Y-%m-%d %H:%M">

   Updated: <slug> — <what changed, one line>
   ```

7. Print what you changed. One line per field.

## Rules

- **A changed title does not rename the folder.** The slug is the identity.
  Say so if the user expected otherwise.
- Never change the column here. That is `move`, and it moves the folder.
- Never write a `status:` field, whatever the user calls it.
- If the body has outgrown one file — past ~150 lines across three or more
  topics — say so and offer to promote it to a bundle
  (`../shared/okf.md`, Progressive disclosure). Do not promote unasked.
- If the update really describes a different piece of work, say so and offer
  `create` instead of stretching this task to cover both.
