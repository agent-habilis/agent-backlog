import type { Priority } from 'agent-backlog-core'
import { glyphs } from 'moonspace'
import { t } from 'moonspace-dom'
import type { BadgeTone } from 'moonspace-dom'
import type { ColorRole } from 'moonspace-theme'

/**
 * Darker than the raised surface so the rules between panes stay quiet.
 * Semantic `border` reads too bright against `bg`.
 *
 * Shared rather than declared per component: three copies of a token choice,
 * with the reasoning attached to only one of them, is three chances for someone
 * to "correct" the other two to `t.border`.
 */
export const SURFACE_BORDER = t.bgSunken

/**
 * How a priority looks, in one table.
 *
 * Priority is a colour and a mark, never a size. moonspace has one font size by
 * design — that constraint is the system, not a limitation to route around — so
 * urgency has to be carried by the two channels that remain. The glyph survives
 * a greyscale screen and a colour-blind reader; the colour is what the eye
 * picks out of a full column at a glance. Both, so neither has to be sufficient
 * alone.
 *
 * `color` and `tone` are separate fields because their domains are: `Text`
 * takes a `ColorRole`, `Badge` takes its own six-value `BadgeTone`. Deriving
 * one from the other would need a second mapping that says nothing.
 *
 * A `Record` keyed by `Priority`, so adding a fourth priority to `PRIORITIES`
 * fails to compile here rather than quietly rendering as whatever the fallback
 * branch happened to be — which is what an inline ternary in one component did
 * while the other kept a total map, leaving `med` and `low` distinct on a card
 * and identical in the detail pane.
 */
export const PRIORITY: Record<Priority, { color: ColorRole; tone: BadgeTone; mark: string }> = {
  high: { color: 'danger', tone: 'danger', mark: glyphs.status.ready },
  med: { color: 'fg', tone: 'neutral', mark: glyphs.status.building },
  low: { color: 'fgSubtle', tone: 'neutral', mark: glyphs.bullet },
}
