import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Factory, Plus, X } from 'lucide-react'
import { procurementApi } from '../../services/axiosInstance'
import { springPageItems } from '../../utils/apiNormalize'

const emptyForm = () => ({
  name: '',
  contactEmail: '',
  contactPhone: '',
  street: '',
  city: '',
  country: '',
  leadTimeDays: 7,
  paymentTerms: 'NET_30',
  rating: null,
})

export default function Suppliers() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const r = await procurementApi.get('/suppliers', { params: { page: 1, limit: 200 } })
      return springPageItems(r.data)
    },
    staleTime: 60_000,
  })

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const r = await procurementApi.post('/suppliers', payload)
      return r.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setShowCreate(false)
      setForm(emptyForm())
      setError('')
    },
    onError: (err) => {
      setError(err?.response?.data?.message || err?.message || 'Failed to create supplier')
    },
  })

  const rows = data ?? []

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Supplier name is required')
      return
    }
    setError('')
    setSubmitting(true)
    createMutation.mutate(form, {
      onSettled: () => setSubmitting(false),
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-dark-base dark:text-white">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vendor directory from procurement service</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-blue text-white rounded text-sm hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {showCreate && (
        <div className="app-card p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-dark-base dark:text-white">Add New Supplier</h3>
            <button type="button" onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <X size={16} />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Supplier Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Ghana Agro Supplies Ltd"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark-base dark:text-white"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Email</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
                placeholder="contact@supplier.com"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark-base dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Phone</label>
              <input
                value={form.contactPhone}
                onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))}
                placeholder="+233 XX XXX XXXX"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark-base dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Lead Time (days)</label>
              <input
                type="number"
                min="1"
                value={form.leadTimeDays}
                onChange={(e) => setForm((p) => ({ ...p, leadTimeDays: parseInt(e.target.value) || 7 }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark-base dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">City</label>
              <input
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                placeholder="Accra"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark-base dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Country</label>
              <input
                value={form.country}
                onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                placeholder="Ghana"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark-base dark:text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Street Address</label>
              <input
                value={form.street}
                onChange={(e) => setForm((p) => ({ ...p, street: e.target.value }))}
                placeholder="Industrial Area, Plot 42"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark-base dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Payment Terms</label>
              <select
                value={form.paymentTerms}
                onChange={(e) => setForm((p) => ({ ...p, paymentTerms: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark-base dark:text-white"
              >
                <option value="NET_30">NET 30</option>
                <option value="NET_60">NET 60</option>
                <option value="NET_90">NET 90</option>
                <option value="COD">Cash on Delivery</option>
                <option value="PREPAID">Prepaid</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-brand-blue text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting ? 'Creating...' : 'Create Supplier'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading && (
        <div className="app-card p-12 flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-brand-blue" size={28} />
          <p className="text-sm text-gray-500">Loading suppliers…</p>
        </div>
      )}

      {isError && (
        <div className="app-card p-6 border-red-200 text-red-600 text-sm">
          Failed to load suppliers.{' '}
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">City</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Lead (d)</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                      No suppliers
                    </td>
                  </tr>
                ) : (
                  rows.map((s) => (
                    <tr key={s.supplierId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-medium text-dark-base dark:text-white">
                        <span className="inline-flex items-center gap-2">
                          <Factory size={14} className="text-brand-blue shrink-0" />
                          {s.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.contactEmail ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.city ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.leadTimeDays ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            s.active !== false ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {s.active !== false ? 'Active' : 'Inactive'}
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
    </div>
  )
}