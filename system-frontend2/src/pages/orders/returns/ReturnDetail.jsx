import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, PackageCheck, ClipboardCheck, Boxes } from 'lucide-react'
import { ordersApi } from '../../../services/axiosInstance'

const CONDITIONS = ['GOOD', 'DAMAGED', 'UNUSABLE']
const DISPOSITIONS = [
  { value: 'RESTOCK', label: 'Restock' },
  { value: 'WRITE_OFF', label: 'Write off' },
  { value: 'QUARANTINE', label: 'Quarantine' },
]

export default function ReturnDetail() {
  const { returnId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [inspectMap, setInspectMap] = useState({})
  const [dispMap, setDispMap] = useState({})

  const { data: ret, isLoading, isError, refetch } = useQuery({
    queryKey: ['return', returnId],
    queryFn: async () => {
      const r = await ordersApi.get(`/returns/${returnId}`)
      return r.data
    },
    enabled: Boolean(returnId),
  })

  const items = ret?.items ?? []

  useEffect(() => {
    const lines = ret?.items
    if (!lines?.length) return
    setInspectMap((prev) => {
      const m = { ...prev }
      lines.forEach((i) => {
        if (m[i.returnItemId] == null) m[i.returnItemId] = i.itemCondition || 'GOOD'
      })
      return m
    })
    setDispMap((prev) => {
      const m = { ...prev }
      lines.forEach((i) => {
        if (m[i.returnItemId] == null) m[i.returnItemId] = 'RESTOCK'
      })
      return m
    })
  }, [ret])

  const receiveMut = useMutation({
    mutationFn: () => ordersApi.patch(`/returns/${returnId}/receive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['return', returnId] })
      queryClient.invalidateQueries({ queryKey: ['returns'] })
    },
  })

  const inspectMut = useMutation({
    mutationFn: (body) => ordersApi.patch(`/returns/${returnId}/inspect`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['return', returnId] })
      queryClient.invalidateQueries({ queryKey: ['returns'] })
    },
  })

  const processMut = useMutation({
    mutationFn: (body) => ordersApi.patch(`/returns/${returnId}/process`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['return', returnId] })
      queryClient.invalidateQueries({ queryKey: ['returns'] })
    },
  })

  function submitInspect(e) {
    e.preventDefault()
    const payload = {
      items: items.map((i) => ({
        returnItemId: i.returnItemId,
        itemCondition: inspectMap[i.returnItemId] ?? i.itemCondition ?? 'GOOD',
      })),
    }
    inspectMut.mutate(payload)
  }

  function submitProcess(e) {
    e.preventDefault()
    const payload = {
      items: items.map((i) => ({
        returnItemId: i.returnItemId,
        disposition: dispMap[i.returnItemId] ?? 'RESTOCK',
      })),
    }
    processMut.mutate(payload)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <Loader2 className="animate-spin text-medium-green" size={32} />
        <p className="text-sm text-gray-500">Loading return…</p>
      </div>
    )
  }

  if (isError || !ret) {
    return (
      <div className="app-card p-6 border-red-200 text-red-600 text-sm">
        Could not load return.{' '}
        <button type="button" onClick={() => refetch()} className="underline font-medium">
          Retry
        </button>
      </div>
    )
  }

  const status = String(ret.status)

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/orders/returns')}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-dark-base dark:text-white">Return</h1>
          <p className="text-xs font-mono text-gray-500">{String(ret.returnId)}</p>
        </div>
      </div>

      <div className="app-card p-5 space-y-3 text-sm">
        <div className="flex flex-wrap gap-4">
          <div>
            <p className="text-gray-500 text-xs uppercase">Status</p>
            <p className="font-semibold">{status}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase">Original order</p>
            <Link to={`/orders/${ret.originalOrderId}`} className="font-mono text-xs text-medium-green hover:underline">
              {String(ret.originalOrderId)}
            </Link>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase">Reason</p>
            <p>{ret.reason || '—'}</p>
          </div>
        </div>
      </div>

      <div className="app-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/80 dark:bg-gray-800/50">
            <tr>
              <th className="text-left px-4 py-2 text-xs text-gray-500">Product</th>
              <th className="text-right px-4 py-2 text-xs text-gray-500">Qty</th>
              <th className="text-left px-4 py-2 text-xs text-gray-500">Condition</th>
              <th className="text-left px-4 py-2 text-xs text-gray-500">Disposition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {items.map((i) => (
              <tr key={String(i.returnItemId)}>
                <td className="px-4 py-2 font-mono text-xs">{String(i.productId)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{i.quantity}</td>
                <td className="px-4 py-2">{i.itemCondition || '—'}</td>
                <td className="px-4 py-2">{i.disposition || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {status === 'PENDING' && (
        <div className="app-card p-5 border border-amber-200/50 dark:border-amber-900/40">
          <h2 className="text-lg font-semibold text-dark-base dark:text-white flex items-center gap-2 mb-2">
            <PackageCheck size={18} className="text-amber-500" />
            Receive shipment
          </h2>
          <p className="text-sm text-gray-500 mb-4">Mark goods as received at the warehouse.</p>
          {receiveMut.isError && (
            <p className="text-sm text-red-600 mb-2">
              {receiveMut.error?.apiError?.message || receiveMut.error?.message}
            </p>
          )}
          <button
            type="button"
            disabled={receiveMut.isPending}
            onClick={() => receiveMut.mutate()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-blue hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            {receiveMut.isPending && <Loader2 className="animate-spin" size={16} />}
            Mark received
          </button>
        </div>
      )}

      {status === 'RECEIVED' && (
        <form onSubmit={submitInspect} className="app-card p-5 border border-blue-200/50 dark:border-blue-900/40 space-y-4">
          <h2 className="text-lg font-semibold text-dark-base dark:text-white flex items-center gap-2">
            <ClipboardCheck size={18} className="text-blue-500" />
            Inspect condition
          </h2>
          <p className="text-sm text-gray-500">Set condition for each line, then submit inspection.</p>
          {items.map((i) => (
            <div key={String(i.returnItemId)} className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs flex-1 min-w-[180px]">{String(i.productId)}</span>
              <select
                value={inspectMap[i.returnItemId] ?? i.itemCondition ?? 'GOOD'}
                onChange={(e) =>
                  setInspectMap((m) => ({ ...m, [i.returnItemId]: e.target.value }))
                }
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-sm"
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {inspectMut.isError && (
            <p className="text-sm text-red-600">{inspectMut.error?.apiError?.message || inspectMut.error?.message}</p>
          )}
          <button
            type="submit"
            disabled={inspectMut.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold disabled:opacity-50"
          >
            {inspectMut.isPending && <Loader2 className="animate-spin" size={16} />}
            Complete inspection
          </button>
        </form>
      )}

      {status === 'INSPECTED' && (
        <form onSubmit={submitProcess} className="app-card p-5 border border-emerald-200/50 dark:border-emerald-900/40 space-y-4">
          <h2 className="text-lg font-semibold text-dark-base dark:text-white flex items-center gap-2">
            <Boxes size={18} className="text-emerald-500" />
            Process return
          </h2>
          <p className="text-sm text-gray-500">Choose disposition per line. Restock increases inventory at the resolved location.</p>
          {items.map((i) => (
            <div key={String(i.returnItemId)} className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs flex-1 min-w-[180px]">{String(i.productId)}</span>
              <select
                value={dispMap[i.returnItemId] ?? 'RESTOCK'}
                onChange={(e) => setDispMap((m) => ({ ...m, [i.returnItemId]: e.target.value }))}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-sm"
              >
                {DISPOSITIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {processMut.isError && (
            <p className="text-sm text-red-600">{processMut.error?.apiError?.message || processMut.error?.message}</p>
          )}
          <button
            type="submit"
            disabled={processMut.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-blue hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            {processMut.isPending && <Loader2 className="animate-spin" size={16} />}
            Finalize processing
          </button>
        </form>
      )}

      {['RESTOCKED', 'WRITTEN_OFF'].includes(status) && (
        <p className="text-sm text-gray-500">
          This return is complete ({status}).{' '}
          <Link to="/orders/returns" className="text-medium-green hover:underline">
            Back to list
          </Link>
        </p>
      )}
    </div>
  )
}
