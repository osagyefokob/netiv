import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Menu, ChevronRight, Search, LogOut, User } from 'lucide-react'
import useAuthStore, { DEMO_COMPANY_ID } from '../store/authStore'
import { identityApi } from '../services/axiosInstance'
import ThemeToggle from './ThemeToggle'
import NotificationBell from './NotificationBell'

const PATH_LABELS = {
  dashboard: 'Dashboard',
  inventory: 'Inventory',
  products: 'Products',
  stock: 'Stock Levels',
  'low-stock': 'Low Stock',
  batches: 'Batches',
  orders: 'Orders',
  returns: 'Returns',
  new: 'Create Order',
  warehouse: 'Warehouse',
  warehouses: 'Warehouses',
  locations: 'Locations',
  receipts: 'Receipts',
  dispatch: 'Dispatch',
  movements: 'Movements',
  procurement: 'Procurement',
  suppliers: 'Suppliers',
  'purchase-orders': 'Purchase Orders',
  'reorder-recommendations': 'Reorder Recommendations',
  reports: 'Reports',
  users: 'Users',
  companies: 'Companies',
}

function breadcrumbsFromPath(pathname) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return [{ label: 'Dashboard', to: '/dashboard' }]
  const crumbs = []
  let acc = ''
  parts.forEach((part, i) => {
    acc += `/${part}`
    const label = PATH_LABELS[part] || part.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    crumbs.push({ label, to: acc, last: i === parts.length - 1 })
  })
  return crumbs
}

export default function Navbar({ pageTitle, onToggleSidebar }) {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const selectedCompanyId = useAuthStore((s) => s.selectedCompanyId)
  const setSelectedCompanyId = useAuthStore((s) => s.setSelectedCompanyId)
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'U'

  const crumbs = breadcrumbsFromPath(location.pathname)

  const isSuperAdmin = user?.roleName === 'SUPER_ADMIN'

  const { data: companies = [] } = useQuery({
    queryKey: ['identity', 'companies', 'navbar'],
    queryFn: async () => {
      const r = await identityApi.get('/companies')
      return Array.isArray(r.data) ? r.data : []
    },
    enabled: isSuperAdmin,
    staleTime: 60_000,
  })

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const handleLogout = () => {
    setMenuOpen(false)
    clearAuth()
    navigate('/login')
  }

  return (
    <header
      className="sticky top-0 z-10 flex h-[60px] shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-white px-3 sm:px-4 lg:px-6 dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label="Toggle sidebar"
        >
          <Menu size={22} />
        </button>

        <nav className="hidden min-w-0 items-center gap-1 text-sm text-slate-500 md:flex" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={c.to} className="flex items-center gap-1 truncate">
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-slate-300" />}
              {c.last ? (
                <span className="truncate font-medium text-slate-800 dark:text-white">{pageTitle || c.label}</span>
              ) : (
                <Link to={c.to} className="truncate hover:text-brand-blue">
                  {c.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        <h2 className="truncate text-base font-semibold text-slate-900 dark:text-white md:hidden">{pageTitle}</h2>
      </div>

      <div className="hidden max-w-[380px] flex-1 justify-center px-4 md:flex">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            readOnly
            placeholder="Search products, orders, suppliers..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-14 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-gray-700 dark:text-slate-400">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {isSuperAdmin && (
          <label className="hidden items-center gap-2 text-xs text-slate-500 lg:flex">
            <span className="whitespace-nowrap">Company context</span>
            <select
              value={selectedCompanyId ?? DEMO_COMPANY_ID}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="max-w-[200px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              title="API calls send X-Company-Id for this tenant"
            >
              <option value={DEMO_COMPANY_ID}>Demo company</option>
              {companies.map((c) => (
                <option key={c.companyId} value={String(c.companyId)}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <ThemeToggle />
        <NotificationBell />
        <div className="mx-1 hidden h-5 w-px bg-slate-200 sm:block dark:bg-gray-700" />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-gray-800"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white">
              {initials}
            </div>
            <div className="hidden text-left lg:block">
              <p className="text-sm font-medium text-slate-800 dark:text-white">
                {user ? `${user.firstName} ${user.lastName}` : 'User'}
              </p>
              <p className="text-xs text-slate-400">{user?.roleName?.replaceAll('_', ' ') ?? ''}</p>
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-gray-200 dark:hover:bg-gray-700"
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/dashboard')
                }}
              >
                <User size={16} /> My Profile
              </button>
              <div className="my-1 border-t border-slate-100 dark:border-gray-700" />
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                onClick={handleLogout}
              >
                <LogOut size={16} /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
