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

  // restart when template file changes
  fs.watch(templatePath, { persistent: true }, (eventType) => {
    if (eventType === 'change') {
      console.log('template changed, restarting build...')
      ctx.dispose().then(() => start())
    }
  })
}

start()
