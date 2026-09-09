import { chromium } from '@playwright/test'
const urls = [
  'https://media.w3.org/2010/05/sintel/trailer.mp4',
  'https://media.w3.org/2010/05/bunny/trailer.mp4',
  'https://media.w3.org/2010/05/bunny/movie.mp4',
  'https://media.w3.org/2010/05/video/movie_300.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4'
]
const b = await chromium.launch({ channel: 'chrome' })
const p = await (await b.newContext()).newPage()
await p.goto('about:blank')
for (const u of urls) {
  const d = await p.evaluate((url) => new Promise((res) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => res(Math.round(v.duration * 10) / 10)
    v.onerror = () => res(null)
    setTimeout(() => res(null), 30000)
    v.src = url
  }), u)
  console.log(String(d === null ? 'FAILED' : d + 's').padStart(8), ' ', u.replace('https://', ''))
}
await b.close()
