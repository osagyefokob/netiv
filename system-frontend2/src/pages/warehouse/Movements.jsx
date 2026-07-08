import { useQuery } from '@tanstack/react-query'
import { Loader2, ArrowLeftRight } from 'lucide-react'
import { warehouseApi } from '../../services/axiosInstance'
import { springPageItems } from '../../utils/apiNormalize'

export default function Movements() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['movements', 'list'],
    queryFn: async () => {
      const r = await warehouseApi.get('/movements', { params: { page: 1, limit: 50 } })
      return springPageItems(r.data)
    },
    staleTime: 30_000,
  })

  const rows = data ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-dark-base dark:text-white">Stock movements</h1>
        <p className="text-sm text-gray-500 mt-0.5">Transfers and adjustments recorded in the warehouse service</p>
      </div>

      {isLoading && (
        <div className="app-card p-12 flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-medium-green" size={28} />
          <p className="text-sm text-gray-500">Loading movements…</p>
        </div>
      )}

      {isError && (
        <div className="app-card p-6 border-red-200 text-red-600 text-sm">
          Failed to load movements.{' '}
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">When</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">From → To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                      No movements found
                    </td>
                  </tr>
                ) : (
                  rows.map((m) => (
                    <tr key={m.movementId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-dark-base dark:text-white">
                          <ArrowLeftRight size={12} className="text-medium-green" />
                          {m.movementType ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{m.quantity ?? 0}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{String(m.productId).slice(0, 8)}…</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {m.fromLocationId ? String(m.fromLocationId).slice(0, 6) : '—'} →{' '}
                        {m.toLocationId ? String(m.toLocationId).slice(0, 6) : '—'}
                      </td>
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
