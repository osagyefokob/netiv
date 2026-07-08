import { useState, useMemo } from 'react'
import { useQuery, useQueries, useMutation } from '@tanstack/react-query'
import {
  Search, Loader2, X, TrendingUp, TrendingDown, Package,
  AlertTriangle, Activity, Download,
  RefreshCw, ChevronUp, ChevronDown,
  FileText, ChevronRight
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { inventoryApi, warehouseApi } from '../../services/axiosInstance'
import { springPageItems } from '../../utils/apiNormalize'
import { enrichStockLevel, buildProductLookup, buildWarehouseLookup } from '../../utils/enrichInventory'

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const USE_MOCK = false

const MOCK_STOCK = [
  { stockLevelId: 'SL-001', productId: 'P-001', sku: 'SKU-1001', name: 'Corrugated Boxes (Large)', locationId: 'LOC-A1', location: 'Zone A · A1-01', aisle: 'A1', warehouse: 'Accra Main',  quantityOnHand: 340, quantityReserved: 40,  quantityAvailable: 300, minLevel: 50,  maxLevel: 500, supplier: 'PackCo Ltd',      lastUpdated: '2026-04-08', version: 3, category: 'Packaging' },
  { stockLevelId: 'SL-002', productId: 'P-002', sku: 'SKU-1042', name: 'Industrial Bolts M12',     locationId: 'LOC-B3', location: 'Zone B · B3-02', aisle: 'B3', warehouse: 'Accra Main',  quantityOnHand: 4,   quantityReserved: 0,   quantityAvailable: 4,   minLevel: 20,  maxLevel: 200, supplier: 'MetalWorks GH',   lastUpdated: '2026-04-08', version: 1, category: 'Hardware'  },
  { stockLevelId: 'SL-003', productId: 'P-003', sku: 'SKU-2218', name: 'Packing Foam Sheets',     locationId: 'LOC-A2', location: 'Zone A · A2-01', aisle: 'A2', warehouse: 'Accra Main',  quantityOnHand: 0,   quantityReserved: 0,   quantityAvailable: 0,   minLevel: 50,  maxLevel: 300, supplier: 'FoamTech Africa', lastUpdated: '2026-04-07', version: 2, category: 'Packaging' },
  { stockLevelId: 'SL-004', productId: 'P-004', sku: 'SKU-3301', name: 'Stretch Wrap Rolls',      locationId: 'LOC-C1', location: 'Zone C · C1-01', aisle: 'C1', warehouse: 'Tema Branch', quantityOnHand: 12,  quantityReserved: 5,   quantityAvailable: 7,   minLevel: 30,  maxLevel: 150, supplier: 'WrapRight Co',    lastUpdated: '2026-04-08', version: 1, category: 'Packaging' },
  { stockLevelId: 'SL-005', productId: 'P-005', sku: 'SKU-4490', name: 'Wooden Pallets',          locationId: 'LOC-D1', location: 'Zone D · D1-01', aisle: 'D1', warehouse: 'Accra Main',  quantityOnHand: 3,   quantityReserved: 0,   quantityAvailable: 3,   minLevel: 15,  maxLevel: 100, supplier: 'TimberGh',        lastUpdated: '2026-04-06', version: 1, category: 'Storage'   },
  { stockLevelId: 'SL-006', productId: 'P-006', sku: 'SKU-5512', name: 'Cable Ties (Pack/100)',   locationId: 'LOC-B1', location: 'Zone B · B1-03', aisle: 'B1', warehouse: 'Tema Branch', quantityOnHand: 88,  quantityReserved: 10,  quantityAvailable: 78,  minLevel: 20,  maxLevel: 200, supplier: 'ElectroParts',    lastUpdated: '2026-04-08', version: 2, category: 'Hardware'  },
  { stockLevelId: 'SL-007', productId: 'P-007', sku: 'SKU-6103', name: 'Safety Gloves (M)',       locationId: 'LOC-E1', location: 'Zone E · E1-01', aisle: 'E1', warehouse: 'Kumasi Hub',  quantityOnHand: 210, quantityReserved: 20,  quantityAvailable: 190, minLevel: 30,  maxLevel: 250, supplier: 'SafeGuard Ltd',   lastUpdated: '2026-04-07', version: 1, category: 'Safety'    },
]

const WEEKLY_TRENDS = {
  'Corrugated Boxes (Large)': [380, 360, 355, 350, 345, 342, 340],
  'Industrial Bolts M12':     [22,  18,  14,  10,  8,   6,   4],
  'Packing Foam Sheets':      [30,  20,  12,  8,   4,   2,   0],
  'Stretch Wrap Rolls':       [40,  35,  28,  22,  18,  14,  12],
  'Wooden Pallets':           [15,  12,  10,  8,   6,   4,   3],
  'Cable Ties (Pack/100)':    [95,  92,  90,  91,  89,  88,  88],
  'Safety Gloves (M)':        [220, 218, 215, 213, 212, 211, 210],
}
const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today']

/** Mock trend lines when present; otherwise flat series from current on-hand (API has no history). */
function weeklyTrendVals(item) {
  if (WEEKLY_TRENDS[item.name]) return WEEKLY_TRENDS[item.name]
  const q = Number(item.quantityOnHand ?? 0)
  return Array(7).fill(q)
}

const WAREHOUSES = ['All', 'Accra Main', 'Tema Branch', 'Kumasi Hub']
const CATEGORIES = ['All', 'Packaging', 'Hardware', 'Storage', 'Safety']

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function getStatus(item) {
  if (item.quantityAvailable === 0)                      return 'out'
  if (item.quantityAvailable <= item.minLevel)           return 'critical'
  if (item.quantityAvailable <= item.minLevel * 1.5)     return 'low'
  if (item.quantityAvailable >= item.maxLevel * 0.9)     return 'full'
  return 'healthy'
}

const STATUS_META = {
  out:      { label: 'Out of Stock', bg: 'bg-red-50 dark:bg-red-900/30',    text: 'text-red-700 dark:text-red-300',    border: 'border-red-200 dark:border-red-800'    },
  critical: { label: 'Critical',     bg: 'bg-amber-50 dark:bg-amber-900/30',  text: 'text-amber-800 dark:text-amber-200',  border: 'border-amber-200 dark:border-amber-800'  },
  low:      { label: 'Low',          bg: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-200', border: 'border-yellow-200 dark:border-yellow-800' },
  healthy:  { label: 'Healthy',      bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-200', border: 'border-emerald-200 dark:border-emerald-800' },
  full:     { label: 'Full',         bg: 'bg-sky-50 dark:bg-sky-900/30',    text: 'text-sky-800 dark:text-sky-200',    border: 'border-sky-200 dark:border-sky-800'    },
}

function exportCSV(items) {
  const headers = ['SKU', 'Product', 'On Hand', 'Reserved', 'Available', 'Min', 'Max', 'Location', 'Supplier', 'Status']
  const rows = items.map(i => [
    i.sku, i.name, i.quantityOnHand, i.quantityReserved,
    i.quantityAvailable, i.minLevel, i.maxLevel,
    i.location, i.supplier, STATUS_META[getStatus(i)].label,
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'stock-levels.csv'; a.click()
}

// ─────────────────────────────────────────────
// KPI CARDS
// ─────────────────────────────────────────────
function KPICards({ items }) {
  const totalSKUs   = items.length
  const totalUnits  = items.reduce((s, i) => s + i.quantityOnHand, 0)
  const lowStock    = items.filter(i => ['low', 'critical'].includes(getStatus(i))).length
  const outOfStock  = items.filter(i => getStatus(i) === 'out').length

  const cards = [
    { label: 'Total SKUs',    value: totalSKUs,                   icon: <Package size={18} />,       accent: '#408A71', sub: 'active products'  },
    { label: 'Total Units',   value: totalUnits.toLocaleString(), icon: <TrendingUp size={18} />,    accent: '#408A71', sub: 'units on hand'     },
    { label: 'Low Stock',     value: lowStock,                    icon: <TrendingDown size={18} />,  accent: '#d97706', sub: 'need attention'    },
    { label: 'Out of Stock',  value: outOfStock,                  icon: <AlertTriangle size={18} />, accent: '#ef4444', sub: 'immediate reorder' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(c => (
        <div
          key={c.label}
          className="app-card p-4 hover:border-brand-blue/40 hover:-translate-y-0.5 transition-all duration-200 group cursor-default"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{c.label}</span>
            <span style={{ color: c.accent }} className="opacity-70 group-hover:opacity-100 transition-opacity">{c.icon}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">{c.value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{c.sub}</p>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// CRITICAL ALERTS BAR
// ─────────────────────────────────────────────
function CriticalAlerts({ items }) {
  const alerts = items.filter(i => ['out', 'critical'].includes(getStatus(i)))
  const [open, setOpen] = useState(true)
  if (!alerts.length) return null
  return (
    <div className="app-card border-amber-200/80 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-900/20 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 transition-colors"
      >
        <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex-1 text-left">
          {alerts.length} critical alert{alerts.length > 1 ? 's' : ''} — immediate action required
        </span>
        {open
          ? <ChevronUp size={14} className="text-amber-700 dark:text-amber-400" />
          : <ChevronDown size={14} className="text-amber-700 dark:text-amber-400" />
        }
      </button>
      {open && (
        <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {alerts.map(item => {
            const st = getStatus(item)
            return (
              <div key={`${item.productId}-${item.locationId}`} className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-amber-200/70 dark:border-amber-800/50 rounded-lg px-3 py-2.5 shadow-sm">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${st === 'out' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200'}`}>
                  {st === 'out' ? 'OUT' : 'CRIT'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.sku} · {item.warehouse}</p>
                </div>
                <span className="text-xs font-bold text-red-600 dark:text-red-400">{item.quantityAvailable} left</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// LINE CHART (Weekly Trends only)
// ─────────────────────────────────────────────
function LineChartView({ items }) {
  const [hoverDay, setHoverDay] = useState(null)
  const W = 560, H = 200
  const PAD = { top: 12, right: 16, bottom: 28, left: 36 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const allVals = items.flatMap((i) => weeklyTrendVals(i))
  const minV = allVals.length ? Math.min(...allVals) : 0
  const maxV = allVals.length ? Math.max(...allVals) : 1

  const colors = ['#408A71', '#0d9488', '#d97706', '#ef4444', '#2563eb', '#7c3aed', '#db2777']

  function xPos(idx) { return PAD.left + (idx / (WEEK_LABELS.length - 1)) * innerW }
  function yPos(val)  { return PAD.top + innerH - ((val - minV) / Math.max(maxV - minV, 1)) * innerH }
  function toPath(vals) {
    return vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yPos(v)}`).join(' ')
  }

  const bandW = innerW / Math.max(WEEK_LABELS.length - 1, 1) * 0.92

  function moveTooltip(e, dayIdx) {
    const pad = 12
    const tw = 280
    const th = 120
    let left = e.clientX + pad
    let top = e.clientY - th - pad
    if (left + tw > window.innerWidth - 8) left = e.clientX - tw - pad
    if (top < 8) top = e.clientY + pad
    setHoverDay({ dayIdx, x: left, y: top })
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" style={{ height: 220 }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y   = PAD.top + innerH * t
          const val = Math.round(maxV - t * (maxV - minV))
          return (
            <g key={i}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#6b7280">{val}</text>
            </g>
          )
        })}
        {WEEK_LABELS.map((l, i) => (
          <text key={l} x={xPos(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#6b7280">{l}</text>
        ))}
        {items.map((item, ci) => {
          const vals = weeklyTrendVals(item)
          const color = colors[ci % colors.length]
          return (
            <g key={`${item.productId}-${item.locationId}`}>
              <path d={toPath(vals)} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" opacity="0.9" />
              {vals.map((v, vi) => (
                <circle key={vi} cx={xPos(vi)} cy={yPos(v)} r="3.5" fill={color} stroke="#fff" strokeWidth="1" />
              ))}
            </g>
          )
        })}
        {WEEK_LABELS.map((_, vi) => (
          <rect
            key={`band-${vi}`}
            x={xPos(vi) - bandW / 2}
            y={PAD.top}
            width={bandW}
            height={innerH}
            fill="transparent"
            className="cursor-crosshair"
            onMouseEnter={(e) => moveTooltip(e, vi)}
            onMouseMove={(e) => moveTooltip(e, vi)}
            onMouseLeave={() => setHoverDay(null)}
          />
        ))}
      </svg>
      {hoverDay != null && (
        <div
          className="fixed z-50 app-card px-3 py-2.5 text-xs pointer-events-none max-w-[min(280px,calc(100vw-24px))] shadow-lg"
          style={{ left: hoverDay.x, top: hoverDay.y }}
        >
          <p className="font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1 mb-1.5">{WEEK_LABELS[hoverDay.dayIdx]}</p>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {items.map((item, ci) => {
              const vals = weeklyTrendVals(item)
              const v = vals[hoverDay.dayIdx]
              const color = colors[ci % colors.length]
              return (
                <li key={`${item.productId}-${item.locationId}`} className="flex justify-between gap-3">
                  <span className="text-gray-600 dark:text-gray-300 truncate" title={item.name}>
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ background: color }} />
                    {item.name.length > 22 ? `${item.name.slice(0, 22)}…` : item.name}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white tabular-nums shrink-0">{v} units</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-3 mt-2">
        {items.map((item, ci) => (
          <span key={`${item.productId}-${item.locationId}`} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <span className="inline-block w-4 h-1.5 rounded-full" style={{ background: colors[ci % colors.length] }} />
            {item.name.length > 20 ? item.name.slice(0, 20) + '…' : item.name}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// DETAIL DRAWER
// ─────────────────────────────────────────────
function DetailDrawer({ item, onClose, canAdjust, onAdjusted }) {
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('Manual adjustment')
  const [adjErr, setAdjErr] = useState('')

  const adjustMut = useMutation({
    mutationFn: async () => {
      const d = parseInt(delta, 10)
      if (!Number.isFinite(d) || d === 0) {
        throw new Error('Enter a non-zero whole number for quantity change')
      }
      await inventoryApi.post('/stock/adjust', {
        productId: item.productId,
        locationId: item.locationId,
        quantityDelta: d,
        reason: reason.trim() || 'Manual adjustment',
      })
    },
    onSuccess: () => {
      onAdjusted?.()
    },
    onError: (e) => {
      setAdjErr(e?.message || 'Adjustment failed')
    },
  })

  if (!item) return null
  const st  = getStatus(item)
  const sm  = STATUS_META[st]
  const pct = Math.min((item.quantityAvailable / item.maxLevel) * 100, 100)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 h-full overflow-y-auto p-6 space-y-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg">{item.name}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${sm.bg} ${sm.text} ${sm.border}`}>{sm.label}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{item.sku}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">·</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{item.category}</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'On Hand',   val: item.quantityOnHand,    color: 'text-gray-900 dark:text-white' },
            { label: 'Reserved',  val: item.quantityReserved,  color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Available', val: item.quantityAvailable, color: sm.text },
          ].map(c => (
            <div key={c.label} className="app-card p-3 text-center">
              <p className={`text-2xl font-bold ${c.color}`}>{c.val}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            <span>Min: {item.minLevel}</span>
            <span>Max: {item.maxLevel}</span>
          </div>
          <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500 bg-brand-blue" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{pct.toFixed(0)}% of max capacity</p>
        </div>
        <div className="space-y-2 text-sm">
          {[
            ['Location',     item.location],
            ['Warehouse',    item.warehouse],
            ['Supplier',     item.supplier],
            ['Last Updated', item.lastUpdated],
            ['Version',      `v${item.version}`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
              <span className="text-gray-500 dark:text-gray-400">{k}</span>
              <span className="text-gray-900 dark:text-white font-medium">{v}</span>
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Weekly trend</p>
          <div className="flex items-end gap-1 h-16">
            {weeklyTrendVals(item).map((v, i) => {
              const series = weeklyTrendVals(item)
              const max    = Math.max(...series, 1)
              const h      = Math.max((v / max) * 100, 4)
              const isLast = i === WEEK_LABELS.length - 1
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1"
                  title={`${WEEK_LABELS[i]}: ${v} units`}
                >
                  <div className="w-full rounded-sm" style={{ height: `${h}%`, background: isLast ? '#408A71' : '#a7d4c4' }} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{WEEK_LABELS[i]}</span>
                </div>
              )
            })}
          </div>
        </div>

        {canAdjust && (
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Adjust stock</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Positive adds on-hand; negative removes (cycle count, damage, correction).</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400 col-span-2">
                Quantity Δ
                <input
                  type="number"
                  value={delta}
                  onChange={(e) => { setDelta(e.target.value); setAdjErr('') }}
                  placeholder="e.g. 10 or -5"
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </label>
              <label className="text-xs text-gray-500 dark:text-gray-400 col-span-2">
                Reason
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </label>
            </div>
            {adjErr && <p className="text-xs text-red-600 dark:text-red-400">{adjErr}</p>}
            <button
              type="button"
              disabled={adjustMut.isPending}
              onClick={() => adjustMut.mutate()}
              className="w-full py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {adjustMut.isPending ? 'Applying…' : 'Apply adjustment'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function StockLevels() {
  const user      = useAuthStore(s => s.user)
  const isAdmin   = useAuthStore((s) => s.isAdmin())
  const staffWid  = user?.roleName === 'WAREHOUSE_STAFF' ? String(user?.warehouseId ?? '') : ''
  const [detailItem, setDetailItem] = useState(null)
  const canAdjustStock =
    isAdmin ||
    (user?.roleName === 'WAREHOUSE_STAFF' && staffWid && detailItem && String(detailItem.warehouseId) === staffWid)

  const [search,     setSearch]     = useState('')
  const [warehouse,  setWarehouse]  = useState('All')
  const [category,   setCategory]   = useState('All')
  const [page,       setPage]       = useState(1)
  const [sortKey,    setSortKey]    = useState('name')
  const [sortDir,    setSortDir]    = useState('asc')
  const [dateRange,  setDateRange]  = useState('7d')

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses', 'stock-levels'],
    queryFn: async () => {
      const r = await warehouseApi.get('/warehouses', { params: { page: 1, limit: 200 } })
      return springPageItems(r.data)
    },
    staleTime: 60_000,
  })

  const { data: productsData } = useQuery({
    queryKey: ['products', 'stock-levels-lookup'],
    queryFn: async () => {
      const r = await inventoryApi.get('/products', { params: { page: 1, limit: 500 } })
      return springPageItems(r.data)
    },
    staleTime: 60_000,
  })

  const warehouseList = warehousesData ?? []
  const warehouseById = useMemo(() => buildWarehouseLookup(warehouseList), [warehouseList])
  const productById = useMemo(() => buildProductLookup(productsData ?? []), [productsData])

  const locationQueries = useQueries({
    queries: warehouseList.map((w) => ({
      queryKey: ['locations', String(w.warehouseId)],
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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['stock-levels', { page, staffWid }],
    queryFn: async () => {
      const response = await inventoryApi.get('/stock', {
        params: { page, limit: 100 },
      })
      return response.data
    },
    staleTime: 0,
    placeholderData: (prev) => prev,
  })

  const rawItems = useMemo(() => {
    if (USE_MOCK) return MOCK_STOCK
    const rows = springPageItems(data)
    return rows.map((row) =>
      enrichStockLevel(row, productById, warehouseById, locationMeta),
    )
  }, [data, productById, warehouseById, locationMeta])

  const PAGE_SIZE = 5

  const filtered = useMemo(() => {
    let res = rawItems.filter((s) => {
      const q = search.toLowerCase()
      const matchQ =
        s.name.toLowerCase().includes(q) ||
        s.sku.toLowerCase().includes(q) ||
        String(s.location).toLowerCase().includes(q)
      let matchW = true
      if (user?.roleName === 'WAREHOUSE_STAFF' && staffWid) {
        matchW = String(s.warehouseId) === staffWid
      } else if (warehouse !== 'All') {
        matchW = String(s.warehouseId) === String(warehouse)
      }
      const matchC = category === 'All' || s.category === category
      return matchQ && matchW && matchC
    })
    res = [...res].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey]
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase() }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ?  1 : -1
      return 0
    })
    return res
  }, [rawItems, search, warehouse, category, sortKey, sortDir, user?.roleName, staffWid])

  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function SortIcon({ col }) {
    if (sortKey !== col) return <ChevronUp size={12} className="opacity-20" />
    return sortDir === 'asc'
      ? <ChevronUp   size={12} className="text-medium-green" />
      : <ChevronDown size={12} className="text-medium-green" />
  }

  const TABLE_COLS = [
    { key: 'name',              label: 'Product / SKU', sortable: true  },
    { key: 'quantityOnHand',    label: 'On Hand',       sortable: true  },
    { key: 'quantityAvailable', label: 'Available',     sortable: true  },
    { key: 'minLevel',          label: 'Min / Max',     sortable: false },
    { key: 'location',          label: 'Location',      sortable: true  },
    { key: 'supplier',          label: 'Supplier',      sortable: true  },
    { key: null,                label: 'Status',        sortable: false },
  ]

  const displayItems = filtered.length ? filtered : rawItems

  return (
    <div className="space-y-5 min-h-screen">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Stock Levels</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">On-hand, reserved and available quantities by location</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <select
            value={dateRange} onChange={e => setDateRange(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue w-full sm:w-auto"
          >
            <option value="1d">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={() => exportCSV(filtered)}
            className="flex items-center justify-center gap-2 px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-brand-blue hover:text-brand-blue transition-all w-[calc(50%-0.25rem)] sm:w-auto"
          >
            <Download size={12} /> CSV
          </button>
          <button className="flex items-center justify-center gap-2 px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-brand-blue hover:text-brand-blue transition-all w-[calc(50%-0.25rem)] sm:w-auto">
            <FileText size={12} /> PDF
          </button>
          <button onClick={() => refetch()} className="flex items-center justify-center gap-2 px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-brand-blue hover:text-brand-blue transition-all w-[calc(50%-0.25rem)] sm:w-auto">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI cards — own row ── */}
      <KPICards items={displayItems} />

      {/* ── Critical alerts — own card ── */}
      <CriticalAlerts items={rawItems} />

      {/* ── Weekly Trends — own card ── */}
      <div className="app-card border-l-[3px] border-l-brand-blue dark:border-l-brand-blue p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Activity size={14} className="text-brand-blue dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Weekly Trends</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">— stock movement over the past 7 days (hover a day for exact values)</span>
        </div>
        <LineChartView items={displayItems} />
      </div>

      {/* ── Filters — own card ── */}
      <div className="app-card border-l-[3px] border-l-brand-blue/50 dark:border-l-brand-blue/50 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text" placeholder="Search product, SKU, location…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </div>
        {isAdmin && (
          <select
            value={warehouse}
            onChange={(e) => {
              setWarehouse(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue w-full sm:w-auto"
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
          value={category} onChange={e => { setCategory(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue w-full sm:w-auto"
        >
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="app-card p-12 flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-brand-blue" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading stock levels...</p>
        </div>
      )}

      {/* ── Error ── */}
      {isError && (
        <div className="app-card border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20 p-8 text-center">
          <p className="text-sm text-red-700 dark:text-red-300 mb-3">Failed to load stock data</p>
          <button type="button" onClick={() => refetch()} className="px-4 py-2 text-sm bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/70 transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* ── Table — own card ── */}
      {!isLoading && !isError && (
        <div className="app-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50">
                  {TABLE_COLS.map(col => (
                    <th
                      key={col.label}
                      className={`px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide ${col.sortable ? 'cursor-pointer hover:text-brand-blue dark:hover:text-blue-400 transition-colors' : ''}`}
                      onClick={() => col.sortable && toggleSort(col.key)}
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        {col.sortable && <SortIcon col={col.key} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-sm text-gray-500 dark:text-gray-400">
                      No stock records found
                    </td>
                  </tr>
                ) : paged.map(s => {
                  const st = getStatus(s)
                  const sm = STATUS_META[st]
                  return (
                    <tr
                      key={s.stockLevelId}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group cursor-pointer"
                      onClick={() => setDetailItem(s)}
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900 dark:text-white group-hover:text-brand-blue dark:group-hover:text-blue-400 transition-colors flex items-center gap-1">
                          {s.name}
                          <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 text-brand-blue dark:text-blue-400 transition-opacity" />
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.sku} · {s.warehouse}</p>
                      </td>
                      <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">{s.quantityOnHand}</td>
                      <td className="px-5 py-4">
                        <span className={`text-sm font-bold ${sm.text}`}>{s.quantityAvailable}</span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-600 dark:text-gray-300">
                        <span className="text-amber-600 dark:text-amber-400">{s.minLevel}</span>
                        <span className="text-gray-400 dark:text-gray-500 mx-1">/</span>
                        <span className="text-brand-blue dark:text-blue-400">{s.maxLevel}</span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-600 dark:text-gray-400">{s.location}</td>
                      <td className="px-5 py-4 text-xs text-gray-600 dark:text-gray-400">{s.supplier}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${sm.bg} ${sm.text} ${sm.border}`}>
                          {sm.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 sm:px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} records
            </p>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition-all flex-1 sm:flex-none"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-xs bg-brand-blue text-white rounded-lg font-semibold flex items-center justify-center min-w-[72px]">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition-all flex-1 sm:flex-none"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail drawer ── */}
      {detailItem && (
        <DetailDrawer
          item={detailItem}
          onClose={() => setDetailItem(null)}
          canAdjust={canAdjustStock}
          onAdjusted={() => {
            refetch()
            setDetailItem(null)
          }}
        />
      )}

    </div>
  )
}