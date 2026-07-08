/**
 * Pill status badge — order & stock semantics (Netiv design system).
 * variant: order status key or stock: IN_STOCK | LOW | OUT | RESERVED
 */
const ORDER_STYLES = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING: 'bg-amber-100 text-amber-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
  FAILED: 'bg-red-100 text-red-800',
  DRAFTED: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  ACKNOWLEDGED: 'bg-indigo-100 text-indigo-800',
  PARTIALLY_RECEIVED: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
}

const STOCK_STYLES = {
  IN_STOCK: 'bg-emerald-100 text-emerald-800',
  LOW: 'bg-amber-100 text-amber-800',
  OUT: 'bg-red-100 text-red-800',
  RESERVED: 'bg-blue-100 text-blue-800',
}

const DOT = {
  DRAFT: 'bg-slate-500',
  PENDING: 'bg-amber-500',
  PROCESSING: 'bg-blue-500',
  SHIPPED: 'bg-purple-500',
  DELIVERED: 'bg-emerald-500',
  CANCELLED: 'bg-red-500',
  FAILED: 'bg-red-500',
  DRAFTED: 'bg-slate-500',
  SUBMITTED: 'bg-blue-500',
  ACKNOWLEDGED: 'bg-indigo-500',
  PARTIALLY_RECEIVED: 'bg-amber-500',
  COMPLETED: 'bg-emerald-500',
  IN_STOCK: 'bg-emerald-500',
  LOW: 'bg-amber-500',
  OUT: 'bg-red-500',
  RESERVED: 'bg-blue-500',
}

export default function StatusBadge({ status, className = '' }) {
  if (!status) return null
  const s = String(status).toUpperCase()
  const style = ORDER_STYLES[s] || STOCK_STYLES[s] || 'bg-slate-100 text-slate-600'
  const dot = DOT[s] || 'bg-slate-400'
  return (
    <span
      className={`inline-flex h-[22px] items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium uppercase tracking-wide ${style} ${className}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      {s.replaceAll('_', ' ')}
    </span>
  )
}
