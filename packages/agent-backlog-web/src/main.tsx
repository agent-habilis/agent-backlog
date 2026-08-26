import { GlobalStyle, MoonspaceTheme } from 'moonspace-dom'
import { component, render } from 'visage-dom'

import './app.css'

import { Board } from './components/board/index.tsx'

const root = document.getElementById('root')
if (!root) throw new Error('#root is missing from index.html')

/**
 * `MoonspaceTheme()` sets the superstylin custom properties and `GlobalStyle()`
 * brings the reset, the grid and the `color-scheme` rules that pick between
 * each token's light and dark half. Both once, at the root — same as
 * agent-share, and nothing about the palette is configured here.
 */
const Root = component(function* () {
  yield () => (
    <>
      {MoonspaceTheme()}
      {GlobalStyle()}
      <Board />
    </>
  )
})

render(<Root />, root)
