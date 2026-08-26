# /backlog create <the task, in prose>

Turn what the user just said into a task bundle in the first column.

## Steps

1. Find the board. No board → offer `init` and stop.
2. Read the free content as a description of work. From it derive:
   - **title** — an imperative line: "Create README", not "README".
   - **description** — one line, what it is for. This is what the board shows.
   - **slug** — kebab-case of the title. If the folder exists in *any* column,
     append `-2`, `-3`.
   - **priority** — `med` unless the user's words say otherwise ("urgent",
     "when there's time").
   - **tags** — kebab-case words from the text, at most three. No tag is better
     than a vague one.
3. **Ask at most three questions, and only when the answer changes the scope.**
   A one-line request that is already clear gets written, not interrogated. If
   the request is too vague to scope at all, say what is missing and ask.
4. Write `<first-column>/<slug>/index.md`:

   ```markdown
   ---
   type: Task
   title: <title>
   description: <one line>
   priority: med
   tags: [<tags>]
   created: <date +%F>
   timestamp: <date +%F>
   ---

   # <title>

   <a paragraph on why this exists — the problem, not a restatement of the
   title. If the user gave a reason, that is the paragraph.>

   ## Scope
   - <what is in>
   - <what is deliberately out, when the user drew a line>

   ## Todo
   - [ ] <the steps, as far as they are known>
   ```

   Drop `## Scope` and `## Todo` when the task is genuinely one line of work.
   An empty heading is worse than a missing one.
5. Append one line to the first column's `index.md`, at the bottom, in the
   format `../shared/layout.md` defines (including its rule for a task with no
   tags).
6. Prepend to the board `log.md`:

   ```markdown
   ## <date "+%Y-%m-%d %H:%M">

   Created: <slug> — <title>
   ```

7. Print the path and the title. One line.

## Rules

- The **first column** by numeric prefix, whatever it is called. Never assume
  `0-backlog`.
- Never write a `status:` field.
- Don't pad the body. A three-line task is a fine task; inventing scope to fill
  a template is how a board fills with fiction.
- Several distinct tasks in one request → write several, and say how many.
