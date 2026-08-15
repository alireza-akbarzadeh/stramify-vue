// Studio layer — the creator's workspace: upload, video management,
// customization, monetization, comments, playlists and studio settings,
// under their own sidebar shell (`layouts/studio.vue`, which lives here
// because only studio pages use it).
//
// `StudioSidebar` reuses `SidebarNavItem` / `SidebarUserMenu` and
// `layouts/studio.vue` reuses `MobileTabBar` — all three are application
// shell and live at the root in `app/components/shell/`, reached through the
// `@/` alias, which resolves against the root project from inside a layer.
// That direction is fine: studio depends on the shell, the shell knows
// nothing about studio.
//
// `app/utils/{upload,studio-form}.ts` came along because nothing outside
// studio ever imported them.
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
  $meta: {
    name: 'studio'
  },
  // Required — see ADR-032. Without it `studio/StudioTopBar.vue` registers as
  // `<StudioStudioTopBar>` and `studio/videos/StudioVideoRow.vue` as
  // `<StudioVideosStudioVideoRow>`.
  components: [{ path: join(currentDir, 'app/components'), pathPrefix: false }]
})
