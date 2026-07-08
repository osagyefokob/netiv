import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

import Sidebar     from './components/Sidebar'
import Navbar      from './components/Navbar'
import ThemeToggle from './components/ThemeToggle'
import RAGChatbotPlaceholder from './components/ai/RAGChatbotPlaceholder'
import Login       from './pages/Login'
import LandingPage from './pages/public/LandingPage'
import SignupPage  from './pages/public/SignupPage'
import Dashboard   from './pages/Dashboard'
import Users       from './pages/Users'
import Companies   from './pages/Companies'
import Settings    from './pages/Settings'
import useAuthStore from './store/authStore'

// Inventory sub-pages
import Products    from './pages/inventory/Products'
import StockLevels from './pages/inventory/StockLevels'
import LowStock    from './pages/inventory/LowStock'
import Batches     from './pages/inventory/Batches'

// Orders sub-pages
import AllOrders   from './pages/orders/AllOrders'
import CreateOrder from './pages/orders/CreateOrder'
import OrderDetail from './pages/orders/OrderDetail'
import ReturnsList from './pages/orders/returns/ReturnsList'
import ReturnDetail from './pages/orders/returns/ReturnDetail'

// Warehouse sub-pages
import Warehouses  from './pages/warehouse/Warehouses'
import Locations   from './pages/warehouse/Locations'
import Receipts    from './pages/warehouse/Receipts'
import Dispatch    from './pages/warehouse/Dispatch'
import Movements   from './pages/warehouse/Movements'

// Procurement sub-pages
import Suppliers      from './pages/procurement/Suppliers'
import PurchaseOrders from './pages/procurement/PurchaseOrders'
import PurchaseOrderCreate from './pages/procurement/PurchaseOrderCreate'
import PODetail from './pages/procurement/PODetail'
import ReorderRecommendations from './pages/procurement/ReorderRecommendations'

// Reports sub-pages
import InventoryReport   from './pages/reports/InventoryReport'
import MovementsReport   from './pages/reports/MovementsReport'
import OrdersReport      from './pages/reports/OrdersReport'
import ProcurementReport from './pages/reports/ProcurementReport'

const pageTitles = {
  '/dashboard':                      'Dashboard',
  '/inventory/products':             'Products',
  '/inventory/stock':                'Stock Levels',
  '/inventory/low-stock':            'Low Stock',
  '/inventory/batches':              'Batches',
  '/orders':                         'All Orders',
  '/orders/new':                     'Create Order',
  '/orders/returns':                 'Returns',
  '/procurement/reorder-recommendations': 'Reorder Recommendations',
  '/warehouse/warehouses':           'Warehouses',
  '/warehouse/locations':            'Locations',
  '/warehouse/receipts':             'Receipts',
  '/warehouse/dispatch':             'Dispatch',
  '/warehouse/movements':            'Movements',
  '/procurement/suppliers':          'Suppliers',
  '/procurement/purchase-orders':    'Purchase Orders',
  '/procurement/purchase-orders/new': 'Create Purchase Order',
  '/reports/inventory':              'Inventory Report',
  '/reports/movements':              'Movements Report',
  '/reports/orders':                 'Orders Report',
  '/reports/procurement':            'Procurement Report',
  '/users':                          'User Management',
  '/companies':                      'Companies',
}

function resolvePageTitle(pathname) {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (/^\/orders\/returns\/[^/]+$/i.test(pathname)) return 'Return detail'
  if (/^\/orders\/[0-9a-f-]{36}$/i.test(pathname)) return 'Order detail'
  if (/^\/procurement\/purchase-orders\/[0-9a-f-]{36}$/i.test(pathname)) return 'Purchase order'
  return 'Dashboard'
}

function ProtectedRoute({ children }) {
  const accessToken = useAuthStore((state) => state.accessToken)
  if (!accessToken) return <Navigate to="/login" replace />
  return children
}

function PublicHomeRoute() {
  const accessToken = useAuthStore((state) => state.accessToken)
  if (accessToken) return <Navigate to="/dashboard" replace />
  return <LandingPage />
}

function PublicSignupRoute() {
  const accessToken = useAuthStore((state) => state.accessToken)
  if (accessToken) return <Navigate to="/dashboard" replace />
  return <SignupPage />
}

function RoleRoute({ allowedRoles, children }) {
  const user = useAuthStore((state) => state.user)
  if (!user || !allowedRoles.includes(user.roleName)) {
    return <Navigate to="/unauthorized" replace />
  }
  return children
}

function UnauthorizedPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-light-bg dark:bg-gray-950 p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center shadow-sm dark:shadow-gray-900/40">
        <h1 className="text-xl font-bold text-dark-base dark:text-white mb-2">Unauthorized</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">You do not have permission to access this page.</p>
      </div>
    </div>
  )
}

function AppLayout({ isMobile, isSidebarCollapsed, isMobileSidebarOpen, toggleSidebar, closeMobileSidebar }) {
  const location = useLocation()
  const pageTitle = resolvePageTitle(location.pathname)

  return (
    <div className="relative flex h-screen overflow-hidden bg-surface dark:bg-gray-950">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isMobile={isMobile}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
      />

      {isMobile && isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Fixed sidebar is out of flow — offset main column on lg+ so content is not covered */}
      <div
        className={`flex min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-300 ease-in-out ${
          isMobile ? '' : isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
        }`}
      >
        <Navbar
          pageTitle={pageTitle}
          onToggleSidebar={toggleSidebar}
        />

        <main className="relative flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <Routes>
            <Route path="/"            element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"   element={<Dashboard />} />
            <Route path="/users"       element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN']}><Users /></RoleRoute>} />
            <Route path="/companies"   element={<RoleRoute allowedRoles={['SUPER_ADMIN']}><Companies /></RoleRoute>} />
            <Route path="/settings"     element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN']}><Settings /></RoleRoute>} />

            {/* Inventory */}
            <Route path="/inventory/products"  element={<Products />} />
            <Route path="/inventory/stock"     element={<StockLevels />} />
            <Route path="/inventory/low-stock" element={<LowStock />} />
            <Route path="/inventory/batches"   element={<Batches />} />

            {/* Orders — static paths before /orders/:orderId */}
            <Route path="/orders/returns/:returnId" element={<ReturnDetail />} />
            <Route path="/orders/returns" element={<ReturnsList />} />
            <Route path="/orders/new" element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF']}><CreateOrder /></RoleRoute>} />
            <Route path="/orders/:orderId" element={<OrderDetail />} />
            <Route path="/orders" element={<AllOrders />} />

            {/* Warehouse */}
            <Route path="/warehouse/warehouses" element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN']}><Warehouses /></RoleRoute>} />
            <Route path="/warehouse/locations"  element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN']}><Locations /></RoleRoute>} />
            <Route path="/warehouse/receipts"   element={<Receipts />} />
            <Route path="/warehouse/dispatch"   element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF']}><Dispatch /></RoleRoute>} />
            <Route path="/warehouse/movements"  element={<Movements />} />

            {/* Procurement */}
            <Route path="/procurement/suppliers"       element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'VIEWER']}><Suppliers /></RoleRoute>} />
            <Route path="/procurement/purchase-orders/new" element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'VIEWER']}><PurchaseOrderCreate /></RoleRoute>} />
            <Route path="/procurement/purchase-orders/:poId" element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'VIEWER']}><PODetail /></RoleRoute>} />
            <Route path="/procurement/purchase-orders" element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'VIEWER']}><PurchaseOrders /></RoleRoute>} />
            <Route path="/procurement/reorder-recommendations" element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'VIEWER']}><ReorderRecommendations /></RoleRoute>} />

            {/* Reports */}
            <Route path="/reports/inventory"   element={<InventoryReport />} />
            <Route path="/reports/movements"   element={<MovementsReport />} />
            <Route path="/reports/orders"      element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN']}><OrdersReport /></RoleRoute>} />
            <Route path="/reports/procurement" element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN']}><ProcurementReport /></RoleRoute>} />
          </Routes>
          <RAGChatbotPlaceholder />
        </main>
      </div>
    </div>
  )
}

function App() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (!mobile) setIsMobileSidebarOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const toggleSidebar = () => {
    if (isMobile) setIsMobileSidebarOpen((prev) => !prev)
    else setIsSidebarCollapsed((prev) => !prev)
  }

  const closeMobileSidebar = () => setIsMobileSidebarOpen(false)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicHomeRoute />} />
        <Route path="/signup" element={<PublicSignupRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout
                isMobile={isMobile}
                isSidebarCollapsed={isSidebarCollapsed}
                isMobileSidebarOpen={isMobileSidebarOpen}
                toggleSidebar={toggleSidebar}
                closeMobileSidebar={closeMobileSidebar}
              />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App