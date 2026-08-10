import { chromium } from '@playwright/test'
const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
await page.goto('http://localhost:3000/shorts', { waitUntil: 'networkidle' })
await page.waitForTimeout(6000)
const out = await page.evaluate(() => {
  const v = document.querySelector('media-player video')
  return {
    src: v.currentSrc.split('/').pop(),
    webkitAudioDecodedByteCount: v.webkitAudioDecodedByteCount,
    webkitVideoDecodedByteCount: v.webkitVideoDecodedByteCount,
    audioTracks: v.audioTracks ? v.audioTracks.length : 'unsupported',
    muted: v.muted, volume: v.volume, t: v.currentTime
  }
})
console.log(JSON.stringify(out, null, 2))
await browser.close()
