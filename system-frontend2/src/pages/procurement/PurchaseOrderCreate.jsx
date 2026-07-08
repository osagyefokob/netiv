import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { inventoryApi, procurementApi, warehouseApi } from '../../services/axiosInstance'
import { springPageItems } from '../../utils/apiNormalize'

const emptyLine = () => ({ id: crypto.randomUUID(), productId: '', quantityOrdered: 1, unitCost: '0' })

export default function PurchaseOrderCreate() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [searchParams] = useSearchParams()

  const preProductId = searchParams.get('productId')
  const preSupplierId = searchParams.get('supplierId')
  const preQty = searchParams.get('quantity')

  const [supplierId, setSupplierId] = useState(preSupplierId || '')
  const [warehouseId, setWarehouseId] = useState('')
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([emptyLine()])

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', 'lookup'],
    queryFn: async () => {
      const r = await procurementApi.get('/suppliers', { params: { page: 1, limit: 200 } })
      return springPageItems(r.data)
    },
  })
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses', 'lookup-po'],
    queryFn: async () => {
      const r = await warehouseApi.get('/warehouses', { params: { page: 1, limit: 200 } })
      return springPageItems(r.data)
    },
  })
  const { data: productsData } = useQuery({
    queryKey: ['products', 'lookup-po'],
    queryFn: async () => {
      const r = await inventoryApi.get('/products', { params: { page: 1, limit: 500 } })
      return springPageItems(r.data)
    },
  })

  const suppliers = suppliersData ?? []
  const warehouses = warehousesData ?? []
  const products = productsData ?? []

  const productById = useMemo(() => {
    const m = new Map()
    products.forEach((p) => m.set(String(p.productId), p))
    return m
  }, [products])

  useEffect(() => {
    if (warehouses.length && !warehouseId) {
      setWarehouseId(String(warehouses[0].warehouseId))
    }
  }, [warehouses, warehouseId])

  useEffect(() => {
    if (preProductId && preQty && products.length) {
      const p = productById.get(String(preProductId))
      const cost = p?.unitCost != null ? String(p.unitCost) : '0'
      setLines([
        {
          id: crypto.randomUUID(),
          productId: String(preProductId),
          quantityOrdered: Math.max(1, parseInt(preQty, 10) || 1),
          unitCost: cost,
        },
      ])
    }
  }, [preProductId, preQty, products.length, productById])

  useEffect(() => {
    if (preSupplierId && !supplierId) {
      setSupplierId(String(preSupplierId))
    }
  }, [preSupplierId, supplierId])

  const createPo = useMutation({
    mutationFn: (payload) => procurementApi.post('/purchase-orders', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      navigate(`/procurement/purchase-orders/${res.data.purchaseOrderId}`)
    },
  })

  function updateLine(id, field, value) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l
        const u = { ...l, [field]: value }
        if (field === 'productId') {
          const p = productById.get(String(value))
          u.unitCost = p != null ? String(p.unitCost ?? 0) : '0'
        }
        return u
      })
    )
  }

  function submit(e) {
    e.preventDefault()
    if (!user?.userId || !supplierId || !warehouseId) return
    const items = lines
      .filter((l) => l.productId)
      .map((l) => ({
        productId: l.productId,
        quantityOrdered: Number(l.quantityOrdered),
        unitCost: Number(l.unitCost),
      }))
    if (items.length === 0) return
    createPo.mutate({
      supplierId,
      warehouseId,
      createdBy: user.userId,
      expectedDelivery: expectedDelivery || undefined,
      notes: notes || undefined,
      items,
    })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/procurement/purchase-orders"
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-dark-base dark:text-white">Create purchase order</h1>
          <p className="text-sm text-gray-500">Lines inherit unit cost from the catalog when you pick a product.</p>
        </div>
      </div>

      <form onSubmit={submit} className="app-card p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Supplier *</label>
            <select
              required
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            >
              <option value="">Select supplier</option>
              {suppliers.map((s) => (
                <option key={s.supplierId} value={s.supplierId}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Warehouse *</label>
            <select
              required
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            >
              <option value="">Select warehouse</option>
              {warehouses.map((w) => (
                <option key={w.warehouseId} value={w.warehouseId}>
                  {w.name || w.warehouseId}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Expected delivery</label>
            <input
              type="date"
              value={expectedDelivery}
              onChange={(e) => setExpectedDelivery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-dark-base dark:text-white">Line items</h2>
            <button
              type="button"
              onClick={() => setLines((p) => [...p, emptyLine()])}
              className="inline-flex items-center gap-1 text-xs font-medium text-medium-green hover:underline"
            >
              <Plus size={14} /> Add line
            </button>
          </div>
          {lines.map((line) => (
            <div key={line.id} className="flex flex-wrap gap-2 items-end border border-gray-100 dark:border-gray-800 rounded-lg p-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] text-gray-500 mb-0.5">Product</label>
                <select
                  value={line.productId}
                  onChange={(e) => updateLine(line.id, 'productId', e.target.value)}
                  className="w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs font-mono"
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p.productId} value={p.productId}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="block text-[10px] text-gray-500 mb-0.5">Qty</label>
                <input
                  type="number"
                  min={1}
                  value={line.quantityOrdered}
                  onChange={(e) => updateLine(line.id, 'quantityOrdered', Number(e.target.value))}
                  className="w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs tabular-nums"
                />
              </div>
              <div className="w-28">
                <label className="block text-[10px] text-gray-500 mb-0.5">Unit cost</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.unitCost}
                  onChange={(e) => updateLine(line.id, 'unitCost', e.target.value)}
                  className="w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs tabular-nums"
                />
              </div>
              <button
                type="button"
                onClick={() => setLines((p) => p.filter((l) => l.id !== line.id))}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {createPo.isError && (
          <p className="text-sm text-red-600">{createPo.error?.apiError?.message || createPo.error?.message}</p>
        )}

        <button
          type="submit"
          disabled={createPo.isPending}
          className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-blue hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
        >
          {createPo.isPending && <Loader2 className="animate-spin" size={16} />}
          Create PO
        </button>
      </form>
    </div>
  )
}
