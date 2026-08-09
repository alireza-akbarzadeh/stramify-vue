import {defineStore} from 'pinia'
import {authClient} from '@/lib/auth-client'

export interface SessionUser {
    name: string
    email: string
    image?: string | null
    emailVerified?: boolean
    twoFactorEnabled?: boolean | null
}

/**
 * Single source of session state for the UI (client state — the authoritative
 * check always happens server-side, see `server/utils/session.ts`).
 *
 * `plugins/auth-session.ts` fills this during SSR; @pinia/nuxt serialises the
 * result into the payload, so the client hydrates with the session already
 * resolved and the header never flashes a signed-out state.
 */
export const useAuthStore = defineStore('auth', () => {
    const session = ref<{ user?: SessionUser } | null>(null)

    const user = computed(() => session.value?.user ?? null)
    const isAuthenticated = computed(() => !!session.value?.user)

    async function refresh() {
        // Cast: the generated type for this catch-all auth route is the generic
        // fetch envelope, not better-auth's session payload.
        const result = (await useRequestFetch()('/api/auth/get-session').catch(() => null)) as
            | { user?: SessionUser }
            | null
        session.value = result?.user ? result : null
    }

    /**
     * Hand-off after any successful client-side sign-in. The SSR plugin only runs
     * on a full page load, so a `navigateTo` straight from a sign-in form would
     * leave this store holding the signed-out session and the header showing the
     * login buttons until a manual refresh — pull the fresh session in first.
     */
    async function completeSignIn(to = '/') {
        await refresh()
        await navigateTo(to)
    }

    async function signOut() {
        await authClient.signOut()
        session.value = null
        await navigateTo('/login')
    }

    return {session, user, isAuthenticated, refresh, completeSignIn, signOut}
})
