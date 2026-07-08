import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import useAuthStore from '../../store/authStore'
import { inventoryApi, ordersApi, warehouseApi } from '../../services/axiosInstance'
import { springPageItems } from '../../utils/apiNormalize'

const emptyLine = () => ({ id: crypto.randomUUID(), productId: '', quantity: 1, unitPrice: 0 })

/** Order service only accepts STANDARD | HIGH | URGENT (see OrderService.createOrder). */
const PRIORITY_VALUES = ['STANDARD', 'HIGH', 'URGENT']

export default function CreateOrder() {
  const navigate = useNavigate()
  const user     = useAuthStore((s) => s.user)
  const isAdmin  = useAuthStore((s) => s.isAdmin())
  const isStaff  = user?.roleName === 'WAREHOUSE_STAFF'
  const queryClient = useQueryClient()

  // Form fields ΓÇö customerId must be a UUID (see CreateOrderRequest)
  const [customerId,       setCustomerId]       = useState('')
  const [warehouseId,      setWarehouseId]      = useState(isStaff ? String(user?.warehouseId ?? '') : '')
  const [priority,         setPriority]         = useState('STANDARD')
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [notes,            setNotes]            = useState('')
  const [lines,            setLines]            = useState([emptyLine()])

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [errors,     setErrors]     = useState({})
  const [apiError,   setApiError]   = useState('')

  const { data: productData } = useQuery({
    queryKey: ['products', 'lookup'],
    queryFn: async () => {
      const response = await inventoryApi.get('/products', { params: { page: 1, limit: 200 } })
      return response.data
    },
    staleTime: 30_000,
  })

  const { data: warehouseData } = useQuery({
    queryKey: ['warehouses', 'lookup'],
    queryFn: async () => {
      const response = await warehouseApi.get('/warehouses', { params: { page: 1, limit: 200 } })
      return response.data
    },
    staleTime: 30_000,
  })

  const products = springPageItems(productData)

  const warehouses = springPageItems(warehouseData)

  useEffect(() => {
    if (user?.userId) {
      setCustomerId((c) => (c.trim() ? c : String(user.userId)))
    }
  }, [user?.userId])

  useEffect(() => {
    if (isStaff && user?.warehouseId) {
      setWarehouseId(String(user.warehouseId))
    }
  }, [isStaff, user?.warehouseId])

  const createOrder = useMutation({
    mutationFn: (payload) => ordersApi.post('/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // Running total
  const runningTotal = lines.reduce((sum, l) => sum + (Number(l.quantity) * Number(l.unitPrice)), 0)

  function updateLine(id, field, value) {
    setLines((prev) => prev.map((l) => {
      if (l.id !== id) return l
      const updated = { ...l, [field]: value }
      // Auto-fill unit price when product is selected
      if (field === 'productId') {
        const product = products.find((p) => String(p.productId) === String(value))
        updated.unitPrice = product != null ? Number(product.unitCost) : 0
      }
      if (field === 'quantity') {
        updated.quantity = Number(value)
      }
      if (field === 'unitPrice') {
        updated.unitPrice = Number(value)
      }
      return updated
    }))
  }

  function addLine()        { setLines((prev) => [...prev, emptyLine()]) }
  function removeLine(id)   { setLines((prev) => prev.filter((l) => l.id !== id)) }

  function validate() {
    const e = {}
    const cid = customerId.trim()
    if (!cid) e.customerId = 'Customer ID is required'
    if (!warehouseId) e.warehouseId = 'Select a warehouse'
    if (!PRIORITY_VALUES.includes(priority)) e.priority = 'Select a priority'
    if (lines.length === 0) e.lines = 'Add at least one item'
    lines.forEach((l, i) => {
      if (!l.productId) e[`line_${i}_product`] = 'Select a product'
      const q = Number(l.quantity)
      if (!Number.isFinite(q) || q < 1) e[`line_${i}_qty`] = 'Qty must be at least 1'
      const up = Number(l.unitPrice)
      if (!Number.isFinite(up) || up <= 0) e[`line_${i}_price`] = 'Price must be greater than 0'
    })
    return e
  }

  async function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})
    setApiError('')
    setSubmitting(true)

    const payload = {
      customerId: customerId.trim(),
      warehouseId: String(warehouseId),
      priority,
      expectedDelivery: expectedDelivery || undefined,
      notes: notes || undefined,
      items: lines.map((l) => ({
        productId: String(l.productId),
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
      })),
    }

    try {
      await createOrder.mutateAsync(payload)
      navigate('/orders')
    } catch (err) {
      console.error('Order create error:', err)
      const apiErr = err?.apiError ?? err?.response?.data
      const code = apiErr?.code
      const msg = apiErr?.message || (err?.response?.data?.details ? JSON.stringify(err.response.data.details) : null)
      if (code === 'INSUFFICIENT_STOCK') {
        setApiError('Not enough stock for one or more selected items.')
      } else if (code === 'VALIDATION_ERROR') {
        setApiError(msg || 'Validation failed. Check your inputs.')
      } else if (code === 'NOT_FOUND') {
        setApiError(msg || 'Resource not found.')
      } else if (msg) {
        setApiError(msg)
      } else {
        setApiError('Failed to create order. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/orders')}
          className="p-2 rounded-lg hover:bg-light-bg dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={18} className="text-gray-500 dark:text-gray-400" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-dark-base dark:text-white">Create Order</h2>
          <p className="text-sm text-gray-400 mt-0.5">Fill in the details below to create a new order</p>
        </div>
      </div>

      <div className="app-card p-6 space-y-5">

        {/* Customer + Warehouse row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">
              Customer ID (UUID) <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder={user?.userId ? user.userId : 'Enter customer ID'}
              className={`w-full px-3 py-2 text-sm border rounded-lg bg-light-bg dark:bg-gray-900 text-dark-base dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all
                ${errors.customerId ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
            />
            {errors.customerId && <p className="text-xs text-red-500 mt-1">{errors.customerId}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">
              Warehouse <span className="text-red-400">*</span>
            </label>
            {isStaff ? (
              <input
                type="text"
                value={warehouses.find((w) => String(w.warehouseId) === String(warehouseId))?.name ?? warehouseId}
                readOnly
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
            ) : (
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-light-bg dark:bg-gray-900 text-dark-base dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all
                  ${errors.warehouseId ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
              >
                <option value="">Select warehouse</option>
                {warehouses.map((w) => (
                  <option key={String(w.warehouseId)} value={String(w.warehouseId)}>{w.name}</option>
                ))}
              </select>
            )}
            {errors.warehouseId && <p className="text-xs text-red-500 mt-1">{errors.warehouseId}</p>}
          </div>
        </div>

        {/* Priority + Expected Delivery */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">
              Priority <span className="text-red-400">*</span>
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-light-bg dark:bg-gray-900 text-dark-base dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              <option value="STANDARD">Standard</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">
              Expected Delivery
            </label>
            <input
              type="date"
              value={expectedDelivery}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setExpectedDelivery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-light-bg dark:bg-gray-900 text-dark-base dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes for this order..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-light-bg dark:bg-gray-900 text-dark-base dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
          />
        </div>

        {/* Line items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Line Items <span className="text-red-400">*</span>
            </label>
            <button
              onClick={addLine}
              className="flex items-center gap-1.5 text-xs font-medium text-medium-green hover:text-deep-green transition-colors"
            >
              <Plus size={13} /> Add Line
            </button>
          </div>

          {errors.lines && <p className="text-xs text-red-500 mb-2">{errors.lines}</p>}

          <div className="space-y-2">
            {/* Column headers */}
            <div className="grid grid-cols-12 gap-2 px-1">
              <span className="col-span-5 text-xs text-gray-400">Product</span>
              <span className="col-span-2 text-xs text-gray-400">Qty</span>
              <span className="col-span-3 text-xs text-gray-400">Unit Price (GHS)</span>
              <span className="col-span-1 text-xs text-gray-400 text-right">Total</span>
              <span className="col-span-1" />
            </div>

            {lines.map((line, i) => {
              const lineTotal = Number(line.quantity) * Number(line.unitPrice)
              return (
                <div key={line.id} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5">
                    <select
                      value={line.productId}
                      onChange={(e) => updateLine(line.id, 'productId', e.target.value)}
                      className={`w-full px-2 py-2 text-sm border rounded-lg bg-light-bg dark:bg-gray-900 text-dark-base dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all
                        ${errors[`line_${i}_product`] ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
                    >
                      <option value="">Select product</option>
                      {products.map((p) => (
                        <option key={String(p.productId)} value={String(p.productId)}>{p.name}</option>
                      ))}
                    </select>
                    {errors[`line_${i}_product`] && (
                      <p className="text-xs text-red-500 mt-0.5">{errors[`line_${i}_product`]}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.id, 'quantity', e.target.value)}
                      className={`w-full px-2 py-2 text-sm border rounded-lg bg-light-bg dark:bg-gray-900 text-dark-base dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all
                        ${errors[`line_${i}_qty`] ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(line.id, 'unitPrice', e.target.value)}
                      className={`w-full px-2 py-2 text-sm border rounded-lg bg-light-bg dark:bg-gray-900 text-dark-base dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all
                        ${errors[`line_${i}_price`] ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
                    />
                  </div>
                  <div className="col-span-1 text-right pt-2">
                    <span className="text-xs font-semibold text-dark-base dark:text-white">
                      {lineTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="col-span-1 flex justify-end pt-1.5">
                    {lines.length > 1 && (
                      <button
                        onClick={() => removeLine(line.id)}
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Running total */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-0.5">Running Total</p>
              <p className="text-xl font-bold text-dark-base dark:text-white">
                GHS {runningTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* API error */}
        {apiError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/40">
            <AlertTriangle size={15} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-300">{apiError}</p>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => navigate('/orders')}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-light-bg dark:hover:bg-gray-700 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-lg bg-brand-blue hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? 'Creating...' : 'Create Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
