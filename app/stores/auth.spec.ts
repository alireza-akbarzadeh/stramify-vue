// @vitest-environment nuxt
import {mockNuxtImport} from '@nuxt/test-utils/runtime'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {useAuthStore} from './auth'

const {getSession, navigate} = vi.hoisted(() => ({
    getSession: vi.fn(),
    navigate: vi.fn()
}))

mockNuxtImport('useRequestFetch', () => () => getSession)
mockNuxtImport('navigateTo', () => navigate)

const user = {name: 'kev', email: 'kev@streamify.test'}

describe('auth store', () => {
    beforeEach(() => {
        getSession.mockReset()
        navigate.mockReset()
        useAuthStore().session = null
    })

    it('treats a session without a user as signed out', async () => {
        getSession.mockResolvedValue(null)
        const auth = useAuthStore()
        await auth.refresh()
        expect(auth.session).toBeNull()
        expect(auth.isAuthenticated).toBe(false)
    })

    it('exposes the user once a session resolves', async () => {
        getSession.mockResolvedValue({user})
        const auth = useAuthStore()
        await auth.refresh()
        expect(auth.isAuthenticated).toBe(true)
        expect(auth.user).toEqual(user)
    })

    // Regression: sign-in used to navigate straight home, leaving the store on
    // its signed-out SSR value — the header kept showing the login buttons until
    // a manual reload. The session must land *before* the redirect.
    it('resolves the session before redirecting after sign-in', async () => {
        getSession.mockResolvedValue({user})
        let authenticatedOnArrival = false
        navigate.mockImplementation(() => {
            authenticatedOnArrival = useAuthStore().isAuthenticated
        })

        await useAuthStore().completeSignIn()

        expect(navigate).toHaveBeenCalledWith('/')
        expect(authenticatedOnArrival).toBe(true)
    })

    it('honours an explicit post-sign-in destination', async () => {
        getSession.mockResolvedValue({user})
        await useAuthStore().completeSignIn('/dashboard')
        expect(navigate).toHaveBeenCalledWith('/dashboard')
    })
})
