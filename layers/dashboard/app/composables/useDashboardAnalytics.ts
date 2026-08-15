import { useQuery } from '@tanstack/vue-query'
import type { Ref } from 'vue'
import type { AnalyticsRange, DashboardAnalytics } from '#shared/types/dashboard'

/**
 * Channel analytics for the current session's handle. `range` is a ref so
 * switching 7d/30d/90d refetches and caches per range instead of clobbering
 * one cache entry.
 */
export function useDashboardAnalytics(range: Ref<AnalyticsRange>) {
  return useQuery({
    queryKey: ['dashboard', 'analytics', range],
    queryFn: () =>
      $fetch<DashboardAnalytics>('/api/dashboard/analytics', { query: { range: range.value } }),
    staleTime: 60_000
  })
}
