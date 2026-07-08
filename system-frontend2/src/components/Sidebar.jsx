import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Warehouse,
  Truck,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  BoxSelect,
  MapPin,
  ClipboardList,
  ArrowLeftRight,
  Factory,
  FileText,
  AlertTriangle,
  Layers,
  RotateCcw,
  TrendingUp,
  Plus,
  Building2,
} from 'lucide-react'
import useAuthStore from '../store/authStore'
import { identityApi } from '../services/axiosInstance'
import { usePendingPipelineOrdersCountQuery, useLowStockCountQuery } from '../hooks/useNavBadges'
import { NetivMark } from './marketing/NetivLogo'

function SectionLabel({ children }) {
  return (
    <div className="px-3 pt-5 pb-1 text-[10px] font-medium uppercase tracking-[0.8px] text-white/30 first:pt-2">
      {children}
    </div>
  )
}

function blockVisible(block, roleName) {
  if (!roleName) return true
  return block.items.some((item) => {
    if (!item.roles.includes(roleName)) return false
    if (item.disabled) return true
    if (item.path) return true
    if (item.children?.length)
      return item.children.some((c) => c.roles.includes(roleName))
    return false
  })
}

const navTree = [
  {
    section: 'OVERVIEW',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        path: '/dashboard',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'],
      },
    ],
  },
  {
    section: 'OPERATIONS',
    items: [
      {
        id: 'inventory',
        label: 'Inventory',
        icon: Package,
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'],
        badge: 'lowStock',
        children: [
          { label: 'Products', path: '/inventory/products', icon: BoxSelect, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'] },
          { label: 'Stock Levels', path: '/inventory/stock', icon: Layers, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'] },
          { label: 'Low Stock', path: '/inventory/low-stock', icon: AlertTriangle, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'] },
          { label: 'Batches', path: '/inventory/batches', icon: ClipboardList, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'] },
        ],
      },
      {
        id: 'warehouse',
        label: 'Warehouse',
        icon: Warehouse,
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'],
        children: [
          { label: 'Warehouses', path: '/warehouse/warehouses', icon: Warehouse, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] },
          { label: 'Locations', path: '/warehouse/locations', icon: MapPin, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] },
          { label: 'Receipts', path: '/warehouse/receipts', icon: ClipboardList, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'] },
          { label: 'Dispatch', path: '/warehouse/dispatch', icon: Truck, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF'] },
          { label: 'Movements', path: '/warehouse/movements', icon: ArrowLeftRight, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'] },
        ],
      },
      {
        id: 'orders',
        label: 'Orders',
        icon: ShoppingCart,
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'],
        badge: 'pipeline',
        children: [
          { label: 'All Orders', path: '/orders', icon: ShoppingCart, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'] },
          { label: 'Returns', path: '/orders/returns', icon: RotateCcw, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'] },
          { label: 'Create Order', path: '/orders/new', icon: FileText, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF'] },
        ],
      },
      {
        id: 'procurement',
        label: 'Procurement',
        icon: Factory,
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'VIEWER'],
        children: [
          { label: 'Suppliers', path: '/procurement/suppliers', icon: Factory, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'VIEWER'] },
          { label: 'Purchase Orders', path: '/procurement/purchase-orders', icon: FileText, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'VIEWER'] },
          { label: 'New purchase order', path: '/procurement/purchase-orders/new', icon: Plus, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'VIEWER'] },
          { label: 'Reorder suggestions', path: '/procurement/reorder-recommendations', icon: TrendingUp, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'VIEWER'] },
        ],
      },
    ],
  },
  {
    section: 'INTELLIGENCE',
    items: [
      {
        id: 'reports',
        label: 'Reports',
        icon: BarChart3,
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'],
        children: [
          { label: 'Inventory', path: '/reports/inventory', icon: Package, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'] },
          { label: 'Movements', path: '/reports/movements', icon: ArrowLeftRight, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'] },
          { label: 'Orders', path: '/reports/orders', icon: ShoppingCart, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] },
          { label: 'Procurement', path: '/reports/procurement', icon: Factory, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] },
        ],
      },
    ],
  },
  {
    section: 'SYSTEM',
    items: [
      {
        id: 'companies',
        label: 'Companies',
        icon: Building2,
        path: '/companies',
        roles: ['SUPER_ADMIN'],
      },
      {
        id: 'users',
        label: 'Users',
        icon: Users,
        path: '/users',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        path: '/settings',
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
      },
    ],
  },
]

function NavGroup({
  item,
  roleName,
  isCollapsed,
  isMobile,
  onNavigate,
  lowStockCount,
  pipelineCount,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  if (!item.roles.includes(roleName)) return null

  if (item.disabled) {
    return (
      <div
        className="flex h-12 w-full cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-white/30"
        title="Coming soon"
      >
        <item.icon size={16} className="shrink-0 opacity-40" />
        {!(isCollapsed && !isMobile) && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] uppercase text-white/40">Soon</span>
          </>
        )}
      </div>
    )
  }

  if (item.path) {
    const active = location.pathname === item.path
    return (
      <button
        type="button"
        onClick={() => {
          navigate(item.path)
          onNavigate?.()
        }}
        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
          active
            ? 'bg-brand-blue font-medium text-white'
            : 'text-white/60 hover:bg-white/[0.06] hover:text-white/90'
        }`}
      >
        <item.icon size={16} className={`shrink-0 ${active ? 'text-white' : 'text-white/40'}`} />
        {!(isCollapsed && !isMobile) && <span>{item.label}</span>}
      </button>
    )
  }

  const visibleChildren = item.children?.filter((c) => c.roles.includes(roleName)) ?? []
  if (visibleChildren.length === 0) return null

  const isActive = item.children?.some((c) => {
    if (location.pathname === c.path) return true
    if (c.path === '/procurement/purchase-orders') {
      return /^\/procurement\/purchase-orders(\/[0-9a-f-]{36})?$/i.test(location.pathname)
    }
    return location.pathname.startsWith(c.path + '/')
  })
  const [open, setOpen] = useState(isActive)

  const badgeVal =
    item.badge === 'lowStock'
      ? lowStockCount
      : item.badge === 'pipeline'
        ? pipelineCount
        : null

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
          isActive && !open
            ? 'bg-white/[0.06] text-white/90'
            : 'text-white/60 hover:bg-white/[0.06] hover:text-white/90'
        }`}
      >
        <item.icon size={16} className={`shrink-0 ${isActive ? 'text-white' : 'text-white/40'}`} />
        {!(isCollapsed && !isMobile) && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {badgeVal !== null && badgeVal > 0 && (
              <span
                className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  item.badge === 'lowStock'
                    ? 'bg-amber-500/25 text-amber-400'
                    : 'bg-blue-500/25 text-blue-300'
                }`}
              >
                {badgeVal > 99 ? '99+' : badgeVal}
              </span>
            )}
            {open ? <ChevronDown size={14} className="text-white/40" /> : <ChevronRight size={14} className="text-white/40" />}
          </>
        )}
      </button>

      {open && !(isCollapsed && !isMobile) && (
        <div className="ml-2 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
          {visibleChildren.map((child) => {
            const childActive =
              location.pathname === child.path ||
              (child.path === '/procurement/purchase-orders' &&
                /^\/procurement\/purchase-orders\/[0-9a-f-]{36}$/i.test(location.pathname)) ||
              (child.path === '/procurement/purchase-orders/new' &&
                location.pathname.startsWith('/procurement/purchase-orders/new'))
            return (
              <button
                key={child.path}
                type="button"
                onClick={() => {
                  navigate(child.path)
                  onNavigate?.()
                }}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  childActive
                    ? 'bg-brand-blue text-white'
                    : 'text-white/60 hover:bg-white/[0.06] hover:text-white/90'
                }`}
              >
                <child.icon size={14} className="shrink-0 opacity-80" />
                {child.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Sidebar({ isCollapsed, isMobile, isMobileOpen, onCloseMobile }) {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const user = useAuthStore((s) => s.user)
  const { data: lowStockCount = 0 } = useLowStockCountQuery()
  const { data: pipelineCount = 0 } = usePendingPipelineOrdersCountQuery()

  const handleLogout = () => {
    identityApi.post('/auth/logout').catch(() => {})
    clearAuth()
    navigate('/login')
    onCloseMobile?.()
  }

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'U'
  const roleLabel = user?.roleName?.replaceAll('_', ' ') ?? ''

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r dark:border-white/5 border-blue-900/20 dark:bg-brand-navy bg-blue-950
        transition-all duration-300 ease-in-out
        w-60
        ${isMobile ? (isMobileOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
        ${!isMobile && isCollapsed ? 'lg:w-16' : 'lg:w-60'}
        flex-shrink-0
      `}
    >
      <div className="flex h-[60px] flex-shrink-0 items-center border-b border-white/10 px-4">
        {isCollapsed && !isMobile ? (
          <NetivMark className="h-8 w-8" />
        ) : (
          <div className="flex items-center gap-2">
            <NetivMark className="h-9 w-9" />
            <div>
              <p className="text-lg font-semibold leading-tight text-white">Netiv</p>
              <p className="text-[10px] text-white/40">Operations</p>
            </div>
          </div>
        )}
      </div>

      {user?.roleName === 'WAREHOUSE_STAFF' && user?.warehouseId && !(isCollapsed && !isMobile) && (
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1.5 text-xs text-amber-400">
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
          <span className="truncate font-medium">
            Warehouse {String(user.warehouseId).slice(0, 8)}…
          </span>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {navTree.filter((block) => blockVisible(block, user?.roleName)).map((block) => (
          <div key={block.section}>
            {!(isCollapsed && !isMobile) && <SectionLabel>{block.section}</SectionLabel>}
            <div className="space-y-0.5">
              {block.items.map((item) => (
                <NavGroup
                  key={item.id}
                  item={item}
                  roleName={user?.roleName}
                  isCollapsed={isCollapsed}
                  isMobile={isMobile}
                  onNavigate={isMobile ? onCloseMobile : undefined}
                  lowStockCount={lowStockCount}
                  pipelineCount={pipelineCount}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex-shrink-0 border-t border-white/10 p-3">
        {!(isCollapsed && !isMobile) && (
          <div className="mb-4 flex items-center gap-3 px-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {user ? `${user.firstName} ${user.lastName}` : 'User'}
              </p>
              <p className="truncate text-[10px] text-white/40">{roleLabel}</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <LogOut size={16} className="shrink-0" />
          {!(isCollapsed && !isMobile) && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
