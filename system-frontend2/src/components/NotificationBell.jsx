import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, Package, ShoppingCart, ClipboardList } from 'lucide-react'
import { useOperationalNotifications } from '../hooks/useOperationalNotifications'

const SEGMENT_ICONS = {
  low: Package,
  orders: ShoppingCart,
  receipts: ClipboardList,
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const navigate = useNavigate()
  const { segments, total, isLoading } = useOperationalNotifications()

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const badgeText = total > 99 ? '99+' : String(total)

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="
          relative p-2 rounded-lg text-gray-600 dark:text-gray-300
          hover:bg-light-bg dark:hover:bg-gray-800 transition-colors duration-200
        "
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={total > 0 ? `Notifications, ${total} items` : 'Notifications'}
      >
        <Bell size={20} />
        {!isLoading && total > 0 && (
          <span
            className="
              absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[18px] px-0.5
              bg-red-500 text-white text-[10px] font-bold rounded-full
              flex items-center justify-center tabular-nums shadow-sm
            "
          >
            {badgeText}
          </span>
        )}
      </button>

      {open && (
        <div
          className="
            absolute right-0 top-full mt-1.5 w-[min(100vw-1.5rem,18rem)]
            rounded-xl border border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-950/50 z-50 py-2
          "
        >
          <p className="px-3 pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Operational alerts
          </p>
          {isLoading && (
            <p className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">Loading…</p>
          )}
          {!isLoading && total === 0 && (
            <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
              Nothing needs attention right now.
            </p>
          )}
          {!isLoading && total > 0 && (
            <>
              <ul className="max-h-[min(60vh,20rem)] overflow-y-auto">
                {segments.map((seg) => {
                  const Icon = SEGMENT_ICONS[seg.id] ?? Bell
                  return (
                    <li key={seg.id}>
                      <Link
                        to={seg.to}
                        onClick={() => setOpen(false)}
                        className="
                          flex items-center gap-3 px-3 py-2.5 text-sm
                          hover:bg-light-bg dark:hover:bg-gray-800 transition-colors
                        "
                      >
                        <span className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                          <Icon size={16} />
                        </span>
                        <span className="flex-1 text-left text-gray-700 dark:text-gray-200 font-medium">
                          {seg.label}
                        </span>
                        <span
                          className={`
                            min-w-[1.5rem] px-1.5 py-0.5 rounded-full text-xs font-bold tabular-nums
                            ${seg.count > 0
                              ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                            }
                          `}
                        >
                          {seg.count}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
              <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-2 px-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    navigate(segments.find((s) => s.count > 0)?.to ?? '/dashboard')
                  }}
                  className="w-full py-2 text-xs font-semibold text-medium-green hover:underline"
                >
                  Open first alert
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
