import { expect, test } from '@playwright/test'

/** The recommended grid's cards — each one is a link into `/watch/...`. */
function feedCards(page: import('@playwright/test').Page) {
  return page.locator('#home-feed-panel a[href^="/watch/"]')
}

test('home renders the recommended feed', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Streamify/)

  await expect(feedCards(page).first()).toBeVisible()
  // Every card carries a title and a meta line, not just a thumbnail.
  await expect(feedCards(page).first()).not.toBeEmpty()
})

test('category chips filter the feed', async ({ page }) => {
  await page.goto('/')
  const tablist = page.getByRole('tablist', { name: /filter the feed/i })
  await expect(tablist).toBeVisible()

  const all = page.getByRole('tab', { name: 'All' })
  await expect(all).toHaveAttribute('aria-selected', 'true')

  await expect(feedCards(page).first()).toBeVisible()
  const unfiltered = await feedCards(page).count()

  const gaming = page.getByRole('tab', { name: 'Gaming' })
  await gaming.click()
  await expect(gaming).toHaveAttribute('aria-selected', 'true')
  await expect(all).toHaveAttribute('aria-selected', 'false')

  // A filtered feed is a subset — and it still renders something, or says why not.
  const emptyState = page.getByText(/Nothing in Gaming yet/)
  await expect(feedCards(page).first().or(emptyState)).toBeVisible()
  expect(await feedCards(page).count()).toBeLessThanOrEqual(unfiltered)
})

test('the Live chip narrows the feed to live sessions', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Live' }).click()

  const cards = feedCards(page)
  const emptyState = page.getByText(/Nothing in Live yet/)
  await expect(cards.first().or(emptyState)).toBeVisible()

  // No live session has a duration chip — that's what makes it a live session.
  if (await cards.count()) {
    await expect(page.locator('#home-feed-panel').getByText(/^\d{2}:\d{2}$/)).toHaveCount(0)
  }
})

test('a feed card opens its watch page', async ({ page }) => {
  await page.goto('/')
  const first = feedCards(page).first()
  await expect(first).toBeVisible()

  const href = await first.getAttribute('href')
  await first.click()
  await expect(page).toHaveURL(href!)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('search from the home page reaches the results page', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('combobox', { name: /search videos and channels/i })
  await search.fill('music')
  await search.press('Enter')

  await expect(page).toHaveURL(/\/search\?q=music/)
  await expect(page.getByRole('heading', { name: /Results for/ })).toBeVisible()
})
