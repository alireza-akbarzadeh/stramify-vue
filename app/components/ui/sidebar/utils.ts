import type {ComputedRef, Ref} from "vue"
import {createContext} from "reka-ui"

export const SIDEBAR_COOKIE_NAME = "sidebar_state"
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
export const SIDEBAR_WIDTH = "16rem"
export const SIDEBAR_WIDTH_MOBILE = "18rem"
/**
 * The collapsed rail. Widened from shadcn's 3rem: once `SidebarContent`'s
 * padding came out of it there were 2rem left, which is narrower than the nav
 * items themselves — icons ended up clipped and off-centre. 4.5rem is the same
 * 72px YouTube gives its mini guide and leaves room for a centred hit target.
 */
export const SIDEBAR_WIDTH_ICON = "4.5rem"
export const SIDEBAR_KEYBOARD_SHORTCUT = "b"

export const [useSidebar, provideSidebarContext] = createContext<{
    state: ComputedRef<"expanded" | "collapsed">
    open: Ref<boolean>
    setOpen: (value: boolean) => void
    isMobile: Ref<boolean>
    openMobile: Ref<boolean>
    setOpenMobile: (value: boolean) => void
    toggleSidebar: () => void
}>("Sidebar")
