import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, MapPin, Package, Pencil, Plus, Save, X } from 'lucide-react'
import { warehouseApi } from '../../services/axiosInstance'
import { springPageItems } from '../../utils/apiNormalize'

export default function Warehouses() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['warehouses', 'page'],
    queryFn: async () => {
      const r = await warehouseApi.get('/warehouses', { params: { page: 1, limit: 100 } })
      return springPageItems(r.data)
    },
    staleTime: 30_000,
  })

  const [showCreate, setShowCreate] = useState(false)
  const rows = data ?? []
  const [editingId, setEditingId] = useState('')
  const [form, setForm] = useState({
    name: '',
    street: '',
    city: '',
    country: '',
    type: '',
    capacity: 1,
  })

  const updateWarehouse = useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await warehouseApi.put(`/warehouses/${id}`, payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      setEditingId('')
    },
  })

  const createWarehouse = useMutation({
    mutationFn: async (payload) => {
      const res = await warehouseApi.post('/warehouses', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      setShowCreate(false)
      setForm({ name: '', street: '', city: '', country: '', type: '', capacity: 1 })
    },
  })

  function startEdit(w) {
    setEditingId(String(w.warehouseId))
    setForm({
      name: w.name ?? '',
      street: w.street ?? '',
      city: w.city ?? '',
      country: w.country ?? '',
      type: w.type ?? '',
      capacity: Number(w.capacity ?? 1),
    })
  }

  function cancelEdit() {
    setEditingId('')
  }

  async function saveEdit() {
    if (!editingId) return
    await updateWarehouse.mutateAsync({
      id: editingId,
      payload: {
        name: form.name.trim(),
        street: form.street.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        type: form.type.trim(),
        capacity: Math.max(1, Number(form.capacity) || 1),
      },
    })
  }

  async function saveCreate() {
    await createWarehouse.mutateAsync({
      name: form.name.trim(),
      street: form.street.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      type: form.type.trim() || 'MAIN',
      capacity: Math.max(1, Number(form.capacity) || 1),
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-dark-base dark:text-white">Warehouses</h1>
            <p className="text-sm text-gray-500 mt-0.5">Sites and capacity from the warehouse service</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-blue text-white rounded text-sm hover:bg-blue-700"
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {rows.length === 0 && !isLoading && (
        <div className="app-card p-6 flex flex-col items-center gap-3">
          <MapPin size={32} className="text-gray-300" />
          <p className="text-gray-500 text-center">No warehouses found. Add your first warehouse to get started.</p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded hover:bg-blue-700"
          >
            <Plus size={16} /> Add Warehouse
          </button>
        </div>
      )}

      {showCreate && (
        <div className="app-card p-4">
          <h3 className="font-medium mb-3">Add New Warehouse</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Warehouse Name *"
              className="col-span-2 px-3 py-2 border rounded"
            />
            <input
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              placeholder="Type (e.g. MAIN, SATELLITE)"
              className="px-3 py-2 border rounded"
            />
            <input
              type="number"
              value={form.capacity}
              onChange={(e) => setForm((prev) => ({ ...prev, capacity: Number(e.target.value) }))}
              placeholder="Capacity"
              className="px-3 py-2 border rounded"
            />
            <input
              value={form.street}
              onChange={(e) => setForm((prev) => ({ ...prev, street: e.target.value }))}
              placeholder="Street Address"
              className="col-span-2 px-3 py-2 border rounded"
            />
            <input
              value={form.city}
              onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              placeholder="City"
              className="px-3 py-2 border rounded"
            />
            <input
              value={form.country}
              onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
              placeholder="Country"
              className="px-3 py-2 border rounded"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveCreate}
              disabled={!form.name.trim() || createWarehouse.isPending}
              className="px-4 py-2 bg-brand-blue text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {createWarehouse.isPending ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="app-card p-12 flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-medium-green" size={28} />
          <p className="text-sm text-gray-500">Loading warehouses…</p>
        </div>
      )}

      {isError && (
        <div className="app-card p-6 border-red-200 text-red-600 text-sm">
          Failed to load warehouses.{' '}
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Capacity</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                      No warehouses found
                    </td>
                  </tr>
                ) : (
                  rows.map((w) => (
                    <tr key={w.warehouseId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-medium text-dark-base dark:text-white">
                        {editingId === String(w.warehouseId) ? (
                          <input
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white dark:bg-gray-900 dark:border-gray-700"
                          />
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <Package size={14} className="text-medium-green shrink-0" />
                            {w.name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {editingId === String(w.warehouseId) ? (
                          <input
                            value={form.type}
                            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white dark:bg-gray-900 dark:border-gray-700"
                          />
                        ) : (
                          w.type ?? '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {editingId === String(w.warehouseId) ? (
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              value={form.city}
                              onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                              placeholder="City"
                              className="px-2 py-1 text-sm border border-gray-300 rounded bg-white dark:bg-gray-900 dark:border-gray-700"
                            />
                            <input
                              value={form.country}
                              onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                              placeholder="Country"
                              className="px-2 py-1 text-sm border border-gray-300 rounded bg-white dark:bg-gray-900 dark:border-gray-700"
                            />
                            <input
                              value={form.street}
                              onChange={(e) => setForm((prev) => ({ ...prev, street: e.target.value }))}
                              placeholder="Street"
                              className="col-span-2 px-2 py-1 text-sm border border-gray-300 rounded bg-white dark:bg-gray-900 dark:border-gray-700"
                            />
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} className="opacity-50" />
                            {[w.city, w.country].filter(Boolean).join(', ') || '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {editingId === String(w.warehouseId) ? (
                          <input
                            type="number"
                            min="1"
                            value={form.capacity}
                            onChange={(e) => setForm((prev) => ({ ...prev, capacity: Number(e.target.value) }))}
                            className="w-24 ml-auto px-2 py-1 text-sm border border-gray-300 rounded bg-white dark:bg-gray-900 dark:border-gray-700"
                          />
                        ) : (
                          w.capacity ?? 0
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-between">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              w.isActive !== false ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40' : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {w.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                          {editingId === String(w.warehouseId) ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={saveEdit}
                                disabled={updateWarehouse.isPending}
                                className="p-1.5 rounded border border-emerald-200 text-emerald-600 hover:bg-emerald-50 disabled:opacity-60"
                              >
                                <Save size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={updateWarehouse.isPending}
                                className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-60"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEdit(w)}
                              className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                        </div>
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
