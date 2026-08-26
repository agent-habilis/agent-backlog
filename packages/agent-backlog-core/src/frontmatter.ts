/**
 * The board's frontmatter subset, parsed by hand.
 *
 * A task carries six scalars and one flow sequence of plain words. A YAML
 * dependency for that is a dependency the web bundle would ship, so the reader
 * takes the subset it defines and treats anything outside it as absent — the
 * `/backlog lint` subskill is what reports a malformed field, not this.
 *
 * A file *has* frontmatter only when line 1 is `---`, a closing `---` follows,
 * and the block holds a `type:` key. That last condition is what keeps a
 * document opening on a horizontal rule from being read as frontmatter.
 */

export interface Frontmatter {
  fields: Map<string, string>
  body: string
}

const DELIMITER = '---'

export function parseFrontmatter(source: string): Frontmatter | null {
  const lines = source.split('\n')
  if (lines[0]?.trim() !== DELIMITER) return null

  const close = lines.indexOf(DELIMITER, 1)
  if (close === -1) return null

  const fields = new Map<string, string>()
  for (const line of lines.slice(1, close)) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    if (!key || key.startsWith('#')) continue
    fields.set(key, stripComment(line.slice(colon + 1).trim()))
  }

  if (!fields.has('type')) return null
  return { fields, body: lines.slice(close + 1).join('\n').replace(/^\n+/, '') }
}

/**
 * A trailing `# …` on a scalar. Only after whitespace, so a value that is
 * itself a fragment (`#done`, a URL anchor) keeps its hash.
 */
function stripComment(value: string): string {
  if (value.startsWith('"') || value.startsWith("'")) return unquote(value)
  return value.replace(/\s+#.*$/, '').trim()
}

function unquote(value: string): string {
  const quote = value[0]
  if (quote !== '"' && quote !== "'") return value
  const end = value.indexOf(quote, 1)
  return end === -1 ? value.slice(1) : value.slice(1, end)
}

/** A flow sequence of plain words: `[docs, onboarding]`. */
export function parseList(value: string | undefined): string[] {
  if (!value) return []
  const inner = value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value
  return inner
    .split(',')
    .map((item) => unquote(item.trim()))
    .filter((item) => item.length > 0)
}
