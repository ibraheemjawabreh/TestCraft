const { hydrate } = require('next/dist/client/app-index.js')

// Keep Next's Flight reader active while the response streams. Attach React
// after the browser has parsed the corresponding server HTML.
exports.hydrate = function hydrateAfterParsing(...args) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => hydrate(...args), { once: true })
    return
  }
  hydrate(...args)
}
