import { chromium } from '@playwright/test'
const urls = [
  ['ad-orbit-audio',      30, 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'],
  ['ad-northwind-cloud',  15, 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4'],
  ['ad-lumen-bumper',      6, 'https://media.w3.org/2010/05/video/movie_300.mp4']
]
const b = await chromium.launch({ channel: 'chrome' })
const p = await (await b.newContext()).newPage()
await p.goto('about:blank')
for (const [id, stored, url] of urls) {
  const real = await p.evaluate((u) => new Promise((res) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => res(Math.round(v.duration * 10) / 10)
    v.onerror = () => res(null)
    setTimeout(() => res(null), 25000)
    v.src = u
  }), url)
  console.log(id.padEnd(22), 'stored:', String(stored).padStart(3), 's | real:', real === null ? 'FAILED' : real + 's')
}
await b.close()
