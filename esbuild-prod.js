const esbuild = require('esbuild')
const { htmlPlugin } = require('@craftamap/esbuild-plugin-html')
const postcss = require('esbuild-postcss')

const { htmlTemplate } = require('./src/index.html')
;(async () => {
  const ctx = await esbuild.context({
    logLevel: 'info',
    entryPoints: ['src/index.ts'],
    entryNames: '[dir]/[name]-[hash]',
    bundle: true,
    outdir: 'build',
    metafile: true,
    loader: { '.png': 'file' },
    minify: true,
    plugins: [
      postcss(),
      htmlPlugin({
        files: [
          {
            entryPoints: ['src/index.ts'],
            filename: 'index.html',
            htmlTemplate,
          },
        ],
      }),
    ],
  })

  await ctx.rebuild()
  await ctx.dispose()
})()
