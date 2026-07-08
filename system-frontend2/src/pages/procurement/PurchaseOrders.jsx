import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, FileText, Star } from 'lucide-react'
import { procurementApi } from '../../services/axiosInstance'
import { springPageItems, springPageTotalElements, springPageTotalPages } from '../../utils/apiNormalize'
import StatusBadge from '../../components/ui/StatusBadge'

const PO_STATUS_TABS = ['All', 'DRAFTED', 'SUBMITTED', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED', 'COMPLETED']

function isPoOverdue(po) {
  if (!po.expectedDelivery) return false
  if (['COMPLETED', 'CANCELLED', 'CLOSED'].includes(String(po.status ?? '').toUpperCase())) return false
  return new Date(po.expectedDelivery) < new Date()
}

function SupplierStars({ rating }) {
  const n = Math.max(0, Math.min(5, Math.round(Number(rating ?? 0))))
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" title={rating != null ? `Rating ${rating}` : 'No rating'}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={12} className={i < n ? 'fill-current' : 'opacity-25'} />
      ))}
    </span>
  )
}

export default function PurchaseOrders() {
  const [page, setPage] = useState(1)
  const [statusTab, setStatusTab] = useState('All')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['purchase-orders', page, statusTab],
    queryFn: async () => {
      const r = await procurementApi.get('/purchase-orders', {
        params: {
          page,
          limit: 25,
          ...(statusTab !== 'All' ? { status: statusTab } : {}),
        },
      })
      return r.data
    },
    staleTime: 30_000,
  })

  const rows = springPageItems(data)
  const total = springPageTotalElements(data) ?? rows.length
  const totalPages = Math.max(1, springPageTotalPages(data))

  const { data: countsRaw } = useQuery({
    queryKey: ['purchase-orders', 'status-counts'],
    queryFn: async () => {
      const r = await procurementApi.get('/purchase-orders', { params: { page: 1, limit: 500 } })
      return springPageItems(r.data)
    },
    staleTime: 30_000,
  })

  const statusCounts = useMemo(() => {
    const m = {}
    PO_STATUS_TABS.forEach((s) => {
      if (s === 'All') return
      m[s] = (countsRaw ?? []).filter((o) => String(o.status ?? '').toUpperCase() === s).length
    })
    return m
  }, [countsRaw])

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', 'po-list'],
    queryFn: async () => {
      const r = await procurementApi.get('/suppliers', { params: { page: 1, limit: 500 } })
      return springPageItems(r.data)
    },
    staleTime: 60_000,
  })

  const supplierById = useMemo(() => {
    const map = new Map()
    for (const s of suppliers ?? []) {
      map.set(String(s.supplierId), s)
    }
    return map
  }, [suppliers])

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-dark-base dark:text-white">Purchase orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">POs from procurement service</p>
        </div>
        <Link
          to="/procurement/purchase-orders/new"
          className="inline-flex items-center justify-center rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + New purchase order
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {PO_STATUS_TABS.map((s) => {
          const count = s === 'All' ? (countsRaw?.length ?? '—') : statusCounts[s] ?? 0
          const active = statusTab === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatusTab(s)
                setPage(1)
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                active
                  ? 'bg-brand-blue text-white border-medium-green'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-medium-green/50'
              }`}
            >
              {s.replaceAll('_', ' ')}
              {s !== 'All' && <span className="ml-1.5 tabular-nums opacity-80">({count})</span>}
            </button>
          )
        })}
      </div>

      {isLoading && (
        <div className="app-card p-12 flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-medium-green" size={28} />
          <p className="text-sm text-gray-500">Loading purchase orders…</p>
        </div>
      )}

      {isError && (
        <div className="app-card p-6 border-red-200 text-red-600 text-sm">
          Failed to load purchase orders.{' '}
          <button type="button" onClick={() => refetch()} className="underline font-medium">
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="app-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">PO</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Delivery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                      No purchase orders
                    </td>
                  </tr>
                ) : (
                  rows.map((po) => {
                    const overdue = isPoOverdue(po)
                    const sup = supplierById.get(String(po.supplierId))
                    return (
                      <tr
                        key={po.purchaseOrderId}
                        className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/30 ${overdue ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}
                      >
                        <td className="px-4 py-3 font-mono text-xs">
                          <Link
                            to={`/procurement/purchase-orders/${po.purchaseOrderId}`}
                            className="inline-flex items-center gap-2 text-medium-green hover:underline font-medium"
                          >
                            <FileText size={14} />
                            {String(po.purchaseOrderId).slice(0, 8)}…
                          </Link>
                          {overdue && (
                            <span className="ml-2 text-[10px] font-bold uppercase text-red-600 dark:text-red-400">Overdue</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-dark-base dark:text-white">
                              {sup?.name ?? `Supplier ${String(po.supplierId).slice(0, 8)}…`}
                            </span>
                            <SupplierStars rating={sup?.rating} />
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{String(po.warehouseId).slice(0, 8)}…</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={po.status} />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {po.totalAmount != null ? Number(po.totalAmount).toFixed(2) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {po.expectedDelivery ?? '—'}
                          {overdue && <span className="block text-[10px] text-red-600">Past expected date</span>}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
            <span>
              {total} total · page {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
