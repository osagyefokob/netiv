import { useQuery } from '@tanstack/react-query'
import useAuthStore from '../store/authStore'
import { inventoryApi, ordersApi } from '../services/axiosInstance'
import { springPageItems } from '../utils/apiNormalize'

export function useLowStockCountQuery() {
  const user = useAuthStore((s) => s.user)
  const warehouseId = user?.roleName === 'WAREHOUSE_STAFF' ? user?.warehouseId : undefined

  return useQuery({
    queryKey: ['nav', 'low-stock-count', warehouseId],
    queryFn: async () => {
      const r = await inventoryApi.get('/stock/low-stock')
      const raw = Array.isArray(r.data) ? r.data : []
      return raw.length
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

/** PENDING + PROCESSING orders (sample up to 500 rows for count). */
export function usePendingPipelineOrdersCountQuery() {
  const user = useAuthStore((s) => s.user)
  const warehouseId = user?.roleName === 'WAREHOUSE_STAFF' ? user?.warehouseId : undefined

  return useQuery({
    queryKey: ['nav', 'pipeline-orders-count', warehouseId],
    queryFn: async () => {
      const r = await ordersApi.get('/', {
        params: { page: 1, limit: 500, warehouseId, sortBy: 'createdAt', order: 'desc' },
      })
      const items = springPageItems(r.data)
      return items.filter((o) => ['PENDING', 'PROCESSING'].includes(o.status)).length
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}
