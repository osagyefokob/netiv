import { useQuery } from '@tanstack/react-query'
import { Loader2, BarChart2, CheckCircle, Clock } from 'lucide-react'
import { reportingApi, ordersApi } from '../../services/axiosInstance'
import { springPageItems } from '../../utils/apiNormalize'
import useAuthStore from '../../store/authStore'

export default function OrdersReport() {
  const user = useAuthStore((s) => s.user)
  const warehouseId = user?.roleName === 'WAREHOUSE_STAFF' ? user?.warehouseId : undefined

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['reports', 'live-orders', warehouseId],
    queryFn: async () => {
      const r = await ordersApi.get('/', { params: { page: 1, limit: 500, warehouseId } })
      return springPageItems(r.data)
    },
    staleTime: 60_000,
  })

  const { data: summaryData } = useQuery({
    queryKey: ['reports', 'orders-summary'],
    queryFn: async () => {
      const r = await reportingApi.get('/orders/summary')
      return r.data
    },
    staleTime: 60_000,
    retry: false,
  })

  const { data: fulfilData } = useQuery({
    queryKey: ['reports', 'fulfilment'],
    queryFn: async () => {
      const r = await reportingApi.get('/orders/fulfilment-rate')
      return r.data
    },
    staleTime: 60_000,
    retry: false,
  })

  const rows = ordersData ?? []
  const totalRevenue = rows.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0)
  const avgOrderValue = rows.length > 0 ? totalRevenue / rows.length : 0
  const byStatus = rows.reduce((acc, o) => {
    const s = o.status ?? 'UNKNOWN'
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})
  const fulfilledCount = rows.filter((o) => ['DELIVERED', 'COMPLETED'].includes(o.status)).length
  const fulfilmentRate = rows.length > 0 ? (fulfilledCount / rows.length) * 100 : 0

  const loading = ordersLoading
  const err = ordersData === undefined && !ordersLoading

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-dark-base dark:text-white">Orders report</h1>
        <p className="text-sm text-gray-500 mt-0.5">Live order data from orders service</p>
      </div>

      {loading && (
        <div className="app-card p-12 flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-brand-blue" size={28} />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="app-card p-6 space-y-3">
            <h2 className="font-semibold text-dark-base dark:text-white flex items-center gap-2">
              <BarChart2 size={18} className="text-brand-blue" />
              Order summary
            </h2>
            <p className="text-3xl font-bold text-dark-base dark:text-white">{rows.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Total revenue: <strong>GH₵ {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Avg order value: <strong>GH₵ {avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
            </p>
            <div className="text-xs text-gray-500 space-y-1 border-t pt-2 mt-2">
              {Object.entries(byStatus).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="flex items-center gap-1">
                    {['DELIVERED', 'COMPLETED'].includes(k) ? <CheckCircle size={10} className="text-emerald-500" /> :
                     ['PENDING', 'PROCESSING'].includes(k) ? <Clock size={10} className="text-amber-500" /> : null}
                    {k}
                  </span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="app-card p-6 space-y-3">
            <h2 className="font-semibold text-dark-base dark:text-white flex items-center gap-2">
              <CheckCircle size={18} className="text-brand-blue" />
              Fulfilment rate
            </h2>
            <p className="text-3xl font-bold text-dark-base dark:text-white">
              {fulfilmentRate > 0 ? `${fulfilmentRate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {fulfilledCount} delivered of {rows.length} orders
            </p>
            {summaryData && (
              <div className="text-xs text-gray-500 border-t pt-2 mt-2">
                <p>Reporting service: {summaryData.totalOrders ?? 0} total, {summaryData.rate?.toFixed(1) ?? 0}% fulfilled</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
