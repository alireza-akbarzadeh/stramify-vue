// Rasterises the hand-authored marks in `app/assets/icons/*.svg` into the
// PNGs the web app manifest and iOS point at.
//
// Run with `npm run icons:pwa` after editing any source SVG. The output in
// `public/icons/` is committed (Nitro serves `public/` verbatim, and the
// manifest has to resolve at request time), so this script is a build-time
// tool, not part of `nuxt build`.
//
// PNG rather than SVG for the manifest icons on purpose: Android's launcher
// and the Chrome install prompt both want raster, and Safari's
// `apple-touch-icon` ignores SVG entirely.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = resolve(root, 'app/assets/icons')
const outDir = resolve(root, 'public/icons')

// Rasterise the source at ~5x the final edge before downsampling. librsvg
// renders at `density` DPI against the SVG's 512px/72dpi intrinsic size, so
// this yields a 2730px intermediate — enough that the play glyph's rounded
// corners survive the reduction to 64px without aliasing.
const DENSITY = 384

/**
 * `flatten` composites onto opaque black-free brand colour instead of keeping
 * alpha. Only the iOS icon needs it (see `pwa-icon-apple.svg`), but it is
 * harmless on the full-bleed maskable too.
 */
const targets = [
  { source: 'pwa-icon.svg', out: 'pwa-64x64.png', size: 64 },
  { source: 'pwa-icon.svg', out: 'pwa-192x192.png', size: 192 },
  { source: 'pwa-icon.svg', out: 'pwa-512x512.png', size: 512 },
  { source: 'pwa-icon-maskable.svg', out: 'maskable-512x512.png', size: 512 },
  { source: 'pwa-icon-apple.svg', out: 'apple-touch-icon-180x180.png', size: 180, flatten: true }
]

async function render({ source, out, size, flatten = false }) {
  const svg = await readFile(resolve(sourceDir, source))

  let pipeline = sharp(svg, { density: DENSITY }).resize(size, size, { fit: 'cover' })
  if (flatten) pipeline = pipeline.flatten({ background: '#ff335f' })

  await writeFile(resolve(outDir, out), await pipeline.png({ compressionLevel: 9 }).toBuffer())
  return `${out} (${size}×${size})`
}

await mkdir(outDir, { recursive: true })
const written = await Promise.all(targets.map(render))
console.log(`Wrote ${written.length} icons to public/icons/:\n  ${written.join('\n  ')}`)
