const esbuild = require('esbuild')
const { htmlPlugin } = require('@craftamap/esbuild-plugin-html')
const postcss = require('esbuild-postcss')
const fs = require('fs')
const path = require('path')

const templatePath = path.resolve(__dirname, 'src/index.html.js')
const PORT = 8000

// Reads the template fresh from disk every call, deliberately *not* via
// require() - this file uses `export const`, and Node (22.12+, stable in
// 23) transparently loads a require()'d file with ESM syntax through its
// own ES module loader, which keeps a *separate* cache from
// require.cache/Module._cache with no public API to invalidate it.
// delete require.cache[...] only ever clears the CJS-side entry, which
// isn't even the cache being hit here - the file was silently never
// re-read after the first load, for the life of the process, no matter
// how many times the cache was "cleared." Confirmed directly: two
// require() calls of an `export`-syntax file, with a real file edit and a
// cache delete in between, returned the *same object* both times - this
// is why editing this file kept needing a full dev-server process
// restart to show up, no matter how many edits were made in between.
// Stripping the one `export const NAME =` this file's own convention
// always uses and evaluating via `new Function` sidesteps Node's module
// system - and its caching - entirely.
function getHtmlTemplate() {
  const source = fs.readFileSync(templatePath, 'utf8')
  const script = source.replace(/^export\s+const\s+htmlTemplate\s*=/, 'module.exports.htmlTemplate =')
  const mod = { exports: {} }

  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', script)(mod, mod.exports)

  return mod.exports.htmlTemplate
}

async function createServer() {
  const ctx = await esbuild.context({
    logLevel: 'info',
    entryPoints: ['src/index.ts'],
    bundle: true,
    outdir: 'dist',
    metafile: true,
    loader: { '.png': 'file' },
    write: false,
    plugins: [
      postcss(),
      htmlPlugin({
        files: [
          {
            entryPoints: ['src/index.ts'],
            filename: 'index.html',
            htmlTemplate: getHtmlTemplate(),
          },
        ],
      }),
    ],
  })

  await ctx.watch()
  // pinned rather than left to esbuild's own default-port pick - a
  // restart racing the still-closing old context (see restart() below)
  // could otherwise land the new server on a different port than the one
  // already open in the browser, silently making a live-reloading server
  // look like it stopped updating at all
  await ctx.serve({ servedir: 'dist', port: PORT })

  return ctx
}

// A single, long-lived watcher for the template file - not recreated on
// every restart, so it can never be duplicated/leaked. Restarting used to
// happen *inside* the function this watcher's callback lived in, so every
// restart re-ran that whole function and registered a *second* fs.watch()
// on top of the first, whose own FSWatcher return value was discarded and
// never closed. After enough template edits in one dev session, several
// stale watchers ended up listening on the same file, all firing on the
// next edit and racing to dispose+recreate the server concurrently -
// which could corrupt its listening state (or land it on a different
// port - see PORT above) with nothing printed to explain why, since the
// restart chain had no error handling either. Both fixed here: exactly
// one watcher for the process's whole lifetime, and a guarded, logged
// restart.
let ctx
let restarting = false
let restartTimer

async function restart() {
  if (restarting) return

  restarting = true
  try {
    console.log('template changed, restarting build...')
    await ctx.dispose()
    ctx = await createServer()
  } catch (err) {
    // previously an unhandled rejection here (ctx.dispose().then(() =>
    // start()) had no .catch()) could leave the process listening but
    // silently dead to further rebuilds - now it's visible, and a later
    // edit can still trigger a retry since `restarting` resets below
    console.error('dev server restart failed:', err)
  } finally {
    restarting = false
  }
}

createServer().then((c) => {
  ctx = c
  fs.watch(path.dirname(templatePath), { persistent: true }, (_eventType, filename) => {
    if (filename !== path.basename(templatePath)) return

    clearTimeout(restartTimer)
    restartTimer = setTimeout(restart, 50)
  })
})
