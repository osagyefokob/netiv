import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Package, AlertTriangle } from 'lucide-react'
import { reportingApi, inventoryApi } from '../../services/axiosInstance'
import { springPageItems } from '../../utils/apiNormalize'

function SparklineCell({ productId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'sparkline', productId],
    queryFn: async () => {
      const r = await reportingApi.get(`/inventory/product/${productId}/sparkline`, { params: { days: 7 } })
      return Array.isArray(r.data) ? r.data : []
    },
    enabled: Boolean(productId),
    staleTime: 60_000,
  })

  if (isLoading) {
    return <span className="text-[10px] text-gray-400">…</span>
  }
  const vals = data ?? []
  if (vals.length === 0) {
    return <span className="text-[10px] text-gray-400">—</span>
  }
  const max = Math.max(...vals, 1)
  const w = 80
  const h = 28
  const pad = 2
  const pts = vals
    .map((v, i) => {
      const x = pad + (i / Math.max(vals.length - 1, 1)) * (w - pad * 2)
      const y = pad + (1 - v / max) * (h - pad * 2)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={w} height={h} className="text-brand-blue overflow-visible">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" points={pts} />
    </svg>
  )
}

export default function InventoryReport() {
  const defaultTo = useMemo(() => new Date(), [])
  const defaultFrom = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d
  }, [])

  const [from, setFrom] = useState(() => defaultFrom.toISOString().slice(0, 10))
  const [to, setTo] = useState(() => defaultTo.toISOString().slice(0, 10))
  const [showTab, setShowTab] = useState('snapshot')

  const { data: snapshotData, isLoading: snapshotLoading } = useQuery({
    queryKey: ['reports', 'inventory-snapshot'],
    queryFn: async () => {
      const r = await reportingApi.get('/inventory/snapshot', { params: { page: 1, limit: 200 } })
      return r.data
    },
    staleTime: 60_000,
  })

  const { data: lowStockData, isLoading: lowStockLoading } = useQuery({
    queryKey: ['reports', 'inventory-low-stock'],
    queryFn: async () => {
      const r = await inventoryApi.get('/stock/low-stock')
      return Array.isArray(r.data) ? r.data : []
    },
    staleTime: 60_000,
  })

  const snapshotRows = springPageItems(snapshotData)
  const lowStockRows = lowStockData ?? []

  const filteredSnapshots = useMemo(() => {
    const start = new Date(from)
    const end = new Date(to)
    end.setHours(23, 59, 59, 999)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return snapshotRows
    return snapshotRows.filter((row) => {
      if (!row.snapshotAt) return true
      const t = new Date(row.snapshotAt).getTime()
      return t >= start.getTime() && t <= end.getTime()
    })
  }, [snapshotRows, from, to])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-dark-base dark:text-white">Inventory report</h1>
        <p className="text-sm text-gray-500 mt-0.5">Stock levels and low-stock alerts</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setShowTab('snapshot')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            showTab === 'snapshot'
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Snapshot
        </button>
        <button
          type="button"
          onClick={() => setShowTab('low-stock')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            showTab === 'low-stock'
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <AlertTriangle size={14} /> Low Stock
          {lowStockRows.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs">{lowStockRows.length}</span>
          )}
        </button>
      </div>

      {showTab === 'snapshot' && (
        <>
          <div className="app-card p-4 flex flex-wrap gap-4 items-end">
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-dark-base dark:text-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-dark-base dark:text-white"
              />
            </label>
            <p className="text-xs text-gray-400 pb-2">
              {filteredSnapshots.length} row{filteredSnapshots.length === 1 ? '' : 's'} (7-day outbound sparkline per product)
            </p>
          </div>

          {snapshotLoading && (
            <div className="app-card p-12 flex flex-col items-center gap-2">
              <Loader2 className="animate-spin text-brand-blue" size={28} />
              <p className="text-sm text-gray-500">Loading snapshot…</p>
            </div>
          )}

          {!snapshotLoading && (
            <div className="app-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[960px]">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Location</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reserved</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Available</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">7d outbound</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Snapshot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {filteredSnapshots.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                          No snapshot rows (materialized snapshots will populate once Kafka consumers run)
                        </td>
                      </tr>
                    ) : (
                      filteredSnapshots.map((row) => (
                        <tr key={row.snapshotId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                          <td className="px-4 py-3 font-mono text-xs">
                            <span className="inline-flex items-center gap-2 text-dark-base dark:text-white">
                              <Package size={12} className="text-brand-blue" />
                              {String(row.productId).slice(0, 8)}…
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{String(row.warehouseId).slice(0, 8)}…</td>
                          <td className="px-4 py-3 font-mono text-xs">{String(row.locationId).slice(0, 8)}…</td>
                          <td className="px-4 py-3 text-right tabular-nums">{row.totalQuantity ?? 0}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{row.reservedQuantity ?? 0}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{row.availableQuantity ?? 0}</td>
                          <td className="px-4 py-3">
                            <SparklineCell productId={row.productId} />
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {row.snapshotAt ? new Date(row.snapshotAt).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {showTab === 'low-stock' && (
        <>
          {lowStockLoading && (
            <div className="app-card p-12 flex flex-col items-center gap-2">
              <Loader2 className="animate-spin text-brand-blue" size={28} />
              <p className="text-sm text-gray-500">Loading low stock items…</p>
            </div>
          )}

          {!lowStockLoading && (
            <div className="app-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product ID</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Location</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">On Hand</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reserved</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {lowStockRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                          No low stock items — all products are above reorder threshold
                        </td>
                      </tr>
                    ) : (
                      lowStockRows.map((row, i) => (
                        <tr key={row.stockLevelId ?? `${row.productId}-${i}`} className="hover:bg-orange-50/30 dark:hover:bg-orange-900/10">
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-2">
                              <AlertTriangle size={12} className="text-amber-500" />
                              <span className="font-mono text-xs text-dark-base dark:text-white">
                                {String(row.productId).slice(0, 8)}…
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">{String(row.locationId).slice(0, 8)}…</td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-700 dark:text-gray-200">
                            {row.quantityOnHand ?? 0}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-500">{row.quantityReserved ?? 0}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <span className={`font-semibold ${
                              (row.quantityOnHand ?? 0) === 0 ? 'text-red-600 dark:text-red-300' : 'text-amber-600 dark:text-amber-300'
                            }`}>
                              {Math.max(0, (row.quantityOnHand ?? 0) - (row.quantityReserved ?? 0))}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
