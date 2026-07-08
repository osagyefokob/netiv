import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, RefreshCw, Loader2, TrendingDown, Package, ShoppingCart, Search, CheckSquare, Square, XCircle, BarChart2 } from 'lucide-react'
import { useQuery, useQueries } from '@tanstack/react-query'
import useAuthStore from '../../store/authStore'
import { inventoryApi, warehouseApi } from '../../services/axiosInstance'
import { springPageItems } from '../../utils/apiNormalize'
import { enrichLowStockRow, buildProductLookup, buildWarehouseLookup } from '../../utils/enrichInventory'

const SORT_OPTIONS = [
  { value: 'qty',  label: 'Lowest qty first' },
  { value: 'pct',  label: 'Worst % first'    },
  { value: 'name', label: 'Name A–Z'         },
]

// ── severity helper ──
function getSeverity(item) {
  const rt = item.reorderThreshold ?? 0
  if (item.quantityAvailable === 0) return 'out'
  if (rt <= 0) return 'low'
  if (item.quantityAvailable / rt <= 0.3) return 'critical'
  return 'low'
}

// ── per-severity style maps ──
const SEVERITY_STYLES = {
  out: {
    row:       'border-l-4 border-l-red-500',
    iconWrap:  'bg-red-100 dark:bg-red-900/30',
    icon:      'text-red-500',
    badge:     'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    bar:       'bg-red-500',
    label:     'Out of stock',
    qty:       'text-red-600 dark:text-red-400',
  },
  critical: {
    row:       'border-l-4 border-l-amber-500',
    iconWrap:  'bg-amber-100 dark:bg-amber-900/30',
    icon:      'text-amber-500',
    badge:     'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    bar:       'bg-amber-400',
    label:     'Critical',
    qty:       'text-amber-600 dark:text-amber-400',
  },
  low: {
    row:       'border-l-4 border-l-yellow-400',
    iconWrap:  'bg-yellow-100 dark:bg-yellow-900/30',
    icon:      'text-yellow-500',
    badge:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    bar:       'bg-yellow-400',
    label:     'Low',
    qty:       'text-yellow-600 dark:text-yellow-500',
  },
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

// Warning banner — shown when any item is out of stock
function WarningBanner({ count }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-3 bg-[#091413] border border-[#285A48] rounded-xl px-4 py-3 text-sm text-[#B0E4CC] animate-pulse-once">
      <AlertTriangle size={16} className="flex-shrink-0 text-[#B0E4CC]" />
      <span>
        <span className="font-semibold">{count} item{count > 1 ? 's are' : ' is'} completely out of stock</span>
        {' '}— immediate reorder required.
      </span>
    </div>
  )
}

// Summary pill cards
function SummaryPills({ items }) {
  const out      = items.filter(i => getSeverity(i) === 'out').length
  const critical = items.filter(i => getSeverity(i) === 'critical').length
  const low      = items.filter(i => getSeverity(i) === 'low').length

  const pills = [
    {
  label: 'Out of stock',
  count: out,
  bg:    'bg-[#1a0a0a] dark:bg-[#1a0a0a]',
  hover: 'hover:bg-[#2a0f0f] hover:-translate-y-0.5',
  border:'border-[#7f1d1d]',
  text:  'text-[#fca5a5]',
  icon:  <XCircle size={18} />,
},
{
  label: 'Critical',
  count: critical,
  bg:    'bg-[#1c1000] dark:bg-[#1c1000]',
  hover: 'hover:bg-[#2a1800] hover:-translate-y-0.5',
  border:'border-[#92400e]',
  text:  'text-[#fcd34d]',
  icon:  <AlertTriangle size={18} />,
},
{
  label: 'Low',
  count: low,
  bg:    'bg-[#091413] dark:bg-[#091413]',
  hover: 'hover:bg-[#0f2320] hover:-translate-y-0.5',
  border:'border-[#285A48]',
  text:  'text-[#B0E4CC]',
  icon:  <TrendingDown size={18} />,
},
{
  label: 'Total alerts',
  count: items.length,
  bg:    'bg-[#091413] dark:bg-[#091413]',
  hover: 'hover:bg-[#0f2320] hover:-translate-y-0.5',
  border:'border-[#408A71]',
  text:  'text-[#B0E4CC]',
  icon:  <Package size={18} />,
},
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {pills.map(p => (
        <div
          key={p.label}
          className={`${p.bg} ${p.hover} ${p.border} border rounded-xl p-4 transition-all duration-200 cursor-default select-none`}
        >
          <div className={`flex items-center justify-between mb-1 ${p.text}`}>
            <span className="text-2xl font-bold">{p.count}</span>
            {p.icon}
          </div>
          <p className={`text-xs font-medium ${p.text} opacity-80`}>{p.label}</p>
        </div>
      ))}
    </div>
  )
}

// Horizontal bar chart
function StockChart({ items }) {
  const [tip, setTip] = useState(null)
  if (!items.length) return null
  const maxThreshold = Math.max(...items.map(i => i.reorderThreshold))
  const sorted = [...items].sort((a, b) => a.quantityAvailable - b.quantityAvailable)

  return (
    <div
      className="app-card p-5 relative"
      onMouseLeave={() => setTip(null)}
    >
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={15} className="text-[#408A71]" />
        <h3 className="text-sm font-semibold text-dark-base dark:text-white">Stock level vs reorder threshold</h3>
      </div>
      <div className="space-y-3">
        {sorted.map(item => {
          const sev       = getSeverity(item)
          const styles    = SEVERITY_STYLES[sev]
          const pct       = Math.min((item.quantityAvailable / item.reorderThreshold) * 100, 100)
          const threshPct = Math.min((item.reorderThreshold / maxThreshold) * 100, 100)

          return (
            <div
              key={item.sku}
              className="flex items-center gap-3 group"
              onMouseEnter={(e) => {
                let left = e.clientX + 12
                let top = e.clientY - 48
                if (left + 240 > window.innerWidth - 8) left = e.clientX - 252
                if (top < 8) top = e.clientY + 16
                setTip({
                  name: item.name,
                  sku: item.sku,
                  available: item.quantityAvailable,
                  threshold: item.reorderThreshold,
                  pct: Math.round(pct),
                  x: left,
                  y: top,
                })
              }}
              onMouseMove={(e) => {
                let left = e.clientX + 12
                let top = e.clientY - 48
                if (left + 240 > window.innerWidth - 8) left = e.clientX - 252
                if (top < 8) top = e.clientY + 16
                setTip((t) =>
                  t && t.sku === item.sku
                    ? { ...t, x: left, y: top }
                    : t
                )
              }}
            >
              <span
                className="text-xs text-gray-500 dark:text-gray-400 w-36 flex-shrink-0 truncate"
                title={item.name}
              >
                {item.name}
              </span>
              <div className="flex-1 relative h-5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden cursor-default">
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-gray-400/40 dark:bg-gray-500/60 z-10 pointer-events-none"
                  style={{ left: `${threshPct}%` }}
                />
                <div
                  className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`text-xs font-semibold w-6 text-right flex-shrink-0 ${styles.qty}`}>
                {item.quantityAvailable}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-600 w-10 flex-shrink-0">
                /{item.reorderThreshold}
              </span>
            </div>
          )
        })}
      </div>
      {tip && (
        <div
          className="fixed z-50 app-card px-3 py-2.5 text-xs pointer-events-none shadow-lg max-w-[min(260px,calc(100vw-24px))]"
          style={{ left: tip.x, top: tip.y }}
        >
          <p className="font-semibold text-dark-base truncate" title={tip.name}>{tip.name}</p>
          <p className="text-gray-500 text-[11px] mt-0.5">{tip.sku}</p>
          <p className="text-gray-700 mt-1.5">
            Available: <span className="font-bold tabular-nums">{tip.available}</span>
            {' · '}
            Reorder at: <span className="font-bold tabular-nums">{tip.threshold}</span>
          </p>
          <p className="text-gray-500 mt-0.5">{tip.pct}% of threshold</p>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-3">
        <span className="inline-block w-2 h-2 bg-gray-400/40 rounded-full mr-1" />
        Vertical line = reorder threshold · hover a row for exact values
      </p>
    </div>
  )
}

// Bulk actions bar
function BulkBar({ selected, onCreatePOs, onClear }) {
  if (selected.size === 0) return null
  return (
    <div className="flex items-center gap-3 bg-[#091413] dark:bg-[#285A48]/30 text-white rounded-xl px-4 py-2.5 text-sm animate-in slide-in-from-top-1">
      <CheckSquare size={15} className="text-[#B0E4CC]" />
      <span className="text-[#B0E4CC] font-semibold">{selected.size}</span>
      <span className="text-gray-300">item{selected.size > 1 ? 's' : ''} selected</span>
      <div className="ml-auto flex gap-2">
        <button
          onClick={onCreatePOs}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-blue hover:bg-blue-700 text-white rounded-lg transition-all duration-150"
        >
          <ShoppingCart size={12} /> Create POs
        </button>
        <button
          onClick={onClear}
          className="px-3 py-1.5 text-xs text-gray-400 hover:text-white rounded-lg transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  )
}

// Individual stock row
function StockRow({ item, isSelected, onToggleSelect, isAdmin, onCreatePO, onViewProduct }) {
  const sev    = getSeverity(item)
  const styles = SEVERITY_STYLES[sev]
  const rt = Math.max(item.reorderThreshold ?? 1, 1)
  const pct = Math.min((item.quantityAvailable / rt) * 100, 100)
  const isOut  = item.quantityAvailable === 0

  return (
    <div
      className={`
        px-5 py-4 flex items-center gap-4 cursor-pointer select-none
        transition-all duration-150 group
        hover:bg-[#B0E4CC]/10 dark:hover:bg-[#285A48]/10
        hover:translate-x-0.5
        ${isSelected ? 'bg-[#B0E4CC]/15 dark:bg-[#285A48]/15' : ''}
        ${styles.row}
      `}
      onClick={() => onToggleSelect(`${item.productId}|${item.locationId}`)}
    >
      {/* Checkbox */}
      <div onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(`${item.productId}|${item.locationId}`)}
          className="w-4 h-4 rounded accent-[#285A48] cursor-pointer"
        />
      </div>

      {/* Icon */}
      <div className={`p-2 rounded-lg flex-shrink-0 transition-transform duration-150 group-hover:scale-110 ${styles.iconWrap}`}>
        <AlertTriangle size={15} className={styles.icon} />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className="font-semibold text-dark-base dark:text-white text-sm truncate group-hover:text-[#285A48] dark:group-hover:text-[#B0E4CC] transition-colors">
            {item.name}
          </p>
          <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold ${styles.badge}`}>
            {styles.label}
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-1.5">
          {item.sku} · {item.warehouse} · {item.location} ·{' '}
          <span className="text-gray-300 dark:text-gray-600">{item.category}</span>
        </p>
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
          {item.quantityAvailable} available · reorder at {item.reorderThreshold}
        </p>
      </div>

      {/* Qty badge */}
      <div className="text-right flex-shrink-0">
        <span className={`text-lg font-bold ${styles.qty}`}>
          {isOut ? '0' : item.quantityAvailable}
        </span>
        <p className="text-xs text-gray-400">/ {item.reorderThreshold}</p>
      </div>

      {/* Action buttons — fade in on hover */}
      <div
        className="flex gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-150"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => onViewProduct(item.productId)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-[#408A71] hover:text-[#285A48] dark:hover:text-[#B0E4CC] transition-all"
        >
          View
        </button>
        {isAdmin && (
          <button
            onClick={() => onCreatePO(item.productId)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#285A48]/10 text-[#285A48] dark:text-[#B0E4CC] border border-[#285A48]/20 hover:bg-[#285A48] hover:text-white hover:border-[#285A48] transition-all duration-150 flex items-center gap-1"
          >
            <ShoppingCart size={11} /> Reorder now
          </button>
        )}
      </div>
    </div>
  )
}

// Empty state
function EmptyState() {
  return (
    <div className="py-14 flex flex-col items-center gap-3">
      <div className="w-14 h-14 rounded-full bg-[#B0E4CC]/20 flex items-center justify-center">
        <Package size={24} className="text-[#408A71]" />
      </div>
      <p className="text-sm font-medium text-dark-base dark:text-white">All stock levels are healthy</p>
      <p className="text-xs text-gray-400">No items match your current filters</p>
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function LowStock() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const staffWid = user?.roleName === 'WAREHOUSE_STAFF' ? String(user?.warehouseId ?? '') : ''

  const [warehouse, setWarehouse] = useState(staffWid || 'All')
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('qty')
  const [selected, setSelected] = useState(new Set())

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses', 'low-stock'],
    queryFn: async () => {
      const r = await warehouseApi.get('/warehouses', { params: { page: 1, limit: 200 } })
      return springPageItems(r.data)
    },
    staleTime: 60_000,
  })
  const warehouseList = warehousesData ?? []

  const { data: productsData } = useQuery({
    queryKey: ['products', 'low-stock-lookup'],
    queryFn: async () => {
      const r = await inventoryApi.get('/products', { params: { page: 1, limit: 500 } })
      return springPageItems(r.data)
    },
    staleTime: 60_000,
  })
  const productById = useMemo(() => buildProductLookup(productsData ?? []), [productsData])
  const warehouseById = useMemo(() => buildWarehouseLookup(warehouseList), [warehouseList])

  const locationQueries = useQueries({
    queries: warehouseList.map((w) => ({
      queryKey: ['locations', 'low-stock', String(w.warehouseId)],
      queryFn: async () => {
        const r = await warehouseApi.get('/locations', { params: { warehouseId: w.warehouseId } })
        return Array.isArray(r.data) ? r.data : []
      },
      enabled: warehouseList.length > 0,
    })),
  })

  const locationMeta = useMemo(() => {
    const warehouseIdByLocationId = new Map()
    const locationLabelById = new Map()
    for (const q of locationQueries) {
      const list = q.data
      if (!Array.isArray(list)) continue
      for (const loc of list) {
        const lid = String(loc.locationId)
        warehouseIdByLocationId.set(lid, String(loc.warehouseId))
        const label = [loc.zone, loc.aisle, loc.shelf, loc.bin].filter(Boolean).join(' · ') || loc.locationCode || lid
        locationLabelById.set(lid, label)
      }
    }
    return { warehouseIdByLocationId, locationLabelById }
  }, [locationQueries])

  const { data: lowStockRaw = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['stock-low', 'enriched'],
    queryFn: async () => {
      const response = await inventoryApi.get('/stock/low-stock')
      const data = response.data
      if (Array.isArray(data)) return data
      if (Array.isArray(data?.content)) return data.content
      return []
    },
    staleTime: 0,
    refetchInterval: 60_000,
  })

  const rawItems = useMemo(
    () =>
      lowStockRaw.map((row) => enrichLowStockRow(row, productById, warehouseById, locationMeta)),
    [lowStockRaw, productById, warehouseById, locationMeta],
  )

  const categoryOptions = useMemo(() => {
    const all = new Set()
    for (const item of rawItems) {
      if (item.category) {
        all.add(item.category)
      }
    }
    return ['All', ...Array.from(all).sort((a, b) => String(a).localeCompare(String(b)))]
  }, [rawItems])

  // ── Filtered + sorted items ──
  const items = useMemo(() => {
    let res = rawItems.filter((i) => {
      if (user?.roleName === 'WAREHOUSE_STAFF' && staffWid) {
        if (String(i.warehouseId) !== staffWid) return false
      } else if (warehouse !== 'All') {
        if (String(i.warehouseId) !== String(warehouse)) return false
      }
      if (category !== 'All' && i.category !== category) return false
      const q = search.toLowerCase()
      const name = i.name ?? i.productName ?? ''
      const sku = i.sku ?? ''
      const location = i.location ?? i.locationCode ?? ''
      if (q && !name.toLowerCase().includes(q) && !sku.toLowerCase().includes(q) && !location.toLowerCase().includes(q))
        return false
      return true
    })

    if (sortBy === 'qty') res = [...res].sort((a, b) => a.quantityAvailable - b.quantityAvailable)
    if (sortBy === 'pct')
      res = [...res].sort(
        (a, b) =>
          (a.quantityAvailable / Math.max(a.reorderThreshold ?? 1, 1)) -
          (b.quantityAvailable / Math.max(b.reorderThreshold ?? 1, 1)),
      )
    if (sortBy === 'name') res = [...res].sort((a, b) => String(a.name).localeCompare(String(b.name)))

    return res
  }, [rawItems, warehouse, category, search, sortBy, user?.roleName, staffWid])

  const outOfStockCount = items.filter(i => i.quantityAvailable === 0).length

  // ── Selection helpers ──
  function toggleSelect(key) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function handleCreatePO(productId) {
    const reorderQty = 50
    navigate(`/procurement/purchase-orders/new?productId=${productId}&quantity=${reorderQty}`)
  }

  function handleViewProduct(productId) {
    navigate(`/inventory?highlight=${productId}`)
  }

  function handleBulkCreatePOs() {
    console.log('Bulk create POs for', [...selected])
    setSelected(new Set())
  }

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-dark-base dark:text-white">Low Stock</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {isLoading ? 'Checking stock levels...' : `${items.length} item${items.length === 1 ? '' : 's'} below reorder threshold`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <select
              value={warehouse}
              onChange={e => setWarehouse(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-dark-base dark:text-white focus:outline-none focus:ring-2 focus:ring-[#408A71] transition-colors hover:border-[#408A71]"
            >
              <option value="All">All warehouses</option>
              {warehouseList.map((w) => (
                <option key={w.warehouseId} value={String(w.warehouseId)}>
                  {w.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-dark-base dark:text-white focus:outline-none focus:ring-2 focus:ring-[#408A71] transition-colors hover:border-[#408A71]"
          >
            {categoryOptions.map(c => <option key={c}>{c}</option>)}
          </select>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 hover:bg-[#B0E4CC]/20 hover:border-[#408A71] hover:text-[#285A48] dark:hover:text-[#B0E4CC] transition-all"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Warning banner ── */}
      <WarningBanner count={outOfStockCount} />

      {/* ── Summary pills ── */}
      <SummaryPills items={items} />

      {/* ── Chart ── */}
      {!isLoading && !isError && items.length > 0 && (
        <StockChart items={items} />
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <div className="app-card p-12 flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-[#408A71]" />
          <p className="text-sm text-gray-400">Checking stock levels...</p>
        </div>
      )}

      {/* ── Error ── */}
      {isError && (
        <div className="app-card border-red-200 dark:border-red-900/40 p-8 text-center">
          <p className="text-sm text-red-500 mb-3">Failed to load low stock data</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-sm bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg hover:bg-red-100 hover:scale-105 transition-all"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Main table section ── */}
      {!isLoading && !isError && (
        <div className="space-y-3">

          {/* Search + sort toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, SKU, location…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-dark-base dark:text-white focus:outline-none focus:ring-2 focus:ring-[#408A71] hover:border-[#408A71] transition-colors"
              />
            </div>
            <div className="flex gap-1.5 border border-gray-200 dark:border-gray-700 rounded-lg p-1 bg-white dark:bg-gray-800">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={`px-3 py-1 text-xs rounded-md transition-all font-medium ${
                    sortBy === opt.value
                      ? 'bg-[#285A48] text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:text-[#285A48] dark:hover:text-[#B0E4CC]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk bar */}
          <BulkBar
            selected={selected}
            onCreatePOs={handleBulkCreatePOs}
            onClear={() => setSelected(new Set())}
          />

          {/* Table */}
          <div className="app-card divide-y divide-gray-50 dark:divide-gray-700/50 overflow-hidden">
            {items.length === 0 ? (
              <EmptyState />
            ) : (
              items.map((item) => (
                <StockRow
                  key={`${item.productId}-${item.locationId}`}
                  item={item}
                  isSelected={selected.has(`${item.productId}|${item.locationId}`)}
                  onToggleSelect={toggleSelect}
                  isAdmin={isAdmin}
                  onCreatePO={handleCreatePO}
                  onViewProduct={handleViewProduct}
                />
              ))
            )}
          </div>

        </div>
      )}
    </div>
  )
}