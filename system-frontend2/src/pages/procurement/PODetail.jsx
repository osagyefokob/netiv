import { Link, useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, FileText, Send } from 'lucide-react'
import { procurementApi } from '../../services/axiosInstance'
import StatusBadge from '../../components/ui/StatusBadge'

export default function PODetail() {
  const { poId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: po, isLoading, isError, refetch } = useQuery({
    queryKey: ['purchase-order', poId],
    queryFn: async () => {
      const r = await procurementApi.get(`/purchase-orders/${poId}`)
      return r.data
    },
    enabled: Boolean(poId),
  })

  const submitMut = useMutation({
    mutationFn: () => procurementApi.post(`/purchase-orders/${poId}/submit`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <Loader2 className="animate-spin text-medium-green" size={32} />
        <p className="text-sm text-gray-500">Loading PO…</p>
      </div>
    )
  }

  if (isError || !po) {
    return (
      <div className="app-card p-6 border-red-200 text-red-600 text-sm">
        Could not load purchase order.{' '}
        <button type="button" onClick={() => refetch()} className="underline font-medium">
          Retry
        </button>
      </div>
    )
  }

  const overdue =
    po.expectedDelivery &&
    !['COMPLETED', 'CANCELLED'].includes(String(po.status)) &&
    new Date(po.expectedDelivery) < new Date().setHours(0, 0, 0, 0)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/procurement/purchase-orders')}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-dark-base dark:text-white flex items-center gap-2">
            <FileText className="text-medium-green" size={22} />
            Purchase order
          </h1>
          <p className="text-xs font-mono text-gray-500">{String(po.purchaseOrderId)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 app-card p-5 space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <StatusBadge status={po.status} />
            {overdue && (
              <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                Overdue · expected {po.expectedDelivery}
              </span>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase">Supplier</p>
              <p className="font-mono text-xs">{String(po.supplierId)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Warehouse</p>
              <p className="font-mono text-xs">{String(po.warehouseId)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Total</p>
              <p className="tabular-nums font-semibold">
                {po.totalAmount != null ? Number(po.totalAmount).toFixed(2) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Expected delivery</p>
              <p>{po.expectedDelivery ?? '—'}</p>
            </div>
          </div>
          {po.notes && <p className="text-sm text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-800 pt-3">{po.notes}</p>}

          <div className="overflow-x-auto border border-gray-100 dark:border-gray-800 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 dark:bg-gray-800/50">
                <tr>
                  <th className="text-left px-3 py-2 text-xs text-gray-500">Product</th>
                  <th className="text-right px-3 py-2 text-xs text-gray-500">Ordered</th>
                  <th className="text-right px-3 py-2 text-xs text-gray-500">Received</th>
                  <th className="text-right px-3 py-2 text-xs text-gray-500">Unit cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {(po.items ?? []).map((it) => (
                  <tr key={String(it.poItemId ?? it.productId)}>
                    <td className="px-3 py-2 font-mono text-xs">{String(it.productId)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.quantityOrdered}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span className="font-medium">{it.quantityReceived ?? 0}</span>
                      <span className="text-gray-400"> / {it.quantityOrdered}</span>
                      <div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div
                          className="h-full bg-medium-green rounded-full"
                          style={{
                            width: `${Math.min(100, ((it.quantityReceived ?? 0) / Math.max(1, it.quantityOrdered)) * 100)}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.unitCost != null ? Number(it.unitCost).toFixed(2) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="app-card p-5 space-y-3 h-fit">
          <h2 className="text-sm font-semibold text-dark-base dark:text-white">Actions</h2>
          {po.status === 'DRAFTED' && (
            <button
              type="button"
              onClick={() => submitMut.mutate()}
              disabled={submitMut.isPending}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold disabled:opacity-50"
            >
              {submitMut.isPending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              Submit PO
            </button>
          )}
          <Link
            to="/procurement/purchase-orders"
            className="block text-center text-sm text-medium-green hover:underline"
          >
            Back to list
          </Link>
        </div>
      </div>
    </div>
  )
}
