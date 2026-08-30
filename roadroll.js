const fs = require('fs')
const path = require('path')

// Runs after esbuild-prod.js: takes the hashed, already-minified JS bundle
// it produced, packs it with Roadroller, and inlines the packed decoder
// directly into build/index.html in place of the <script src> tag - an
// external .js file wastes a whole extra zip entry for a payload this
// small. Doing this as a scripted build step (rather than pasting
// Roadroller's web-tool output into a file by hand) matters because the
// packed output's first line is deliberately dense with raw control/high
// codepoints (see Roadroller's own README) - anything that round-trips it
// through a lossy text medium (a browser text field, clipboard, chat) can
// silently corrupt bytes the decoder depends on. Reading/writing the file
// directly via fs, end to end, never gives it that chance.
const buildDir = path.join(__dirname, 'build')
const jsFile = fs.readdirSync(buildDir).find(f => f.endsWith('.js'))
const jsPath = path.join(buildDir, jsFile)
const htmlPath = path.join(buildDir, 'index.html')

;(async () => {
  // roadroller's own CJS entry (index.cjs) loads its real ESM module via
  // the `esm` package, which crashes outright on current Node - importing
  // its ESM entry point directly sidesteps that shim entirely
  const { Packer } = await import('roadroller')
  const code = fs.readFileSync(jsPath, { encoding: 'utf-8' })

  const packer = new Packer([{ data: code, type: 'js', action: 'eval' }], {})

  await packer.optimize()

  const { firstLine, secondLine } = packer.makeDecoder()
  const packed = firstLine + secondLine

  const html = fs.readFileSync(htmlPath, { encoding: 'utf-8' })
  const scriptTagRe = new RegExp(`<script src="${jsFile}"[^>]*></script>`)

  if (!scriptTagRe.test(html)) throw new Error(`expected <script src="${jsFile}"> in ${htmlPath}`)

  fs.writeFileSync(htmlPath, html.replace(scriptTagRe, `<script>${packed}</script>`), { encoding: 'utf-8' })
  fs.unlinkSync(jsPath)

  console.log(`roadroll: ${code.length}B JS -> ${packed.length}B inline decoder`)
})()
