import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, MapPin, Plus, X } from 'lucide-react'
import { warehouseApi } from '../../services/axiosInstance'
import { springPageItems } from '../../utils/apiNormalize'

function OccupancyBar({ current, max }) {
  const cap = Math.max(Number(max) || 0, 1)
  const pct = Math.min(100, Math.round(((Number(current) || 0) / cap) * 100))
  const tone = pct >= 95 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : pct >= 40 ? 'bg-brand-blue' : 'bg-emerald-400'
  return (
    <div className="flex flex-col items-end gap-1 min-w-[120px]">
      <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-600 dark:text-gray-300">{current} / {max} ({pct}%)</span>
    </div>
  )
}

export default function Locations() {
  const queryClient = useQueryClient()
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses', 'locations'],
    queryFn: async () => {
      const r = await warehouseApi.get('/warehouses', { params: { page: 1, limit: 200 } })
      return springPageItems(r.data)
    },
    staleTime: 60_000,
  })

  const list = warehouses ?? []
  const [warehouseId, setWarehouseId] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const firstId = list[0]?.warehouseId
  const effectiveWid = warehouseId || firstId

  const { data: locations, isLoading, isError, refetch } = useQuery({
    queryKey: ['locations', effectiveWid],
    queryFn: async () => {
      const r = await warehouseApi.get('/locations', { params: { warehouseId: effectiveWid } })
      return Array.isArray(r.data) ? r.data : []
    },
    enabled: Boolean(effectiveWid),
    staleTime: 30_000,
  })

  const rows = locations ?? []
  const whName = useMemo(() => list.find((w) => String(w.warehouseId) === String(effectiveWid))?.name, [list, effectiveWid])

  const [locForm, setLocForm] = useState({
    locationId: '',
    zone: 'A',
    aisle: '01',
    shelf: '01',
    bin: '01',
    locationType: 'PICK',
    maxCapacity: 100,
  })
  const [idError, setIdError] = useState('')

  const validateLocationId = (value) => {
    const digits = value.replace(/[^0-9]/g, '')
    if (value && value.includes('-')) {
      setIdError('Use digits only (no dashes)')
      return false
    }
    if (digits.length > 0 && digits.length < 8) {
      setIdError('Minimum 8 digits required')
      return false
    }
    setIdError('')
    return true
  }

  const createLocation = useMutation({
    mutationFn: async () => {
      const payload = {
        zone: locForm.zone.trim() || 'A',
        aisle: locForm.aisle.trim() || '01',
        shelf: locForm.shelf.trim() || '01',
        bin: locForm.bin.trim() || '01',
        locationType: locForm.locationType.trim() || 'PICK',
        maxCapacity: Math.max(1, Number(locForm.maxCapacity) || 100),
        locationId: locForm.locationId.trim() || null,
      }
      const res = await warehouseApi.post(`/locations/${effectiveWid}`, payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', effectiveWid] })
      setShowCreate(false)
      setLocForm({ locationId: '', zone: 'A', aisle: '01', shelf: '01', bin: '01', locationType: 'PICK', maxCapacity: 100 })
    },
  })

  return (
    <div className="space-y-5">
      <div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-dark-base dark:text-white">Storage locations</h1>
            <p className="text-sm text-gray-500 mt-0.5">Bins and zones per warehouse ({whName ?? '—'})</p>
          </div>
          {effectiveWid && (
            <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-blue text-white rounded text-sm hover:bg-blue-700">
              <Plus size={16} /> Add
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm text-gray-600 dark:text-gray-400">Warehouse</label>
        <select value={effectiveWid ? String(effectiveWid) : ''} onChange={(e) => setWarehouseId(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-dark-base dark:text-white">
          {list.map((w) => (
            <option key={w.warehouseId} value={String(w.warehouseId)}>{w.name}</option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="app-card p-12 flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-medium-green" size={28} />
          <p className="text-sm text-gray-500">Loading locations…</p>
        </div>
      )}

      {isError && (
        <div className="app-card p-6 border-red-200 text-red-600 text-sm">
          Failed to load locations.{' '}
          <button type="button" onClick={() => refetch()} className="underline font-medium">Retry</button>
        </div>
      )}

      {!isLoading && !isError && !list.length && (
        <div className="app-card p-6 flex flex-col items-center gap-3">
          <MapPin size={32} className="text-gray-300" />
          <p className="text-gray-500 text-center">No warehouses found. Create a warehouse first to add locations.</p>
        </div>
      )}

      {showCreate && (
        <div className="app-card p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium">Add Storage Location</h3>
            <button type="button" onClick={() => setShowCreate(false)}><X size={16} /></button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input
              value={locForm.locationId}
              onChange={(e) => { setLocForm((prev) => ({ ...prev, locationId: e.target.value })); validateLocationId(e.target.value) }}
              placeholder="Custom ID (8+ digits)"
              className="col-span-3 px-3 py-2 border rounded font-mono text-sm"
            />
            {idError && <p className="col-span-3 text-red-500 text-sm">{idError}</p>}
            <input value={locForm.zone} onChange={(e) => setLocForm((prev) => ({ ...prev, zone: e.target.value }))} placeholder="Zone (A)" className="px-3 py-2 border rounded" />
            <input value={locForm.aisle} onChange={(e) => setLocForm((prev) => ({ ...prev, aisle: e.target.value }))} placeholder="Aisle (01)" className="px-3 py-2 border rounded" />
            <input value={locForm.shelf} onChange={(e) => setLocForm((prev) => ({ ...prev, shelf: e.target.value }))} placeholder="Shelf" className="px-3 py-2 border rounded" />
            <input value={locForm.bin} onChange={(e) => setLocForm((prev) => ({ ...prev, bin: e.target.value }))} placeholder="Bin" className="px-3 py-2 border rounded" />
            <select value={locForm.locationType} onChange={(e) => setLocForm((prev) => ({ ...prev, locationType: e.target.value }))} className="px-3 py-2 border rounded">
              <option value="PICK">PICK</option>
              <option value="BULK">BULK</option>
              <option value="OVERFLOW">OVERFLOW</option>
              <option value="QUARANTINE">QUARANTINE</option>
            </select>
            <input type="number" value={locForm.maxCapacity} onChange={(e) => setLocForm((prev) => ({ ...prev, maxCapacity: Number(e.target.value) }))} placeholder="Capacity" className="px-3 py-2 border rounded" />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={() => createLocation.mutate()} disabled={createLocation.isPending} className="px-4 py-2 bg-brand-blue text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {createLocation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : 'Save'}
            </button>
          </div>
        </div>
      )}

      {!isLoading && !isError && list.length > 0 && (
        <div className="app-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Zone / Aisle</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase min-w-[140px]">Occupancy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {rows.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">No locations for this warehouse</td></tr>
                ) : (
                  rows.map((loc) => (
                    <tr key={loc.locationId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-200">
                        <span className="inline-flex items-center gap-2"><MapPin size={12} className="text-medium-green" />{loc.locationCode ?? String(loc.locationId).slice(0, 8)}…</span>
                      </td>
                      <td className="px-4 py-3">{[loc.zone, loc.aisle, loc.shelf, loc.bin].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{loc.locationType ?? '—'}</td>
                      <td className="px-4 py-3 text-right"><OccupancyBar current={loc.currentOccupancy ?? 0} max={loc.maxCapacity ?? 0} /></td>
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