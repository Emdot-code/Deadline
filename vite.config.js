import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import demonBridge from './demon-bridge.js'

// GitHub Pages serves the site at https://<user>.github.io/<repo>/.
// In GitHub Actions, GITHUB_REPOSITORY is "<user>/<repo>"; locally it is unset.
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = repo && !repo.endsWith('.github.io') ? `/${repo}/` : '/'

export default defineConfig({
  // demonBridge lets the game ask Claude for the deadline while npm run dev is running
  plugins: [react(), demonBridge()],
  base,
  // the demon's log changes with every decision; that is no reason to reload the page
  server: { watch: { ignored: ['**/demon-log.md'] } },
})
