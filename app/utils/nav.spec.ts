// @vitest-environment node
//
// This suite walks `app/pages` on disk and touches no DOM. Under the project
// default (happy-dom) `import.meta.url` is not a file: URL, so the
// `fileURLToPath` below threw at import time and the whole file was collected
// as "0 test" — which is why the dead-link check never caught anything.
import {readdirSync} from 'node:fs'
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
    libraryLinks
} from './nav'

const pagesDir = fileURLToPath(new URL('../pages', import.meta.url))

/** Every static route the file-based router will produce, e.g. `/settings/security`. */
function staticRoutes(dir = pagesDir, prefix = ''): string[] {
    return readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
        if (entry.isDirectory()) return staticRoutes(join(dir, entry.name), `${prefix}/${entry.name}`)
        if (!entry.name.endsWith('.vue') || entry.name.includes('[')) return []
        const name = entry.name.replace(/\.vue$/, '')
        return [name === 'index' ? prefix || '/' : `${prefix}/${name}`]
    })
}

const routes = staticRoutes()

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
    ['accountLinks', accountLinks]
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

describe('isNavLinkActive', () => {
    it('matches Home exactly instead of prefixing every route in the app', () => {
        expect(isNavLinkActive('/', '/')).toBe(true)
        expect(isNavLinkActive('/', '/live')).toBe(false)
    })

    it('treats a child route as active', () => {
        expect(isNavLinkActive('/category', '/category/gaming')).toBe(true)
        expect(isNavLinkActive('/category', '/categories')).toBe(false)
    })
})
