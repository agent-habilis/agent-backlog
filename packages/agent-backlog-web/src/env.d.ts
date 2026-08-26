// `main.tsx` imports `app.css` for its side effect; Bun's bundler handles it,
// tsc needs to be told the module exists.
declare module '*.css'
