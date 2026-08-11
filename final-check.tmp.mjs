import { chromium } from '@playwright/test'
const browser = await chromium.launch()
for (const muted of [true, false]) {
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, reducedMotion:'reduce' })
  await ctx.addInitScript(m => localStorage.setItem('streamify.shorts.muted.v1', m), String(muted))
  const page = await ctx.newPage()
  await page.goto('http://localhost:3000/shorts?v=short-first-marshmallow', { waitUntil:'networkidle' })
  await page.waitForTimeout(2500)
  const before = await page.evaluate(() => { const v=document.querySelector('media-player video'); return {playing:!v.paused, muted:v.muted, t:+v.currentTime.toFixed(1)} })
  await page.evaluate(() => { window.__s=[]; const el=document.querySelector('.snap-y'); setInterval(()=>window.__s.push(Math.round(el.scrollTop)),16) })
  await page.waitForTimeout(13000)
  const s = await page.evaluate(() => [...new Set(window.__s)])
  console.log(`stored muted=${String(muted).padEnd(5)} start=${JSON.stringify(before)} -> auto-advance ${s.length} frames, ended at ${s.at(-1)} ${s.length>5?'animated ✅':'❌'}`)
  await ctx.close()
}
await browser.close()
