import { chromium } from '@playwright/test'
const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
await page.addInitScript(() => {
  window.__ev = []
  const names = ['can-play','canplay','provider-change','provider-setup','loaded-data','loaded-metadata','play','playing','end','ended','volume-change','volumechange','media-mute-request']
  const patch = () => {
    const p = document.querySelector('media-player')
    if (!p || p.__patched) return
    p.__patched = true
    names.forEach(n => p.addEventListener(n, () => window.__ev.push(n + '@' + Math.round(performance.now()))))
  }
  const t = setInterval(patch, 100)
  setTimeout(() => clearInterval(t), 4000)
})
await page.goto('http://localhost:3000/shorts', { waitUntil: 'networkidle' })
await page.waitForTimeout(12000)
const out = await page.evaluate(() => {
  const p = document.querySelector('media-player')
  const v = p.querySelector('video')
  return { events: window.__ev, videoT: +v.currentTime.toFixed(1), paused: v.paused, muted: v.muted }
})
console.log(JSON.stringify(out, null, 2))
await browser.close()
