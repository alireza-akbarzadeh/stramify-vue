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

// `favicon.svg` is hand-authored and lives in `public/` because it is served
// verbatim; this script only reads it, to build the `.ico` beside it.
const faviconSource = resolve(root, 'public/favicon.svg')
const faviconOut = resolve(root, 'public/favicon.ico')

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

  let png
  try {
    png = await pipeline.png({ compressionLevel: 9 }).toBuffer()
  } catch (cause) {
    // sharp reports a bad SVG as "Input buffer has corrupt header" with
    // librsvg's parse error appended and no filename — useless when five
    // targets are rendering through one `Promise.all`. Name the file.
    // The likeliest cause by far: a `--` inside an XML comment, which is
    // illegal and rejects the whole document (see `pwa-icon.svg`'s header).
    throw new Error(`Failed to rasterise ${source} → ${out}`, { cause })
  }

  await writeFile(resolve(outDir, out), png)
  return `${out} (${size}×${size})`
}

/**
 * Builds `public/favicon.ico` from `public/favicon.svg`.
 *
 * Written by hand rather than pulling in `png-to-ico`: an ICO is a 6-byte
 * header, one 16-byte directory entry per image, then the images themselves,
 * and since Windows Vista those images may be PNGs rather than raw DIBs —
 * which every browser in use understands. That is the whole format.
 *
 * The `.ico` still matters despite `favicon.svg` existing: it is what a
 * browser with no SVG-favicon support falls back to, and what anything
 * hitting `/favicon.ico` directly (bookmarks, feed readers, crawlers) gets.
 */
async function renderFavicon() {
  const sizes = [16, 32, 48]
  const svg = await readFile(faviconSource)
  const pngs = await Promise.all(
    sizes.map((size) =>
      sharp(svg, { density: DENSITY })
        .resize(size, size, { fit: 'cover' })
        .png({ compressionLevel: 9 })
        .toBuffer()
    )
  )

  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved, always 0
  header.writeUInt16LE(1, 2) // 1 = icon (2 would be cursor)
  header.writeUInt16LE(sizes.length, 4)

  // Image data starts after the header and the full directory.
  let offset = header.length + sizes.length * 16
  const entries = pngs.map((png, i) => {
    const entry = Buffer.alloc(16)
    // Width and height are single bytes, so 256 is encoded as 0. None of our
    // sizes hit that, but the modulo keeps the encoder honest if one is added.
    entry.writeUInt8(sizes[i] % 256, 0)
    entry.writeUInt8(sizes[i] % 256, 1)
    entry.writeUInt8(0, 2) // palette size — 0 for truecolour
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // colour planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
  })

  await writeFile(faviconOut, Buffer.concat([header, ...entries, ...pngs]))
  return `favicon.ico (${sizes.join(', ')})`
}

await mkdir(outDir, { recursive: true })
const written = await Promise.all(targets.map(render))
const favicon = await renderFavicon()

console.log(
  `Wrote ${written.length} icons to public/icons/:\n  ${written.join('\n  ')}\n` +
    `Wrote public/${favicon}`
)
