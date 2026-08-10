import {
    BarChart3,
    Clapperboard,
    Clock3,
    GamepadDirectional,
    Grid2x2,
    Heart,
    History,
    House,
    LayoutDashboard,
    ListVideo,
    MicSignal,
    Music,
    Newspaper,
    Radio,
    ShieldCheck,
    ShieldHalf,
    Store,
    Trophy,
    Tv,
    Video
} from '@lucide/vue'
import type {Component} from 'vue'

export interface NavLink {
    label: string
    to: string
    icon: Component
    /** Short chip on the right — marks a route that's still a placeholder. */
    badge?: string
}

/**
 * The app sidebar's three groups.
 *
 * Every `to` here resolves to a page that exists. A nav is the one place a
 * dead link is unforgivable — it's the map of the product, so an entry for a
 * route that 404s is a claim the app doesn't back up (CLAUDE.md rule 2).
 * New sections get their link added at the same time as their page, not before.
 */
export const discoverLinks: NavLink[] = [
    {label: 'Home', to: '/', icon: House},
    {label: 'Live', to: '/live', icon: Radio},
    {label: 'Clips', to: '/clips', icon: Video},
    {label: 'Shorts', to: '/shorts', icon: Clapperboard, badge: 'Phase 6'},
    {label: 'Categories', to: '/category', icon: Grid2x2},
    {label: 'Channels', to: '/channels', icon: Tv}
]

/**
 * The public header's primary nav. Derived from `discoverLinks` rather than
 * written out again so the two navs can't drift: Home is dropped (the wordmark
 * is already the link home) and so is anything still badged as a placeholder —
 * the marketing chrome shouldn't advertise a route that isn't built yet.
 */
export const headerLinks: NavLink[] = discoverLinks.filter((link) => link.to !== '/' && !link.badge)

export const exploreLinks: NavLink[] = [
    {
        label: 'Shopping',
        to: '/shopping',
        icon: Store
    },
    {
        label: 'Music',
        to: '/music',
        icon: Music
    },
    {
        label: 'Movies & Tv',
        to: '/movies-tv',
        icon: Clapperboard
    },
    {
        label: 'Gaming',
        to: '/gaming',
        icon: GamepadDirectional
    },
    {
        label: 'News',
        to: '/news',
        icon: Newspaper
    },
    {
        label: 'Sports',
        to: '/sports',
        icon: Trophy
    },
    {
        label: 'Podcasts',
        to: '/podcasts',
        icon: MicSignal
    }
]
export const libraryLinks: NavLink[] = [
    {
        label: 'History',
        to: '/history',
        icon: History
    },
    {
        label: 'Playlists',
        to: '/playlists',
        icon: ListVideo
    },
    {
        label: 'Watch later',
        to: '/watch-later',
        icon: Clock3
    },
    {
        label: 'Liked videos',
        to: '/liked',
        icon: Heart
    }
]

/**
 * The mobile bottom tab bar — four destinations, thumb-reachable.
 *
 * Hand-picked rather than sliced off the top of `discoverLinks`: a tab bar is
 * the whole nav on a phone, so it has to span the app (watch → discover →
 * library) instead of just repeating the first four sidebar rows. Four is the
 * cap on purpose — a fifth tab is where these bars stop being tappable. The
 * rest of the nav is still one tap away behind the sidebar sheet.
 */
export const mobileNavLinks: NavLink[] = [
    {label: 'Home', to: '/', icon: House},
    {label: 'Live', to: '/live', icon: Radio},
    {label: 'Clips', to: '/clips', icon: Video},
    {label: 'Library', to: '/playlists', icon: ListVideo}
]

/** Signed-in only — every one of these routes is behind the `auth` middleware. */
export const creatorLinks: NavLink[] = [
    {label: 'Overview', to: '/dashboard', icon: LayoutDashboard},
    {label: 'Go live', to: '/stream', icon: Radio, badge: 'Phase 7'},
    {label: 'Analytics', to: '/analytics', icon: BarChart3}
]

/**
 * Where the account menu can take you — shared by every surface that renders
 * it (`UserMenu` in the header and the app top bar, `SidebarUserMenu` in the
 * sidebar footer) via `useAccountMenu`, so the options can't drift apart.
 */
export const accountLinks: NavLink[] = [
    {label: 'Creator dashboard', to: '/dashboard', icon: LayoutDashboard},
    {label: 'Security', to: '/settings/security', icon: ShieldCheck},
    {label: 'Two-factor auth', to: '/settings/two-factor', icon: ShieldHalf}
]

/**
 * Whether a nav link is the current page. `/` matches exactly — as a prefix it
 * would light up on every route in the app.
 */
export function isNavLinkActive(to: string, path: string): boolean {
    return to === '/' ? path === to : path === to || path.startsWith(`${to}/`)
}
