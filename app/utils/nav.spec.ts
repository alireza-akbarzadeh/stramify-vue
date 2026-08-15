// @vitest-environment node
//
// This suite walks `app/pages` on disk and touches no DOM. Under the project
// default (happy-dom) `import.meta.url` is not a file: URL, so the
// `fileURLToPath` below threw at import time and the whole file was collected
// as "0 test" — which is why the dead-link check never caught anything.
import {existsSync, readdirSync} from 'node:fs'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'
import type {NavLink} from './nav'
import {
    accountLinks,
    creatorLinks,
    discoverLinks,
    exploreLinks,
    headerLinks,
    isNavLinkActive,
    libraryLinks,
    mobileNavLinks,
    studioLinks,
    studioManageLinks,
    studioMobileLinks,
    studioSettingsLink
} from './nav'

const layersDir = fileURLToPath(new URL('../../layers', import.meta.url))

/**
 * Every directory the file-based router scans. Since ADR-032 that is the root
 * `app/pages` *plus* one per domain layer (`layers/<name>/app/pages`) — auth,
 * dashboard, studio and marketing pages all live outside `app/` now. Scanning
 * only the root would make this suite report a live page as a dead link, so
 * the layer dirs are discovered rather than listed: a new layer is covered the
 * moment it exists.
 */
function pageDirs(): string[] {
    const dirs = [fileURLToPath(new URL('../pages', import.meta.url))]
    for (const entry of readdirSync(layersDir, {withFileTypes: true})) {
        if (!entry.isDirectory()) continue
        const dir = join(layersDir, entry.name, 'app', 'pages')
        if (existsSync(dir)) dirs.push(dir)
    }
    return dirs
}

/** Every static route the file-based router will produce, e.g. `/settings/security`. */
function staticRoutes(dir: string, prefix = ''): string[] {
    return readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
        if (entry.isDirectory()) return staticRoutes(join(dir, entry.name), `${prefix}/${entry.name}`)
        if (!entry.name.endsWith('.vue') || entry.name.includes('[')) return []
        const name = entry.name.replace(/\.vue$/, '')
        return [name === 'index' ? prefix || '/' : `${prefix}/${name}`]
    })
}

const routes = pageDirs().flatMap((dir) => staticRoutes(dir))

/**
 * Every exported group belongs here. `exploreLinks` was missing from this list
 * and quietly accumulated six links to pages that didn't exist — a group that
 * isn't in this array is a group the dead-link check below can't protect.
 */
const groups: Array<[string, NavLink[]]> = [
    ['discoverLinks', discoverLinks],
    ['exploreLinks', exploreLinks],
    ['libraryLinks', libraryLinks],
    ['creatorLinks', creatorLinks],
    ['headerLinks', headerLinks],
    ['accountLinks', accountLinks],
    ['mobileNavLinks', mobileNavLinks],
    ['studioLinks', studioLinks],
    ['studioManageLinks', studioManageLinks],
    ['studioSettingsLink', [studioSettingsLink]],
    ['studioMobileLinks', studioMobileLinks]
]

describe.each(groups)('%s', (_name, links) => {
    it.each(links)('$label points at a page that exists ($to)', (link) => {
        expect(routes).toContain(link.to)
    })
})

describe('headerLinks', () => {
    it('drops Home — the wordmark next to it is already the link home', () => {
        expect(headerLinks.some((link) => link.to === '/')).toBe(false)
    })

    it('leaves out placeholder routes so the public nav only advertises shipped pages', () => {
        expect(headerLinks.some((link) => link.badge)).toBe(false)
    })
})

describe('mobileNavLinks', () => {
    // The bar is a `grid-cols-4`, and four is also the point past which the tabs
    // stop being comfortably tappable — so the count is part of the contract.
    it('is exactly four tabs', () => {
        expect(mobileNavLinks).toHaveLength(4)
    })

    it('only points at destinations the sidebar also offers', () => {
        const sidebarRoutes = [...discoverLinks, ...libraryLinks, ...exploreLinks].map((link) => link.to)
        for (const link of mobileNavLinks) expect(sidebarRoutes).toContain(link.to)
    })

    it('leaves out placeholder routes', () => {
        expect(mobileNavLinks.some((link) => link.badge)).toBe(false)
    })
})

describe('studioMobileLinks', () => {
    // Same contract as `mobileNavLinks` — the bar both sets render is a
    // `grid-cols-4`, so a fifth tab would silently wrap to a second row.
    it('is exactly four tabs', () => {
        expect(studioMobileLinks).toHaveLength(4)
    })
})

describe('isNavLinkActive', () => {
    it('matches Home exactly instead of prefixing every route in the app', () => {
        expect(isNavLinkActive('/', '/')).toBe(true)
        expect(isNavLinkActive('/', '/live')).toBe(false)
    })

    it('honours `exact` so a section root stays dark on its own children', () => {
        expect(isNavLinkActive('/studio', '/studio', true)).toBe(true)
        expect(isNavLinkActive('/studio', '/studio/videos', true)).toBe(false)
        expect(isNavLinkActive('/studio', '/studio/videos')).toBe(true)
    })

    it('treats a child route as active', () => {
        expect(isNavLinkActive('/category', '/category/gaming')).toBe(true)
        expect(isNavLinkActive('/category', '/categories')).toBe(false)
    })
})
