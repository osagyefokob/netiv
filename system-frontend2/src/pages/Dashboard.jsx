import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  ShoppingCart, AlertTriangle, ClipboardList,
  Clock, ArrowRight, Plus, Box, Activity,
  ArrowUpRight, Package, PackageCheck, Truck, TrendingUp,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import StatusBadge from '../components/ui/StatusBadge'
import { useLowStockCountQuery, usePendingPipelineOrdersCountQuery } from '../hooks/useNavBadges'
import { inventoryApi, ordersApi, procurementApi, warehouseApi } from '../services/axiosInstance'
import { springPageItems, springPageTotalElements } from '../utils/apiNormalize'
import {
  fetchAllPages,
  computeInventoryValueGHS,
  categoryShareByUnits,
  warehouseStockBars,
  lastSevenDaysOrderTrend,
} from '../utils/dashboardMetrics'
import { buildProductLookup } from '../utils/enrichInventory'

function formatGHS(n) {
  const v = Number(n ?? 0)
  if (!Number.isFinite(v)) return 'GHS 0.00'
  return `GHS ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatGHSCompact(n) {
  const v = Number(n ?? 0)
  if (!Number.isFinite(v)) return 'GHS 0'
  if (v >= 1_000_000) return `GHS ${(v / 1_000_000).toFixed(2)}M`
  if (v >= 10_000) return `GHS ${(v / 1_000).toFixed(1)}K`
  return formatGHS(v)
}

function reorderPoHref(row) {
  const pid = row.productId
  const sid = row.preferredSupplierId
  const qty = row.recommendedQty ?? row.suggestedOrderQuantity
  if (sid && pid && qty != null && qty !== '') {
    return `/procurement/purchase-orders/new?productId=${encodeURIComponent(pid)}&supplierId=${encodeURIComponent(sid)}&quantity=${encodeURIComponent(String(qty))}`
  }
  if (sid && pid) {
    return `/procurement/purchase-orders/new?productId=${encodeURIComponent(pid)}&supplierId=${encodeURIComponent(sid)}`
  }
  return '/procurement/purchase-orders/new'
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function pieSlicePath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`
}

