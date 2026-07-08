import { create } from 'zustand'

/** Default tenant for super-admin API calls when no company is selected (matches backend DemoCompany). */
export const DEMO_COMPANY_ID = 'e0000000-0000-0000-0000-000000000001'

const useAuthStore = create((set, get) => ({
  accessToken: null,
  user: null,
  /** Effective tenant for X-Company-Id (super-admin can switch). */
  selectedCompanyId: null,

  setAuth: (accessToken, user) =>
    set({
      accessToken,
      user,
      selectedCompanyId:
        user?.companyId != null ? String(user.companyId) : user?.roleName === 'SUPER_ADMIN' ? DEMO_COMPANY_ID : null,
    }),

  setSelectedCompanyId: (id) => set({ selectedCompanyId: id != null ? String(id) : null }),

  clearAuth: () => set({ accessToken: null, user: null, selectedCompanyId: null }),

  isAuthenticated: () => Boolean(get().accessToken),
  hasPermission: (resource, action) => {
    const permissions = get().user?.permissions ?? []
    return permissions.includes(`${resource}:${action}`)
  },
  isSuperAdmin: () => get().user?.roleName === 'SUPER_ADMIN',
  isCompanyAdmin: () => get().user?.roleName === 'COMPANY_ADMIN',
  isAdmin: () => ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(get().user?.roleName),
  isWarehouseStaff: () => get().user?.roleName === 'WAREHOUSE_STAFF',
  getWarehouseId: () => get().user?.warehouseId ?? null,
  effectiveCompanyId: () => {
    const u = get().user
    if (!u) return DEMO_COMPANY_ID
    if (u.roleName === 'SUPER_ADMIN') return get().selectedCompanyId ?? DEMO_COMPANY_ID
    return u.companyId != null ? String(u.companyId) : DEMO_COMPANY_ID
  },
}))

export default useAuthStore