import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Loader2,
  RotateCcw,
  Package,
  Send,
  Ban,
  Truck,
  Clock,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import useAuthStore from '../../store/authStore'
import { ordersApi } from '../../services/axiosInstance'
import StatusBadge from '../../components/ui/StatusBadge'

export default function OrderDetail() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const canEdit = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF'].includes(user?.roleName)
  const canReturn = canEdit

  const [showReturn, setShowReturn] = useState(false)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([])
  const [cancelReason, setCancelReason] = useState('')

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const r = await ordersApi.get(`/${orderId}`)
      return r.data
    },
    enabled: Boolean(orderId),
  })

  const { data: history = [] } = useQuery({
    queryKey: ['order-history', orderId],
    queryFn: async () => {
      const r = await ordersApi.get(`/${orderId}/history`)
      return r.data
    },
    enabled: Boolean(orderId),
  })

  useEffect(() => {
    if (!order?.items?.length) {
      setLines([])
      return
    }
    setLines(
      order.items.map((i) => ({
        orderItemId: String(i.orderItemId),
        productId: String(i.productId),
        quantity: 1,
        max: i.quantity,
      }))
    )
  }, [order])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['order', orderId] })
    queryClient.invalidateQueries({ queryKey: ['order-history', orderId] })
    queryClient.invalidateQueries({ queryKey: ['orders'] })
  }

  const submitMut = useMutation({
    mutationFn: () => ordersApi.post(`/${orderId}/submit`),
    onSuccess: invalidate,
  })

  const cancelMut = useMutation({
    mutationFn: (payload) => ordersApi.post(`/${orderId}/cancel`, payload),
    onSuccess: invalidate,
  })

  const deliverMut = useMutation({
    mutationFn: () => ordersApi.post(`/${orderId}/deliver`),
    onSuccess: invalidate,
  })

  const initiateReturn = useMutation({
    mutationFn: (payload) => ordersApi.post(`/${orderId}/return`, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['returns'] })
      navigate(`/orders/returns/${res.data.returnId}`)
    },
  })

  function updateLine(orderItemId, quantity) {
    setLines((prev) =>
      prev.map((l) => (l.orderItemId === orderItemId ? { ...l, quantity: Math.min(Math.max(1, quantity), l.max) } : l))
    )
  }

  function submitReturn(e) {
    e.preventDefault()
    if (!user?.userId) return
    const payloadLines = lines
      .filter((l) => l.quantity > 0)
      .map((l) => ({ productId: l.productId, quantity: l.quantity }))
    if (payloadLines.length === 0 || !reason.trim()) return
    initiateReturn.mutate({
      initiatedBy: user.userId,
      reason: reason.trim(),
      notes: notes.trim() || undefined,
      restockLocationId: undefined,
      lines: payloadLines,
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <Loader2 className="animate-spin text-medium-green" size={32} />
        <p className="text-sm text-gray-500">Loading order…</p>
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="app-card p-6 border-red-200 text-red-600 text-sm">
        Could not load order.{' '}
        <button type="button" onClick={() => refetch()} className="underline font-medium">
          Retry
        </button>
      </div>
    )
  }

  const st = String(order.status).toUpperCase()
  const delivered = st === 'DELIVERED'

  const timeline = [...history].sort(
    (a, b) => new Date(a.createdAt ?? a.changedAt ?? 0) - new Date(b.createdAt ?? b.changedAt ?? 0)
  )

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-dark-base dark:text-white">Order</h1>
          <p className="text-xs font-mono text-gray-500 truncate">{String(order.orderId)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="app-card p-5 space-y-4">
            <div className="flex flex-wrap gap-4 justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 uppercase">Total</p>
                <p className="text-2xl font-mono font-bold text-dark-base dark:text-white">
                  GHS {Number(order.totalAmount ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="text-xs text-gray-500">Expected delivery</p>
                <p>{order.expectedDelivery ?? '—'}</p>
              </div>
            </div>

            {canEdit && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                {st === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => submitMut.mutate()}
                    disabled={submitMut.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {submitMut.isPending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                    Submit order
                  </button>
                )}
                {(st === 'PENDING' || st === 'PROCESSING') && (
                  <>
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/30">
                      <Clock size={14} /> Saga may be running — cancel only if safe.
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        cancelMut.mutate({
                          reason: cancelReason || 'Cancelled from UI',
                          cancelledBy: user.userId,
                        })
                      }
                      disabled={cancelMut.isPending}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-medium"
                    >
                      <Ban size={16} /> Cancel
                    </button>
                    <input
                      placeholder="Cancel reason"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="flex-1 min-w-[160px] rounded border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-xs"
                    />
                  </>
                )}
                {st === 'SHIPPED' && (
                  <button
                    type="button"
                    onClick={() => deliverMut.mutate()}
                    disabled={deliverMut.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {deliverMut.isPending ? <Loader2 className="animate-spin" size={16} /> : <Truck size={16} />}
                    Mark delivered
                  </button>
                )}
              </div>
            )}

            <div>
              <h2 className="text-sm font-semibold text-dark-base dark:text-white mb-2 flex items-center gap-2">
                <Package size={16} className="text-medium-green" />
                Line items
              </h2>
              <div className="overflow-x-auto border border-gray-100 dark:border-gray-800 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/80 dark:bg-gray-800/50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs text-gray-500">Product</th>
                      <th className="text-right px-3 py-2 text-xs text-gray-500">Qty</th>
                      <th className="text-right px-3 py-2 text-xs text-gray-500">Line total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {(order.items ?? []).map((i) => (
                      <tr key={String(i.orderItemId)}>
                        <td className="px-3 py-2 font-mono text-xs">{String(i.productId)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{i.quantity}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {i.lineTotal != null ? Number(i.lineTotal).toFixed(2) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {delivered && canReturn && (
            <div className="app-card p-5 border border-emerald-200/60 dark:border-emerald-900/40">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-dark-base dark:text-white flex items-center gap-2">
                    <RotateCcw size={18} className="text-medium-green" />
                    Return merchandise
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Start a return for this delivered order. You will confirm receipt, inspect condition, then choose disposition per line.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReturn((v) => !v)}
                  className="shrink-0 px-4 py-2 rounded-lg bg-brand-blue hover:bg-blue-700 text-white text-sm font-semibold"
                >
                  {showReturn ? 'Hide form' : 'Process return'}
                </button>
              </div>

              {showReturn && (
                <form onSubmit={submitReturn} className="mt-6 space-y-4 border-t border-gray-100 dark:border-gray-800 pt-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Reason *</label>
                    <input
                      required
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                      placeholder="e.g. Customer refused delivery"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500">Quantities to return (per product)</p>
                    {lines.map((l) => (
                      <div key={l.orderItemId} className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="font-mono text-xs flex-1 min-w-[200px]">{l.productId}</span>
                        <label className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs">max {l.max}</span>
                          <input
                            type="number"
                            min={1}
                            max={l.max}
                            value={l.quantity}
                            onChange={(e) => updateLine(l.orderItemId, Number(e.target.value))}
                            className="w-20 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-sm tabular-nums"
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                  {initiateReturn.isError && (
                    <p className="text-sm text-red-600">
                      {initiateReturn.error?.apiError?.message || initiateReturn.error?.message || 'Request failed'}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={initiateReturn.isPending || !reason.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold disabled:opacity-50"
                  >
                    {initiateReturn.isPending && <Loader2 className="animate-spin" size={16} />}
                    Submit return
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="app-card p-5">
            <h2 className="text-sm font-semibold text-dark-base dark:text-white mb-4 flex items-center gap-2">
              <Clock size={16} className="text-brand-blue" />
              Status timeline
            </h2>
            {timeline.length === 0 ? (
              <p className="text-xs text-gray-500">No history rows yet.</p>
            ) : (
              <ul className="space-y-0">
                {timeline.map((h, idx) => (
                  <li key={String(h.id ?? idx)} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="h-2.5 w-2.5 rounded-full bg-brand-blue mt-1.5 ring-4 ring-brand-blue/15" />
                      {idx < timeline.length - 1 && <span className="w-px flex-1 min-h-[24px] bg-gray-200 dark:bg-gray-700" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-xs font-semibold text-dark-base dark:text-white">
                        {h.fromStatus ?? '—'} → {h.toStatus}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {h.createdAt
                          ? formatDistanceToNow(new Date(h.createdAt), { addSuffix: true })
                          : ''}
                      </p>
                      {h.reason && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{h.reason}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="app-card p-5 text-sm text-gray-600 dark:text-gray-300">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Assignment</p>
            <p className="text-xs">Unassigned — staff routing is managed in the operations playbook.</p>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        <Link to="/orders/returns" className="text-medium-green hover:underline font-medium">
          View all returns
        </Link>
      </p>
    </div>
  )
}
