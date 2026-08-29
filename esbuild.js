const esbuild = require('esbuild')
const { htmlPlugin } = require('@craftamap/esbuild-plugin-html')
const postcss = require('esbuild-postcss')
const fs = require('fs')
const path = require('path')

const templatePath = path.resolve(__dirname, 'src/index.html.js')

function getHtmlTemplate() {
  // clear the module from cache so updates are picked up
  delete require.cache[require.resolve('./src/index.html')]
  return require('./src/index.html').htmlTemplate
}

async function start() {
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

  await ctx.serve({
    servedir: 'dist',
  })

  // Restart when the template file changes. Watches the *directory*, not
  // templatePath itself: fs.watch on a single file stops firing for good
  // after the first rename-based write to that path (confirmed - an
  // editor/tool that writes via write-to-temp-then-rename, which is how
  // this file actually gets edited, replaces the inode fs.watch's
  // descriptor was bound to). A directory watch keeps working across any
  // number of edits since it isn't tied to one file's inode. Reacts to
  // any event type (not just 'change') since a rename-based write shows
  // up as 'rename', not 'change' - filtering only on 'change' would silently
  // reintroduce the same bug this is fixing. Small debounce in case one
  // edit produces more than one fs event.
  let restartTimer
  fs.watch(path.dirname(templatePath), { persistent: true }, (_eventType, filename) => {
    if (filename !== path.basename(templatePath)) return

    clearTimeout(restartTimer)
    restartTimer = setTimeout(() => {
      console.log('template changed, restarting build...')
      ctx.dispose().then(() => start())
    }, 50)
  })
}

start()
