import { useQuery } from '@tanstack/vue-query'
import type { DashboardOverview } from '#shared/types/dashboard'

/**
 * The dashboard landing payload. Counts move slowly compared to chat, so
 * this stays fresh for a minute rather than refetching on every focus.
 */
export function useDashboardOverview() {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => $fetch<DashboardOverview>('/api/dashboard/overview'),
    staleTime: 60_000
  })
}
