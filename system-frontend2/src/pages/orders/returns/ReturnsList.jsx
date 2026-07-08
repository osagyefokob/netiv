import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, RotateCcw } from 'lucide-react'
import { ordersApi } from '../../../services/axiosInstance'
import { springPageItems, springPageTotalElements, springPageTotalPages } from '../../../utils/apiNormalize'

const RETURN_STATUS_TABS = ['All', 'PENDING', 'RECEIVED', 'INSPECTED', 'RESTOCKED', 'WRITTEN_OFF']

export default function ReturnsList() {
  const [page, setPage] = useState(1)
  const [statusTab, setStatusTab] = useState('All')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['returns', page, statusTab],
    queryFn: async () => {
      const r = await ordersApi.get('/returns', {
        params: {
          page,
          limit: 20,
          ...(statusTab !== 'All' ? { status: statusTab } : {}),
        },
      })
      return r.data
    },
  })

  const rows = springPageItems(data)
  const total = springPageTotalElements(data) || rows.length
  const totalPages = Math.max(1, springPageTotalPages(data))

  const { data: countsRaw } = useQuery({
    queryKey: ['returns', 'status-counts'],
    queryFn: async () => {
      const r = await ordersApi.get('/returns', { params: { page: 1, limit: 500 } })
      return springPageItems(r.data)
    },
    staleTime: 30_000,
  })

  const statusCounts = useMemo(() => {
    const m = {}
    RETURN_STATUS_TABS.forEach((s) => {
      if (s === 'All') return
      m[s] = (countsRaw ?? []).filter((o) => o.status === s).length
    })
    return m
  }, [countsRaw])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-dark-base dark:text-white flex items-center gap-2">
          <RotateCcw size={22} className="text-medium-green" />
          Returns
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Return orders linked to delivered sales</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {RETURN_STATUS_TABS.map((s) => {
          const count =
            s === 'All'
              ? (countsRaw?.length ?? '—')
              : statusCounts[s] ?? 0
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
                  ? 'bg-medium-green text-white border-medium-green'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-medium-green/50'
              }`}
            >
              {s}
              {s !== 'All' && <span className="ml-1.5 tabular-nums opacity-80">({count})</span>}
            </button>
          )
        })}
      </div>

      {isLoading && (
        <div className="app-card p-12 flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-medium-green" size={28} />
          <p className="text-sm text-gray-500">Loading returns…</p>
        </div>
      )}

      {isError && (
        <div className="app-card p-6 border-red-200 text-red-600 text-sm">
          Failed to load returns.{' '}
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Return</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Original order</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                      No returns in this filter
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={String(row.returnId)} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <Link
                          to={`/orders/returns/${row.returnId}`}
                          className="font-mono text-xs text-medium-green hover:underline"
                        >
                          {String(row.returnId).slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {String(row.originalOrderId).slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate">{row.reason || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {rows.length > 0 && (
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
          )}
        </div>
      )}
    </div>
  )
}
