import { useQuery } from '@tanstack/react-query'
import { Loader2, Factory } from 'lucide-react'
import { procurementApi, reportingApi } from '../../services/axiosInstance'
import { springPageItems } from '../../utils/apiNormalize'

export default function ProcurementReport() {
  const pos = useQuery({
    queryKey: ['reports', 'po-count'],
    queryFn: async () => {
      const r = await procurementApi.get('/purchase-orders', { params: { page: 1, limit: 500 } })
      return springPageItems(r.data)
    },
    staleTime: 60_000,
  })

  const suppliers = useQuery({
    queryKey: ['reports', 'supplier-count'],
    queryFn: async () => {
      const r = await procurementApi.get('/suppliers', { params: { page: 1, limit: 500 } })
      return springPageItems(r.data)
    },
    staleTime: 60_000,
  })

  const summary = useQuery({
    queryKey: ['reports', 'orders-summary-proc'],
    queryFn: async () => {
      const r = await reportingApi.get('/orders/summary')
      return r.data
    },
    staleTime: 60_000,
  })

  const loading = pos.isLoading || suppliers.isLoading || summary.isLoading

  const byStatus = pos.data?.reduce((acc, po) => {
    const s = po.status || 'UNKNOWN'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-dark-base dark:text-white">Procurement overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Purchase orders and supplier counts from live services</p>
      </div>

      {loading && (
        <div className="app-card p-12 flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-medium-green" size={28} />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="app-card p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Suppliers</p>
            <p className="text-3xl font-bold text-dark-base dark:text-white mt-1 flex items-center gap-2">
              <Factory size={22} className="text-medium-green" />
              {suppliers.data?.length ?? 0}
            </p>
          </div>
          <div className="app-card p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Purchase orders</p>
            <p className="text-3xl font-bold text-dark-base dark:text-white mt-1">{pos.data?.length ?? 0}</p>
          </div>
          <div className="app-card p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Orders (reporting)</p>
            <p className="text-3xl font-bold text-dark-base dark:text-white mt-1">{summary.data?.totalOrders ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">Cross-check with order pipeline</p>
          </div>
        </div>
      )}

      {!loading && byStatus && Object.keys(byStatus).length > 0 && (
        <div className="app-card p-5">
          <h2 className="font-semibold text-dark-base dark:text-white mb-3">PO by status</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byStatus).map(([status, n]) => (
              <span
                key={status}
                className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200"
              >
                {status}: <strong>{n}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
