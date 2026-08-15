// Dashboard layer — the creator's own numbers: `/dashboard` (overview) and
// `/analytics` (follower + engagement trends, top clips, category mix).
//
// This layer is *only* the widgets and the two pages. The application shell
// that used to sit alongside them in `app/components/dashboard/` —
// `AppSidebar`, `DashboardTopBar`, `MobileTabBar`, `SidebarNavItem`,
// `SidebarUserMenu`, `CreateMenu`, `DashboardShell` — was moved to the root
// `app/components/shell/` when this layer was extracted. It is not dashboard
// code: `layouts/dashboard.vue` is used by 30 pages across the whole app,
// `/stream` renders `DashboardShell`, and studio's own sidebar reuses
// `SidebarNavItem` / `SidebarUserMenu`. Leaving it here would have made the
// home feed, watch, discovery and studio all depend on this layer.
//
// `layouts/dashboard.vue` stays at the root for the same reason.
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
  $meta: {
    name: 'dashboard'
  },
  // Required — see ADR-032. Without it `dashboard/TrendChart.vue` registers
  // as `<DashboardTrendChart>` and the pages break at render, not at build.
  components: [{ path: join(currentDir, 'app/components'), pathPrefix: false }]
})