function PieChart({ data, animate }) {
  const [scale, setScale] = useState(0)
  const [hover, setHover] = useState(null)
  const cx = 72
  const cy = 72
  const r = 64
  const slicesData = (data?.length ? data : [{ label: 'No data', pct: 100, color: '#e5e7eb' }])

  useEffect(() => {
    if (!animate) return
    const t = setTimeout(() => setScale(1), 100)
    return () => clearTimeout(t)
  }, [animate])

  let cum = 0
  const slices = slicesData.map((d) => {
    const startAngle = cum * 3.6
    cum += d.pct
    const endAngle = cum * 3.6
    return { ...d, startAngle, endAngle, path: pieSlicePath(cx, cy, r, startAngle, endAngle) }
  })

  return (
    <div className="flex items-center gap-6 pt-2 relative flex-wrap">
      <svg
        viewBox="0 0 144 144"
        className="w-36 h-36 flex-shrink-0 overflow-visible"
        style={{
          transform: `scale(${scale})`,
          transition: 'transform 0.7s cubic-bezier(.34,1.56,.64,1)',
        }}
      >
        {slices.map((s) => (
          <path
            key={s.label}
            d={s.path}
            fill={s.color}
            stroke="var(--pie-stroke, #fff)"
            strokeWidth="2"
            className="cursor-pointer transition-opacity hover:opacity-90 dark:[--pie-stroke:rgb(31_41_55)]"
            onMouseEnter={(e) => setHover({ label: s.label, pct: s.pct, x: e.clientX + 14, y: e.clientY - 8 })}
            onMouseMove={(e) => setHover({ label: s.label, pct: s.pct, x: e.clientX + 14, y: e.clientY - 8 })}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      <div className="space-y-2 min-w-[140px]">
        {slicesData.map((d) => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{d.label}:</span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{d.pct}%</span>
          </div>
        ))}
      </div>
      {hover && (
        <div
          className="fixed z-50 app-card px-3 py-2 text-xs pointer-events-none shadow-lg max-w-[220px]"
          style={{ left: hover.x, top: hover.y }}
        >
          <p className="font-semibold text-gray-800 dark:text-gray-100">{hover.label}</p>
          <p className="text-gray-600 dark:text-gray-300 tabular-nums">
            Share: <span className="font-bold">{hover.pct}%</span>
          </p>
        </div>
      )}
    </div>
  )
}

function TrendChart({ labels, counts, revenue, animate }) {
  const [hover, setHover] = useState(null)
  const w = 400
  const h = 140
  const pad = { t: 10, b: 30, l: 36, r: 10 }
  const cw = w - pad.l - pad.r
  const ch = h - pad.t - pad.b

  const norm = (arr) => {
    const mn = Math.min(...arr)
    const mx = Math.max(...arr)
    if (mx === mn) return arr.map(() => 0.5)
    return arr.map((v) => 1 - (v - mn) / (mx - mn))
  }
  const mkPath = (arr) => {
    const pts = norm(arr)
    const n = Math.max(pts.length - 1, 1)
    return pts.map((y, i) => `${pad.l + (i / n) * cw},${pad.t + y * ch}`).join(' ')
  }

  const ordPath = `M${mkPath(counts).split(' ').join(' L')}`
  const revPath = `M${mkPath(revenue).split(' ').join(' L')}`

  const lineRef1 = useRef(null)
  const lineRef2 = useRef(null)
  useEffect(() => {
    if (!animate) return
    ;[lineRef1, lineRef2].forEach((ref, i) => {
      if (!ref.current) return
      const len = ref.current.getTotalLength()
      ref.current.style.strokeDasharray = len
      ref.current.style.strokeDashoffset = len
      ref.current.style.transition = `stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1) ${0.2 + i * 0.15}s`
      requestAnimationFrame(() => { ref.current.style.strokeDashoffset = '0' })
    })
  }, [animate])

  const nSeg = Math.max(labels.length - 1, 1)
  const bandW = (cw / nSeg) * 0.85
  function moveTip(e, i) {
    let left = e.clientX + 12
    let top = e.clientY - 72
    if (left + 220 > window.innerWidth - 8) left = e.clientX - 232
    if (top < 8) top = e.clientY + 16
    setHover({
      i,
      day: labels[i],
      orders: counts[i],
      revenue: revenue[i],
      x: left,
      y: top,
    })
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full text-gray-400" style={{ height: 140 }}>
        <defs>
          <linearGradient id="ordFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.33, 0.67, 1].map((v, i) => (
          <line
            key={i}
            x1={pad.l}
            y1={pad.t + v * ch}
            x2={pad.l + cw}
            y2={pad.t + v * ch}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="1"
          />
        ))}
        <path
          d={`${ordPath} L${pad.l + cw},${pad.t + ch} L${pad.l},${pad.t + ch} Z`}
          fill="url(#ordFill)"
        />
        <path
          d={`${revPath} L${pad.l + cw},${pad.t + ch} L${pad.l},${pad.t + ch} Z`}
          fill="url(#revFill)"
        />
        <path
          ref={lineRef1}
          d={ordPath}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          ref={lineRef2}
          d={revPath}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="5 3"
        />
        {labels.map((d, i) => (
          <text key={`${d}-${i}`} x={pad.l + (i / nSeg) * cw} y={h - 6} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.45">
            {d}
          </text>
        ))}
        {labels.map((_, i) => (
          <rect
            key={`band-${i}`}
            x={pad.l + (i / nSeg) * cw - bandW / 2}
            y={pad.t}
            width={bandW}
            height={ch}
            fill="transparent"
            className="cursor-crosshair"
            onMouseEnter={(e) => moveTip(e, i)}
            onMouseMove={(e) => moveTip(e, i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {hover && (
        <div className="fixed z-50 app-card px-3 py-2.5 text-xs pointer-events-none shadow-lg" style={{ left: hover.x, top: hover.y }}>
          <p className="font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 pb-1 mb-1.5">{hover.day}</p>
          <p className="text-gray-700 dark:text-gray-300">
            Orders: <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{hover.orders}</span>
          </p>
          <p className="text-gray-700 dark:text-gray-300 mt-0.5">
            Revenue: <span className="font-bold tabular-nums text-indigo-700 dark:text-indigo-400">{formatGHS(hover.revenue)}</span>
          </p>
        </div>
      )}
    </div>
  )
}

function WarehouseChart({ rows, animate }) {
  const [barH, setBarH] = useState([])
  const [hover, setHover] = useState(null)

  useEffect(() => {
    if (!rows?.length) {
      setBarH([])
      return
    }
    const target = rows.map((d) => d.frac)
    if (!animate) {
      setBarH(target)
      return
    }
    setBarH(rows.map(() => 0))
    const t = setTimeout(() => setBarH(target), 200)
    return () => clearTimeout(t)
  }, [animate, rows])

  if (!rows?.length) {
    return <p className="text-sm text-gray-400 mt-4">No warehouse stock data yet.</p>
  }

  return (
    <div className="relative mt-3" onMouseLeave={() => setHover(null)}>
      <div className="flex items-end gap-4 h-28 flex-wrap">
        {rows.map((wh, i) => (
          <div
            key={wh.name}
            className="flex-1 min-w-[72px] flex flex-col items-center gap-1 relative"
            onMouseEnter={(e) => setHover({ name: wh.name, used: wh.used, x: e.clientX + 12, y: e.clientY - 56 })}
            onMouseMove={(e) => setHover({ name: wh.name, used: wh.used, x: e.clientX + 12, y: e.clientY - 56 })}
          >
            <div className="w-full relative flex items-end h-20 rounded overflow-hidden cursor-pointer">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded" style={{ height: '100%' }} />
              <div
                className="absolute left-0 bottom-0 w-full rounded bg-gradient-to-t from-deep-green to-medium-green"
                style={{
                  height: `${(barH[i] ?? 0) * 100}%`,
                  transition: `height 0.8s cubic-bezier(.34,1.56,.64,1) ${i * 0.08}s`,
                  opacity: 0.9,
                }}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px] text-center">{wh.name}</span>
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{wh.used.toLocaleString()} units</span>
          </div>
        ))}
        <div className="flex flex-col gap-1.5 self-end pb-1 text-xs text-gray-500">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-300 dark:bg-gray-600" /> Max scale</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-medium-green" /> On-hand units</div>
        </div>
      </div>
      {hover && (
        <div className="fixed z-50 app-card px-3 py-2 text-xs pointer-events-none shadow-lg" style={{ left: hover.x, top: hover.y }}>
          <p className="font-semibold text-gray-800 dark:text-gray-100">{hover.name}</p>
          <p className="text-gray-600 dark:text-gray-300 mt-0.5">
            On hand: <span className="font-bold text-deep-green tabular-nums">{hover.used.toLocaleString()}</span> units
          </p>
        </div>
      )}
    </div>
  )
}

function Dashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const isAdmin = useAuthStore((state) => state.isAdmin())
  const isStaff = user?.roleName === 'WAREHOUSE_STAFF'
  const isViewer = user?.roleName === 'VIEWER'
  const canSeeProcurementReorder = isAdmin || isViewer
  const warehouseId = isStaff ? user?.warehouseId : undefined

  const { data: pipelineCount = 0 } = usePendingPipelineOrdersCountQuery()
  const { data: navLowStockCount = 0 } = useLowStockCountQuery()

  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80)
    return () => clearTimeout(t)
  }, [])

  const { data: metricsBundle, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard', 'inventory-metrics'],
    queryFn: async () => {
      const [productRows, stockRows] = await Promise.all([
        fetchAllPages(inventoryApi, '/products'),
        fetchAllPages(inventoryApi, '/stock'),
      ])
      const productById = buildProductLookup(productRows)
      const valueGHS = computeInventoryValueGHS(stockRows, productById)
      const pie = categoryShareByUnits(stockRows, productById)
      let whBars = []
      try {
        whBars = await warehouseStockBars(warehouseApi, stockRows)
      } catch {
        whBars = []
      }
      return {
        productCount: productRows.length,
        inventoryValueGHS: valueGHS,
        categoryPie: pie,
        warehouseBars: whBars,
      }
    },
    staleTime: 60_000,
  })

  const { data: trendData } = useQuery({
    queryKey: ['dashboard', 'order-trend'],
    queryFn: async () => {
      const orderRows = await fetchAllPages(ordersApi, '/')
      return lastSevenDaysOrderTrend(orderRows)
    },
    staleTime: 60_000,
  })

  const { data: lowStockItems = [] } = useQuery({
    queryKey: ['dashboard', 'low-stock', warehouseId],
    queryFn: async () => {
      const r = await inventoryApi.get('/stock/low-stock')
      return Array.isArray(r.data) ? r.data : []
    },
    refetchInterval: 60_000,
    staleTime: 0,
  })

  const { data: ordersData } = useQuery({
    queryKey: ['dashboard', 'orders', warehouseId],
    queryFn: async () => {
      const r = await ordersApi.get('/', { params: { warehouseId, page: 1, limit: 10, sortBy: 'createdAt', order: 'desc' } })
      return r.data
    },
    staleTime: 0,
    refetchInterval: 60_000,
  })

  const { data: receiptsData } = useQuery({
    queryKey: ['dashboard', 'receipts', warehouseId],
    queryFn: async () => {
      const r = await warehouseApi.get('/receipts', { params: { warehouseId, status: 'PENDING', page: 1, limit: 20 } })
      return r.data
    },
    staleTime: 0,
    refetchInterval: 60_000,
  })

  const { data: poData } = useQuery({
    queryKey: ['dashboard', 'purchase-orders', warehouseId],
    queryFn: async () => {
      const r = await procurementApi.get('/purchase-orders', { params: { warehouseId, status: 'SUBMITTED', page: 1, limit: 100 } })
      return r.data
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const { data: productPageData } = useQuery({
    queryKey: ['dashboard', 'products-total'],
    queryFn: async () => {
      const r = await inventoryApi.get('/products', { params: { page: 1, limit: 1 } })
      return r.data
    },
    staleTime: 60_000,
  })

  const { data: reorderRecs = [] } = useQuery({
    queryKey: ['dashboard', 'reorder-recommendations'],
    queryFn: async () => {
      const r = await procurementApi.get('/reorder-recommendations')
      return Array.isArray(r.data) ? r.data : []
    },
    enabled: canSeeProcurementReorder,
    staleTime: 60_000,
  })

  const recentOrders = springPageItems(ordersData)
  const orderTotalCount = springPageTotalElements(ordersData) || recentOrders.length
  const pendingReceipts = springPageItems(receiptsData)
  const poList = springPageItems(poData)
  const overduePOs = poList.filter(
    (po) =>
      po.expectedDelivery &&
      new Date(po.expectedDelivery) < new Date() &&
      !['COMPLETED', 'CANCELLED', 'CLOSED'].includes(String(po.status ?? '').toUpperCase())
  ).length
  const productCatalogTotal = springPageTotalElements(productPageData)

  const invValue = metricsBundle?.inventoryValueGHS ?? 0
  const pieSlices = metricsBundle?.categoryPie?.length
    ? metricsBundle.categoryPie
    : []
  const whRows = metricsBundle?.warehouseBars ?? []

  const labels = trendData?.labels ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const counts = trendData?.counts ?? [0, 0, 0, 0, 0, 0, 0]
  const rev = trendData?.revenue ?? [0, 0, 0, 0, 0, 0, 0]

  const kpiCards = [
    {
      label: 'Active orders',
      sub: 'Pending · processing',
      value: String(pipelineCount),
      icon: ShoppingCart,
      border: 'border-l-[3px] border-l-blue-500',
      iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
      onClick: () => navigate('/orders'),
    },
    {
      label: 'Low stock alerts',
      sub: 'Below reorder threshold',
      value: String(Math.max(navLowStockCount, lowStockItems.length)),
      icon: AlertTriangle,
      border: 'border-l-[3px] border-l-amber-500',
      iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
      pulse: navLowStockCount > 0 || lowStockItems.length > 0,
      onClick: () => navigate('/inventory/low-stock'),
    },
    {
      label: 'Pending receipts',
      sub: 'Awaiting confirmation',
      value: String(pendingReceipts.length),
      icon: PackageCheck,
      border: 'border-l-[3px] border-l-purple-500',
      iconBg: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
      onClick: () => navigate('/warehouse/receipts'),
    },
    {
      label: 'Overdue deliveries',
      sub: 'POs past expected date',
      value: String(overduePOs),
      icon: Truck,
      border: 'border-l-[3px] border-l-red-500',
      iconBg: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
      onClick: () => navigate('/procurement/purchase-orders'),
    },
  ]

  const secondaryCards = [
    {
      label: 'Product catalog',
      sub: 'SKU count',
      value: String(productCatalogTotal || (metricsBundle?.productCount ?? 0)),
      icon: Package,
      onClick: () => navigate('/inventory/products'),
    },
    {
      label: 'Inventory value',
      sub: 'Σ qty × unit cost (GHS)',
      value: formatGHSCompact(invValue),
      raw: true,
      icon: Box,
      onClick: () => navigate('/inventory/stock'),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-400">{format(new Date(), "EEEE, MMMM d, yyyy · HH:mm")}</p>
          {warehouseId && (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              Scoped warehouse · {String(warehouseId).slice(0, 8)}…
            </span>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Warehouse</span>
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              All warehouses
            </span>
          </div>
        )}
      </div>

      {metricsLoading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading inventory metrics…</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon
          return (
            <button
              key={card.label}
              type="button"
              onClick={card.onClick}
              className={`rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/80 ${card.border} opacity-0`}
              style={{ animation: ready ? `fadeSlideUp 0.45s ease forwards ${idx * 0.07}s` : 'none' }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
                <div className={`relative flex h-9 w-9 items-center justify-center rounded-full ${card.iconBg}`}>
                  {card.pulse && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                  )}
                  <Icon size={18} />
                </div>
              </div>
              <p className="mt-3 font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{card.value}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                <Activity size={12} /> {card.sub}
              </p>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {secondaryCards.map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.label}
              type="button"
              onClick={card.onClick}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-blue/30 dark:border-gray-700 dark:bg-gray-800/80"
            >
              <div>
                <p className="text-xs font-medium text-slate-500">{card.label}</p>
                <p className={`mt-1 font-semibold text-slate-900 dark:text-white ${card.raw ? 'font-mono text-xl' : 'text-2xl tabular-nums'}`}>
                  {card.value}
                </p>
                <p className="text-xs text-slate-400">{card.sub}</p>
              </div>
              <div className="rounded-xl bg-slate-100 p-3 dark:bg-gray-700">
                <Icon size={20} className="text-slate-600 dark:text-slate-300" />
              </div>
            </button>
          )
        })}
      </div>


      {(isAdmin || isStaff) && (
        <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-brand-blue-light px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-blue-900/40 dark:bg-blue-950/20">
          <p className="text-sm font-medium text-brand-blue">Quick actions</p>
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/orders/new')}
                  className="h-8 rounded-lg bg-brand-blue px-4 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  + New order
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/inventory/products')}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  + Add product
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/procurement/purchase-orders/new')}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  + Create PO
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/users')}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  + Add user
                </button>
              </>
            )}
            {isStaff && !isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/orders/new')}
                  className="h-8 rounded-lg bg-brand-blue px-4 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  + New order
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/warehouse/receipts')}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700"
                >
                  Receive goods
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/warehouse/movements')}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700"
                >
                  Move stock
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="app-card p-6">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Orders &amp; revenue (last 7 days)</h3>
              <p className="text-xs text-gray-400 mt-0.5">From order history · GHS</p>
            </div>
            <button type="button" onClick={() => navigate('/reports/orders')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <ArrowUpRight size={15} className="text-gray-400" />
            </button>
          </div>
          <div className="flex gap-4 text-xs mb-2 mt-2">
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-emerald-500 inline-block" /><span className="text-gray-500">Orders</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-indigo-400 inline-block border-dashed" /><span className="text-gray-500">Revenue</span></div>
          </div>
          <TrendChart labels={labels} counts={counts} revenue={rev} animate={ready} />
        </div>

        <div className="app-card p-6">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Stock by category</h3>
              <p className="text-xs text-gray-400 mt-0.5">Share of on-hand units by product category</p>
            </div>
            <button type="button" onClick={() => navigate('/inventory/products')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <ArrowUpRight size={15} className="text-gray-400" />
            </button>
          </div>
          <PieChart data={pieSlices} animate={ready} />
        </div>
      </div>

      <div className="app-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white">Stock by warehouse</h3>
            <p className="text-xs text-gray-400 mt-0.5">Total on-hand units per warehouse (from stock levels)</p>
          </div>
        </div>
        <WarehouseChart rows={whRows} animate={ready} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-2 app-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Recent orders</h3>
              <p className="text-xs text-gray-400">Latest in the system · GHS</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/orders')}
              className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-medium hover:underline"
            >
              View all <ArrowRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {recentOrders.map((order) => (
              <div
                key={String(order.orderId)}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/orders/${order.orderId}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/orders/${order.orderId}`)}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors cursor-pointer group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                    {String(order.orderId)}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{order.customerName ?? order.customerId ?? '—'}</p>
                </div>
                <StatusBadge status={order.status} />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                  {formatGHS(order.totalAmount ?? 0)}
                </span>
              </div>
            ))}
            {recentOrders.length === 0 && (
              <p className="px-6 py-8 text-sm text-center text-gray-400">No recent orders</p>
            )}
          </div>
        </div>

        <div className="xl:col-span-2 app-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Low stock</h3>
              <p className="text-xs text-gray-400">From inventory service</p>
            </div>
            <AlertTriangle size={17} className="text-orange-400" />
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {lowStockItems.map((item) => (
              <div key={item.sku ?? item.productId} className="px-6 py-4 hover:bg-orange-50/40 dark:hover:bg-orange-900/10 transition-colors">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white leading-snug">
                    {item.name ?? item.productName ?? item.productId}
                  </p>
                  <span
                    className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${
                      (item.quantityAvailable ?? 0) === 0
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
                        : 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300'
                    }`}
                  >
                    {(item.quantityAvailable ?? 0) === 0 ? 'OUT' : `${item.quantityAvailable} units`}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{item.sku ?? '—'}</p>
                <p className="text-xs text-gray-400 mt-0.5">Reorder at: {item.reorderThreshold ?? 0}</p>
              </div>
            ))}
            {lowStockItems.length === 0 && (
              <p className="px-6 py-8 text-sm text-center text-gray-400">All stock levels healthy</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="app-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Pending receipts</h3>
              <p className="text-xs text-gray-400">Awaiting confirmation</p>
            </div>
            <button type="button" onClick={() => navigate('/warehouse/receipts')} className="flex items-center gap-1 text-emerald-600 text-sm font-medium hover:underline">
              View all <ArrowRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {pendingReceipts.slice(0, 5).map((receipt) => (
              <div
                key={receipt.receiptId ?? receipt.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate('/warehouse/receipts')}
                className="flex items-center gap-4 px-6 py-4 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors cursor-pointer"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <ClipboardList size={16} className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                    {receipt.receiptId ?? receipt.id ?? '—'}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {receipt.supplierName ?? receipt.supplier ?? 'Unknown supplier'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  PENDING
                </span>
              </div>
            ))}
            {pendingReceipts.length === 0 && (
              <p className="px-6 py-8 text-sm text-center text-gray-400">No pending receipts</p>
            )}
          </div>
        </div>

        <div className="app-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Purchase orders</h3>
              <p className="text-xs text-gray-400">Submitted</p>
            </div>
            <div className="flex items-center gap-2">
              {overduePOs > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">
                  {overduePOs} overdue
                </span>
              )}
              <button type="button" onClick={() => navigate('/procurement/purchase-orders')} className="flex items-center gap-1 text-emerald-600 text-sm font-medium hover:underline">
                View all <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {poList.slice(0, 5).map((po) => {
              const isOverdue = po.expectedDelivery && new Date(po.expectedDelivery) < new Date()
              const poKey = po.purchaseOrderId ?? po.poId ?? po.id
              return (
                <div
                  key={String(poKey)}
                  role="button"
                  tabIndex={0}
                  onClick={() => poKey && navigate(`/procurement/purchase-orders/${poKey}`)}
                  onKeyDown={(e) => e.key === 'Enter' && poKey && navigate(`/procurement/purchase-orders/${poKey}`)}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-violet-50/40 dark:hover:bg-violet-900/10 transition-colors cursor-pointer"
                >
                  <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${isOverdue ? 'bg-red-100 dark:bg-red-900/40' : 'bg-violet-100 dark:bg-violet-900/40'}`}>
                    <Clock size={16} className={isOverdue ? 'text-red-500' : 'text-violet-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{String(poKey ?? '—')}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{po.supplierName ?? po.supplier ?? '—'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {isOverdue ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">OVERDUE</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">SUBMITTED</span>
                    )}
                  </div>
                </div>
              )
            })}
            {poList.length === 0 && (
              <p className="px-6 py-8 text-sm text-center text-gray-400">No submitted purchase orders</p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default Dashboard

