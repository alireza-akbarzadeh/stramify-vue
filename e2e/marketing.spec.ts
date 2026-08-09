import { expect, test } from '@playwright/test'

/** The landing page moved off `/` when that became the app's home feed. */
test('marketing page loads and renders the primary CTA', async ({ page }) => {
  await page.goto('/marketing')
  await expect(page).toHaveTitle(/Streamify/)
  await expect(page.getByRole('link', { name: /start streaming/i }).first()).toBeVisible()
})
