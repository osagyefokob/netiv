import { useQuery } from '@tanstack/react-query'
import useAuthStore from '../store/authStore'
import { ordersApi } from '../services/axiosInstance'
import { springPageTotalElements } from '../utils/apiNormalize'

/**
 * Total order count (from API pagination). Refetches when any `queryKey: ['orders']` query is invalidated (e.g. after create).
 */
export function useOrdersTotalQuery() {
  const user = useAuthStore((s) => s.user)
  const warehouseId = user?.roleName === 'WAREHOUSE_STAFF' ? user?.warehouseId : undefined

  return useQuery({
    queryKey: ['orders', 'count', warehouseId],
    queryFn: async () => {
      const r = await ordersApi.get('/', {
        params: { page: 1, limit: 1, warehouseId },
      })
      const total = springPageTotalElements(r.data)
      if (typeof total === 'number' && total > 0) return total
      return 0
    },
    staleTime: 15_000,
  })
}
