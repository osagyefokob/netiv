import { useMemo, useState, useRef, Fragment } from 'react'
import {
  Search, Plus, Download, Loader2,
  FileText, Clock, Loader, Truck, CheckCircle,
  TrendingUp, Filter,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import useAuthStore from '../../store/authStore'
import { ordersApi } from '../../services/axiosInstance'
import { springPageItems, springPageTotalElements, springPageTotalPages } from '../../utils/apiNormalize'

/* ─── constants ─────────────────────────────────────── */
const priorityPillStyles = {
  HIGH:   'bg-red-500   text-white',
  MEDIUM: 'bg-amber-400 text-white',
  LOW:    'bg-green-500 text-white',
}

const ORDER_STATUS_TABS = ['All', 'DRAFT', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

const LIFECYCLE_STEPS = [
  { status: 'DRAFT',      label: 'Draft',      Icon: FileText,    ringHover: 'hover:ring-gray-300/80 dark:hover:ring-gray-500', bar: 'from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500', iconBg: 'bg-gray-100 dark:bg-gray-700', iconColor: 'text-gray-500 dark:text-gray-400', hoverBorder: 'hover:border-gray-300 dark:hover:border-gray-500' },
  { status: 'PENDING',    label: 'Pending',    Icon: Clock,       ringHover: 'hover:ring-amber-400/70', bar: 'from-amber-300 to-amber-500', iconBg: 'bg-amber-100 dark:bg-amber-900/40', iconColor: 'text-amber-500', hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-600' },
  { status: 'PROCESSING', label: 'Processing', Icon: Loader,      ringHover: 'hover:ring-blue-400/70', bar: 'from-blue-300 to-blue-500', iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconColor: 'text-blue-500', hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-600' },
  { status: 'SHIPPED',    label: 'Shipped',    Icon: Truck,       ringHover: 'hover:ring-purple-400/70', bar: 'from-purple-300 to-purple-500', iconBg: 'bg-purple-100 dark:bg-purple-900/40', iconColor: 'text-purple-500', hoverBorder: 'hover:border-purple-300 dark:hover:border-purple-600' },
  { status: 'DELIVERED',  label: 'Delivered',  Icon: CheckCircle, ringHover: 'hover:ring-emerald-400/70', bar: 'from-emerald-300 to-emerald-500', iconBg: 'bg-green-100 dark:bg-green-900/40', iconColor: 'text-green-500', hoverBorder: 'hover:border-emerald-400 dark:hover:border-emerald-600' },
]

const KPI_CARDS = (total, countFn, activeValue) => [
  { label: 'Total Orders', value: total,                              Icon: TrendingUp,  iconBg: 'bg-blue-100   dark:bg-blue-900/40',    iconColor: 'text-blue-500',   valColor: 'text-gray-800 dark:text-white',            hoverBg: 'hover:bg-blue-50   dark:hover:bg-blue-950/20',   hoverBorder: 'hover:border-blue-200   dark:hover:border-blue-700' },
  { label: 'Pending',      value: countFn('PENDING'),                 Icon: Clock,       iconBg: 'bg-amber-100  dark:bg-amber-900/40',   iconColor: 'text-amber-500',  valColor: 'text-amber-600  dark:text-amber-400',      hoverBg: 'hover:bg-amber-50  dark:hover:bg-amber-950/20',  hoverBorder: 'hover:border-amber-200  dark:hover:border-amber-700' },
  { label: 'Processing',   value: countFn('PROCESSING'),              Icon: Loader,      iconBg: 'bg-blue-100   dark:bg-blue-900/40',    iconColor: 'text-blue-500',   valColor: 'text-blue-600   dark:text-blue-400',       hoverBg: 'hover:bg-blue-50   dark:hover:bg-blue-950/20',   hoverBorder: 'hover:border-blue-200   dark:hover:border-blue-700' },
  { label: 'Shipped',      value: countFn('SHIPPED'),                 Icon: Truck,       iconBg: 'bg-purple-100 dark:bg-purple-900/40',  iconColor: 'text-purple-500', valColor: 'text-purple-600 dark:text-purple-400',     hoverBg: 'hover:bg-purple-50 dark:hover:bg-purple-950/20', hoverBorder: 'hover:border-purple-200 dark:hover:border-purple-700' },
  { label: 'Total Value',  value: `$${activeValue.toLocaleString()}`, Icon: CheckCircle, iconBg: 'bg-green-100  dark:bg-green-900/40',   iconColor: 'text-green-500',  valColor: 'text-gray-800   dark:text-white',          hoverBg: 'hover:bg-green-50  dark:hover:bg-green-950/20',  hoverBorder: 'hover:border-green-200  dark:hover:border-green-700' },
]

/* ─── component ─────────────────────────────────────── */
export default function AllOrders() {
  const navigate = useNavigate()
  const user     = useAuthStore((s) => s.user)
  const canEdit  = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF'].includes(user?.roleName)

  const [search,   setSearch]   = useState('')
  const [priority, setPriority] = useState('All')
  const [statusTab, setStatusTab] = useState('All')
  const [page,     setPage]     = useState(1)
  const [pulseStep, setPulseStep] = useState(null)
  const columnRefs = useRef({})

  const warehouseId = user?.roleName === 'WAREHOUSE_STAFF' ? user?.warehouseId : undefined

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['orders', { priority, page, warehouseId, statusTab }],
    queryFn: async () => {
      const response = await ordersApi.get('/', {
        params: {
          priority: priority !== 'All' ? priority : undefined,
          warehouseId,
          status: statusTab === 'All' ? undefined : statusTab,
          page,
          limit: 20,
          sortBy: 'createdAt',
          order:  'desc',
        },
      })
      return response.data
    },
    staleTime: 0,
    placeholderData: (prev) => prev,
  })

  const { data: ordersForCounts = [] } = useQuery({
    queryKey: ['orders', 'status-counts', warehouseId],
    queryFn: async () => {
      const response = await ordersApi.get('/', {
        params: { warehouseId, page: 1, limit: 500, sortBy: 'createdAt', order: 'desc' },
      })
      return springPageItems(response.data)
    },
    staleTime: 60_000,
  })

  const statusCounts = useMemo(() => {
    const m = {}
    ORDER_STATUS_TABS.forEach((s) => {
      if (s === 'All') return
      m[s] = ordersForCounts.filter((o) => o.status === s).length
    })
    return m
  }, [ordersForCounts])

  const orders = springPageItems(data)
  const total  = springPageTotalElements(data) || orders.length
  const totalPages = Math.max(1, springPageTotalPages(data))

  const countByStatus = (s) => orders.filter((o) => o.status === s).length
  const activeValue   = orders
    .filter((o) => !['CANCELLED', 'FAILED'].includes(o.status))
    .reduce((s, o) => s + (o.totalAmount ?? 0), 0)

  /* filtered + sorted for kanban */
  const filtered = useMemo(() => orders
    .filter((o) => {
      const q = search.toLowerCase()
      const oid = String(o.orderId ?? '')
      const cust = String(o.customerName ?? o.customerId ?? '')
      return (
        (cust.toLowerCase().includes(q) || oid.toLowerCase().includes(q)) &&
        (priority === 'All' || o.priority === priority)
      )
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  , [orders, priority, search])

  const scrollToColumn = (status) => {
    setPulseStep(status)
    window.setTimeout(() => setPulseStep(null), 900)
    columnRefs.current[status]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark-base dark:text-white">Orders</h2>
          <p className="text-sm text-gray-400 mt-0.5">Track orders through their complete process from draft to delivery</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-light-bg dark:hover:bg-gray-800 transition-all active:scale-95"
          >
            <Download size={15} /> Export
          </button>
          {canEdit && (
            <button
              onClick={() => navigate('/orders/new')}
              className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
            >
              <Plus size={15} /> Create Order
            </button>
          )}
        </div>
      </div>

      {/* ── KPI summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {KPI_CARDS(total, countByStatus, activeValue).map(({ label, value, Icon, iconBg, iconColor, valColor, hoverBg, hoverBorder }) => (
          <div
            key={label}
            className={`
              bg-white dark:bg-gray-800 rounded-xl
              border border-gray-200 dark:border-gray-700
              px-4 py-3.5 flex items-center justify-between gap-3
              cursor-default
              transition-all duration-200
              hover:-translate-y-0.5 hover:shadow-md
              ${hoverBg} ${hoverBorder}
            `}
          >
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
              <p className={`text-2xl font-bold leading-none ${valColor}`}>{value}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${iconBg}`}>
              <Icon size={18} className={iconColor} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Status tabs ── */}
      <div className="flex flex-wrap gap-2">
        {ORDER_STATUS_TABS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setStatusTab(s); setPage(1) }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              statusTab === s
                ? 'bg-brand-blue text-white border-brand-blue'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brand-blue/40'
            }`}
          >
            {s === 'All' ? 'All' : s.replaceAll('_', ' ')}
            {s !== 'All' && (
              <span className="ml-1.5 opacity-80 tabular-nums">({statusCounts[s] ?? 0})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Global search + priority filter (always visible) ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-gray-400 mr-1">
          <Filter size={14} />
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Filters</span>
        </div>
        {/* search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order ID or customer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-dark-base dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all"
          />
        </div>
        {/* priority filter */}
        <select
          value={priority}
          onChange={(e) => { setPriority(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-dark-base dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all"
        >
          {['All', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
            <option key={p} value={p}>{p === 'All' ? 'All Priorities' : `${p} Priority`}</option>
          ))}
        </select>
        {/* active filter pills */}
        {(search || priority !== 'All') && (
          <div className="flex items-center gap-2">
            {search && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-medium rounded-full">
                "{search}"
                <button onClick={() => setSearch('')} className="hover:text-blue-800 font-bold">×</button>
              </span>
            )}
            {priority !== 'All' && (
              <span className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${priorityPillStyles[priority]}`}>
                {priority}
                <button onClick={() => setPriority('All')} className="hover:opacity-70 font-bold">×</button>
              </span>
            )}
            <button
              onClick={() => { setSearch(''); setPriority('All') }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Order Lifecycle Flow + Kanban ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-sm dark:shadow-gray-900/20">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white text-lg">Order flow</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Click a step to scroll to that column
            </p>
          </div>
        </div>

        {isError && (
          <div className="mb-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-red-600 dark:text-red-400">Failed to load orders.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Interactive stepper — scroll-snap on small screens */}
        <div
          className="
            flex flex-nowrap items-center justify-start sm:justify-between gap-0 mb-8 -mx-1 px-1
            overflow-x-auto pb-3 sm:pb-0 sm:overflow-visible
            snap-x snap-mandatory sm:snap-none
          "
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {LIFECYCLE_STEPS.map((step, idx) => {
            const count = orders.filter((o) => o.status === step.status).length
            const hasOrders = count > 0
            return (
              <Fragment key={step.status}>
                {idx > 0 && (
                  <div
                    className="hidden sm:flex flex-1 items-center self-center min-w-[12px] max-w-full h-8 mx-0.5 group/seg"
                    aria-hidden
                  >
                    <div className="h-0.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className={`h-full w-full origin-left scale-x-0 group-hover/seg:scale-x-100 transition-transform duration-500 ease-out bg-gradient-to-r ${step.bar}`}
                      />
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => scrollToColumn(step.status)}
                  className={`
                    group snap-center shrink-0 flex flex-col items-center text-center
                    w-[92px] sm:flex-1 sm:w-auto sm:min-w-0
                    rounded-2xl px-2 py-3 sm:py-4
                    border border-transparent
                    bg-gray-50/80 dark:bg-gray-900/40
                    transition-all duration-300 ease-out
                    hover:bg-white dark:hover:bg-gray-800/90
                    hover:border-gray-200/80 dark:hover:border-gray-600
                    hover:shadow-lg hover:shadow-gray-200/60 dark:hover:shadow-black/40
                    hover:-translate-y-1
                    active:scale-[0.97]
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-medium-green focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800
                  `}
                >
                  <div
                    className={`
                      relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center mb-2
                      ${step.iconBg}
                      ring-4 ring-transparent transition-all duration-300
                      ${step.ringHover}
                      group-hover:shadow-md group-hover:ring-offset-2 group-hover:ring-offset-white dark:group-hover:ring-offset-gray-800
                    `}
                  >
                    <step.Icon
                      size={22}
                      className={`${step.iconColor} transition-transform duration-300 group-hover:scale-110`}
                    />
                    {hasOrders && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[18px] px-1 flex items-center justify-center rounded-full bg-brand-blue text-[10px] font-bold text-white shadow-sm tabular-nums">
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">
                    {step.label}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums">
                    {count} {count === 1 ? 'order' : 'orders'}
                  </p>
                  <span className="mt-1.5 text-[10px] font-medium text-medium-green max-h-0 opacity-0 overflow-hidden sm:max-h-5 sm:opacity-70 transition-all duration-200 group-hover:max-h-5 group-hover:opacity-100">
                    View column ↓
                  </span>
                </button>
              </Fragment>
            )
          })}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700 mb-4" />

        {/* Kanban — horizontal scroll on narrow viewports */}
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-[2px]">
              <Loader2 size={28} className="animate-spin text-medium-green" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading board…</p>
            </div>
          )}

          <div
            className="
              grid grid-flow-col auto-cols-[min(280px,85vw)] grid-rows-1
              overflow-x-auto gap-3 pb-1 snap-x snap-mandatory
              sm:grid-flow-row sm:auto-cols-auto sm:grid-rows-none sm:overflow-visible sm:snap-none
              sm:grid-cols-1 md:grid-cols-3 xl:grid-cols-5
            "
          >
            {LIFECYCLE_STEPS.map((col) => {
              const colOrders = filtered.filter((o) => o.status === col.status)
              const isPulsing = pulseStep === col.status
              return (
                <div
                  key={col.status}
                  ref={(el) => { columnRefs.current[col.status] = el }}
                  className={`
                    snap-start flex flex-col min-h-[200px] sm:min-h-[220px]
                    rounded-2xl p-2 transition-all duration-500
                    ${isPulsing
                      ? 'ring-2 ring-medium-green ring-offset-2 ring-offset-white dark:ring-offset-gray-800 bg-brand-blue/5 dark:bg-brand-blue/10'
                      : 'ring-0 bg-transparent'
                    }
                  `}
                >
                  <div
                    className="
                      flex items-center gap-2 mb-3 px-1 py-1.5 rounded-xl
                      bg-gray-50/90 dark:bg-gray-900/50 border border-gray-100/80 dark:border-gray-700/80
                      transition-all duration-200 hover:border-gray-200 dark:hover:border-gray-600
                    "
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${col.iconBg}`}>
                      <col.Icon size={15} className={col.iconColor} />
                    </div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200 tracking-tight">{col.label}</span>
                    <span className="ml-auto text-xs font-bold bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full shadow-sm tabular-nums">
                      {colOrders.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5 flex-1 min-h-0">
                    {colOrders.length === 0 ? (
                      <div
                        className="
                          flex-1 flex flex-col items-center justify-center gap-2 py-10 rounded-xl
                          border-2 border-dashed border-gray-200 dark:border-gray-600
                          text-gray-300 dark:text-gray-600
                          transition-colors duration-200 hover:border-gray-300 dark:hover:border-gray-500
                          hover:bg-gray-50/50 dark:hover:bg-gray-900/30
                        "
                      >
                        <col.Icon size={26} className="opacity-40" />
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">No orders</p>
                      </div>
                    ) : colOrders.map((order) => (
                      <div
                        key={String(order.orderId)}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/orders/${order.orderId}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            navigate(`/orders/${order.orderId}`)
                          }
                        }}
                        className={`
                          relative overflow-hidden bg-gray-50 dark:bg-gray-700/35 rounded-xl p-3.5
                          border-2 border-transparent
                          cursor-pointer group/card
                          transition-all duration-300 ease-out
                          hover:bg-white dark:hover:bg-gray-700
                          hover:shadow-lg hover:shadow-gray-200/70 dark:hover:shadow-black/30
                          hover:-translate-y-1 hover:scale-[1.02]
                          active:scale-[0.98]
                          ${col.hoverBorder}
                        `}
                      >
                        <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-white/0 via-medium-green/[0.04] to-medium-green/[0.08] dark:from-transparent dark:via-medium-green/5 dark:to-medium-green/10" />
                        <div className="relative">
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <span className="text-xs font-bold text-gray-800 dark:text-white group-hover/card:text-medium-green transition-colors leading-snug">
                              {String(order.orderId)}
                            </span>
                            {order.priority && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 shadow-sm ${priorityPillStyles[order.priority] || 'bg-gray-200 text-gray-600'}`}>
                                {order.priority?.toLowerCase()}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-snug mb-1.5 truncate">
                            {order.customerName ?? String(order.customerId ?? '—')}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {order.items?.length ?? order.itemCount ?? 0} items · GHS {Number(order.totalAmount ?? 0).toLocaleString()}
                          </p>
                          {order.createdAt && (
                            <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-2">
                              {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          )}
                          <span className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 translate-x-1 group-hover/card:translate-x-0 transition-all duration-300 text-medium-green text-sm font-bold">
                            →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {!isLoading && !isError && filtered.length === 0 && orders.length === 0 && (
          <div className="mt-6 flex flex-col items-center gap-2 py-10 text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            <Search size={28} className="opacity-30" />
            <p className="text-sm">No orders on this page</p>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && orders.length > 0 && (
          <div className="mt-6 flex flex-col items-center gap-2 py-8 text-gray-400">
            <Search size={28} className="opacity-30" />
            <p className="text-sm">No orders match your filters</p>
            {(search || priority !== 'All') && (
              <button
                type="button"
                onClick={() => { setSearch(''); setPriority('All') }}
                className="text-xs text-medium-green hover:underline font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Pagination — compact footer */}
        {!isError && (
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-400">
              Showing <span className="font-semibold text-gray-600 dark:text-gray-300 tabular-nums">{filtered.length}</span>
              {' '}of{' '}
              <span className="font-semibold text-gray-600 dark:text-gray-300 tabular-nums">{total}</span>
              {' '}on this page
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="px-3 py-2 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 disabled:opacity-40 transition-all active:scale-95"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-xs font-bold bg-brand-blue text-white rounded-lg shadow-sm tabular-nums min-w-[2.5rem] text-center">
                {page}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages || isLoading}
                className="px-3 py-2 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 disabled:opacity-40 transition-all active:scale-95"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}