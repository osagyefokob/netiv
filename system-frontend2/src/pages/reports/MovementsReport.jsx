import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, ArrowLeftRight } from 'lucide-react'
import { reportingApi } from '../../services/axiosInstance'
import { springPageItems } from '../../utils/apiNormalize'

const PERIODS = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
]

export default function MovementsReport() {
  const [period, setPeriod] = useState('week')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reports', 'movements-history'],
    queryFn: async () => {
      const r = await reportingApi.get('/movements/history', { params: { page: 1, limit: 50 } })
      return r.data
    },
    staleTime: 60_000,
  })

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['reports', 'movements-trends', period],
    queryFn: async () => {
      const r = await reportingApi.get('/movements/trends', { params: { period } })
      return Array.isArray(r.data) ? r.data : []
    },
    staleTime: 60_000,
  })

  const rows = springPageItems(data)
  const trendRows = trends ?? []

  const maxFlow = Math.max(
    1,
    ...trendRows.flatMap((t) => [t.inbound ?? 0, t.outbound ?? 0]),
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-dark-base dark:text-white">Movement history</h1>
        <p className="text-sm text-gray-500 mt-0.5">Aggregated movement aggregates from reporting DB</p>
      </div>

      <div className="app-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-gray-800 dark:text-white">Inbound vs outbound</h2>
            <p className="text-xs text-gray-400">Window size follows API period (7 / 30 / 90 recent buckets)</p>
          </div>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50/80 dark:bg-gray-800/50">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  period === p.id
                    ? 'bg-white dark:bg-gray-900 shadow text-medium-green'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {trendsLoading && <p className="text-sm text-gray-500">Loading trends…</p>}

        {!trendsLoading && trendRows.length === 0 && (
          <p className="text-sm text-gray-400">No trend rows yet — movement aggregates may be empty.</p>
        )}

        {!trendsLoading && trendRows.length > 0 && (
          <div className="overflow-x-auto">
            <div className="flex gap-1 items-end min-h-[140px] pb-6" style={{ minWidth: trendRows.length * 28 }}>
              {trendRows.map((t, i) => {
                const ih = ((t.inbound ?? 0) / maxFlow) * 100
                const oh = ((t.outbound ?? 0) / maxFlow) * 100
                return (
                  <div key={`${t.date}-${i}`} className="flex flex-col items-center gap-1 flex-1 min-w-[24px]">
                    <div className="flex gap-0.5 items-end h-24 w-full justify-center">
                      <div
                        className="w-2 rounded-sm bg-emerald-500/90"
                        style={{ height: `${Math.max(ih, 2)}%` }}
                        title={`Inbound ${t.inbound}`}
                      />
                      <div
                        className="w-2 rounded-sm bg-amber-500/90"
                        style={{ height: `${Math.max(oh, 2)}%` }}
                        title={`Outbound ${t.outbound}`}
                      />
                    </div>
                    <span className="text-[9px] text-gray-400 rotate-[-38deg] origin-top whitespace-nowrap max-w-[52px] truncate">
                      {t.date}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-4 text-xs text-gray-500 mt-2">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-emerald-500" /> Inbound
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-amber-500" /> Outbound
              </span>
            </div>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="app-card p-12 flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-medium-green" size={28} />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      )}

      {isError && (
        <div className="app-card p-6 border-red-200 text-red-600 text-sm">
          Failed to load report.{' '}
          <button type="button" onClick={() => refetch()} className="underline font-medium">
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="app-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-semibold text-gray-800 dark:text-white">Latest aggregates</h2>
            <p className="text-xs text-gray-400">Paged movement aggregate rows</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Inbound</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Outbound</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                      No movement aggregates yet
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.aggId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {row.periodStart ? new Date(row.periodStart).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-dark-base dark:text-white">
                        <span className="inline-flex items-center gap-1">
                          <ArrowLeftRight size={12} className="text-medium-green" />
                          {String(row.productId).slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{String(row.warehouseId).slice(0, 8)}…</td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-600">{row.totalInbound ?? 0}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-600">{row.totalOutbound ?? 0}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{row.netChange ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
