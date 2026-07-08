import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, TrendingUp, AlertTriangle, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { procurementApi } from '../../services/axiosInstance'

const URGENCY_FILTERS = ['All', 'CRITICAL', 'HIGH', 'MEDIUM']

function urgencyStyle(u) {
  const x = String(u ?? '').toUpperCase()
  if (x === 'CRITICAL') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
  if (x === 'HIGH') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
  if (x === 'MEDIUM') return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

function formatNum(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 })
}

export default function ReorderRecommendations() {
  const [urgencyFilter, setUrgencyFilter] = useState('All')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reorder-recommendations', urgencyFilter],
    queryFn: async () => {
      const params =
        urgencyFilter !== 'All' ? { urgency: urgencyFilter } : {}
      const r = await procurementApi.get('/reorder-recommendations', { params })
      return Array.isArray(r.data) ? r.data : []
    },
    staleTime: 60_000,
  })

  const rows = data ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-dark-base dark:text-white flex items-center gap-2">
          <TrendingUp size={22} className="text-medium-green" />
          Reorder recommendations
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Deterministic ranking from low stock, open order demand, outbound velocity, pending POs, and supplier lead time.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-500 mr-1">Urgency</span>
        {URGENCY_FILTERS.map((u) => {
          const active = urgencyFilter === u
          return (
            <button
              key={u}
              type="button"
              onClick={() => setUrgencyFilter(u)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                active
                  ? 'bg-medium-green text-white border-medium-green'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-medium-green/50'
              }`}
            >
              {u}
            </button>
          )
        })}
      </div>

      {isLoading && (
        <div className="app-card p-12 flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-medium-green" size={28} />
          <p className="text-sm text-gray-500">Loading recommendations…</p>
        </div>
      )}

      {isError && (
        <div className="app-card p-6 border-red-200 text-red-600 text-sm flex items-start gap-2">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>
            Procurement could not reach inventory, orders, or reporting services.{' '}
            <button type="button" onClick={() => refetch()} className="underline font-medium">
              Retry
            </button>
          </span>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="app-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[960px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Urgency</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">SKU / Product</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Threshold</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Days left</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Demand</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Pending PO</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-gray-400">
                      No reorder lines for this filter.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => {
                    const pid = row.productId
                    const sid = row.preferredSupplierId
                    const qty = row.recommendedQty ?? row.suggestedOrderQuantity
                    const poHref =
                      sid && pid
                        ? `/procurement/purchase-orders/new?productId=${encodeURIComponent(pid)}&supplierId=${encodeURIComponent(sid)}&quantity=${encodeURIComponent(String(qty ?? ''))}`
                        : '/procurement/purchase-orders/new'
                    return (
                      <tr key={`${row.productId}-${row.locationId}-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${urgencyStyle(row.urgency)}`}>
                            {row.urgency ?? '—'}
                          </span>
                          {row.recommendOrderBy && (
                            <span className="block text-[10px] text-gray-400 mt-0.5">Auto-ranked</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-dark-base dark:text-white">{row.productName || '—'}</p>
                          <p className="text-xs font-mono text-gray-500">{row.sku || '—'}</p>
                          <p className="text-xs text-gray-400">{row.category || ''}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                          <span className="font-mono">{row.locationCode || '—'}</span>
                          {row.warehouseId && (
                            <span className="block text-[10px] text-gray-400 mt-0.5">WH {String(row.warehouseId).slice(0, 8)}…</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{row.currentStock ?? row.quantityAvailable ?? '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{row.reorderThreshold ?? '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                          {row.daysUntilStockout != null ? formatNum(row.daysUntilStockout) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs">
                          <span className="block">{row.openOrderDemand ?? 0} pipeline</span>
                          <span className="text-gray-400">{formatNum(row.avgDailyDemand)}/day</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{row.pendingPoQuantity ?? 0}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className="text-dark-base dark:text-white">{row.preferredSupplierName || '—'}</span>
                          {row.leadTimeDays != null && (
                            <span className="block text-gray-400">Lead {row.leadTimeDays}d</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-medium-green">{qty ?? '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={poHref}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-medium-green hover:underline"
                          >
                            Create PO <ExternalLink size={12} />
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500">
        Open the{' '}
        <Link to="/procurement/purchase-orders" className="text-medium-green hover:underline font-medium">
          purchase order list
        </Link>{' '}
        to track submissions.
      </p>
    </div>
  )
}
