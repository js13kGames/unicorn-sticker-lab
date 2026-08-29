const fs = require('fs')

const LIMIT_BYTES = 13 * 1024
const zipPath = 'build/build.zip'

const { size } = fs.statSync(zipPath)
const pct = ((size / LIMIT_BYTES) * 100).toFixed(1)

console.log(`${zipPath}: ${size} / ${LIMIT_BYTES} bytes (${pct}%)`)

if (size > LIMIT_BYTES) {
  console.error(`Over the js13k limit by ${size - LIMIT_BYTES} bytes!`)
  process.exit(1)
}
