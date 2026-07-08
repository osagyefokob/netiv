import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import useAuthStore from '../store/authStore'
import { inventoryApi, ordersApi, warehouseApi } from '../services/axiosInstance'
import { springPageItems, springPageTotalElements } from '../utils/apiNormalize'

function countFromListOrPagination(payload) {
  if (Array.isArray(payload)) return payload.length
  const total = springPageTotalElements(payload)
  if (typeof total === 'number' && total > 0) return total
  return springPageItems(payload).length
}

/**
 * Actionable counts from existing services (no separate notifications API).
 * Invalidate with queryClient.invalidateQueries({ queryKey: ['notifications'] }).
 */
export function useOperationalNotifications() {
  const user = useAuthStore((s) => s.user)
  const warehouseId = user?.roleName === 'WAREHOUSE_STAFF' ? user?.warehouseId : undefined
  const enabled = Boolean(user)

  const lowStock = useQuery({
    queryKey: ['notifications', 'low-stock', warehouseId],
    queryFn: async () => {
      const r = await inventoryApi.get('/stock/low-stock', { params: { warehouseId } })
      return countFromListOrPagination(r.data)
    },
    enabled,
    staleTime: 60_000,
    retry: 1,
  })

  const pendingOrders = useQuery({
    queryKey: ['notifications', 'pending-orders', warehouseId],
    queryFn: async () => {
      const r = await ordersApi.get('/', {
        params: {
          warehouseId,
          status: 'PENDING',
          page: 1,
          limit: 1,
        },
      })
      return countFromListOrPagination(r.data)
    },
    enabled,
    staleTime: 60_000,
    retry: 1,
  })

  const pendingReceipts = useQuery({
    queryKey: ['notifications', 'pending-receipts', warehouseId],
    queryFn: async () => {
      const r = await warehouseApi.get('/receipts', {
        params: {
          warehouseId,
          status: 'PENDING',
          page: 1,
          limit: 1,
        },
      })
      return countFromListOrPagination(r.data)
    },
    enabled,
    staleTime: 60_000,
    retry: 1,
  })

  const segments = useMemo(() => {
    const low = lowStock.data ?? 0
    const po = pendingOrders.data ?? 0
    const pr = pendingReceipts.data ?? 0
    return [
      { id: 'low', label: 'Low stock alerts', count: low, to: '/inventory/low-stock' },
      { id: 'orders', label: 'Pending orders', count: po, to: '/orders' },
      { id: 'receipts', label: 'Pending receipts', count: pr, to: '/warehouse/receipts' },
    ]
  }, [lowStock.data, pendingOrders.data, pendingReceipts.data])

  const total = segments.reduce((s, x) => s + x.count, 0)
  const isLoading =
    (enabled && lowStock.isPending) ||
    (enabled && pendingOrders.isPending) ||
    (enabled && pendingReceipts.isPending)

  return { segments, total, isLoading }
}
