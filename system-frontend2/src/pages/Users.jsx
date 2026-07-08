import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Users as UsersIcon, Shield } from 'lucide-react'
import { identityApi } from '../services/axiosInstance'
import { springPageItems } from '../utils/apiNormalize'
import useAuthStore from '../store/authStore'
import { ROLE_IDS } from '../constants/identityRoles'

const ROLE_OPTIONS = [
  { id: ROLE_IDS.VIEWER, label: 'Viewer' },
  { id: ROLE_IDS.WAREHOUSE_STAFF, label: 'Warehouse staff' },
  { id: ROLE_IDS.COMPANY_ADMIN, label: 'Company admin' },
  { id: ROLE_IDS.SUPER_ADMIN, label: 'Platform admin' },
]

const ROLE_NAME_TO_ID = {
  SUPER_ADMIN: ROLE_IDS.SUPER_ADMIN,
  COMPANY_ADMIN: ROLE_IDS.COMPANY_ADMIN,
  WAREHOUSE_STAFF: ROLE_IDS.WAREHOUSE_STAFF,
  VIEWER: ROLE_IDS.VIEWER,
}

export default function Users() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isSuper = user?.roleName === 'SUPER_ADMIN'
  const [companyFilter, setCompanyFilter] = useState('')
  const [roleModal, setRoleModal] = useState(null)
  const [warehouseIdInput, setWarehouseIdInput] = useState('')
  const [roleError, setRoleError] = useState('')

  const { data: companies = [] } = useQuery({
    queryKey: ['identity', 'companies'],
    queryFn: async () => {
      const r = await identityApi.get('/companies')
      return Array.isArray(r.data) ? r.data : []
    },
    enabled: isSuper,
    staleTime: 60_000,
  })

  const companyIdParam = companyFilter || undefined

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['identity', 'users', companyIdParam],
    queryFn: async () => {
      const r = await identityApi.get('/users', {
        params: { page: 1, limit: 100, companyId: companyIdParam },
      })
      return springPageItems(r.data)
    },
    staleTime: 30_000,
  })

  const rows = data ?? []

  const deactivate = useMutation({
    mutationFn: (userId) => identityApi.patch(`/users/${userId}/deactivate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['identity', 'users'] }),
  })

  const patchRole = useMutation({
    mutationFn: ({ userId, body }) => identityApi.patch(`/users/${userId}/role`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identity', 'users'] })
      setRoleModal(null)
      setWarehouseIdInput('')
      setRoleError('')
    },
    onError: (err) => {
      const msg = err?.apiError?.message ?? err?.response?.data?.message ?? 'Could not update role'
      setRoleError(msg)
    },
  })

  function openRoleModal(u) {
    setRoleError('')
    setWarehouseIdInput('')
    setRoleModal(u)
  }

  function submitRole(e) {
    e.preventDefault()
    if (!roleModal) return
    setRoleError('')
    const selected = e.target.elements.roleId.value
    const roleId = selected
    const body = { roleId }
    if (roleId === ROLE_IDS.WAREHOUSE_STAFF) {
      const wid = warehouseIdInput.trim()
      if (!wid) {
        setRoleError('Warehouse UUID is required for warehouse staff')
        return
      }
      body.warehouseId = wid
    }
    patchRole.mutate({ userId: roleModal.userId, body })
  }

  const canChangeRole = (row) => {
    if (!user) return false
    if (row.userId === user.userId) return false
    if (row.role === 'SUPER_ADMIN' && !isSuper) return false
    return true
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-dark-base dark:text-white">User management</h1>
        <p className="text-sm text-gray-500 mt-0.5">Users from identity service</p>
      </div>

      {isSuper && (
        <div className="app-card p-4 flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-600 dark:text-gray-300">
            Company filter
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="ml-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
            >
              <option value="">All companies</option>
              {companies.map((c) => (
                <option key={c.companyId} value={c.companyId}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {isLoading && (
        <div className="app-card p-12 flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-medium-green" size={28} />
          <p className="text-sm text-gray-500">Loading users…</p>
        </div>
      )}

      {isError && (
        <div className="app-card p-6 border-red-200 text-red-600 text-sm">
          Failed to load users (requires admin role and token).{' '}
          <button type="button" onClick={() => refetch()} className="underline font-medium">
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="app-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                      No users
                    </td>
                  </tr>
                ) : (
                  rows.map((u) => (
                    <tr key={u.userId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-medium text-dark-base dark:text-white">
                        <span className="inline-flex items-center gap-2">
                          <UsersIcon size={14} className="text-medium-green shrink-0" />
                          {u.firstName} {u.lastName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.email}</td>
                      <td className="px-4 py-3 text-gray-700">{u.companyName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{u.role}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {u.warehouseId ? String(u.warehouseId).slice(0, 8) + '…' : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            u.active !== false ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {u.active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {canChangeRole(u) && u.active !== false && u.role !== 'SUPER_ADMIN' && (
                            <button
                              type="button"
                              onClick={() => deactivate.mutate(u.userId)}
                              disabled={deactivate.isPending}
                              className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                            >
                              Deactivate
                            </button>
                          )}
                          {canChangeRole(u) && u.active !== false && (
                            <button
                              type="button"
                              onClick={() => openRoleModal(u)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-medium-green hover:underline"
                            >
                              <Shield size={12} /> Role
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {roleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="app-card rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-dark-base dark:text-white mb-1">Change role</h3>
            <p className="text-xs text-gray-500 mb-4">
              {roleModal.firstName} {roleModal.lastName} · {roleModal.email}
            </p>
            <form key={roleModal.userId} onSubmit={submitRole} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Role</label>
                <select
                  name="roleId"
                  defaultValue={ROLE_NAME_TO_ID[roleModal.role] ?? ROLE_IDS.VIEWER}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                >
                  {ROLE_OPTIONS.filter((opt) => isSuper || opt.id !== ROLE_IDS.SUPER_ADMIN).map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-400">
                Current: {String(roleModal.role ?? '').replaceAll('_', ' ')}. Company admin is limited to one active user per company.
              </p>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Warehouse UUID (required for warehouse staff)</label>
                <input
                  value={warehouseIdInput}
                  onChange={(e) => setWarehouseIdInput(e.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  className="w-full px-3 py-2 text-sm font-mono border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                />
              </div>
              {roleError && <p className="text-sm text-red-600">{roleError}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRoleModal(null)
                    setRoleError('')
                  }}
                  className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={patchRole.isPending}
                  className="flex-1 py-2 rounded-lg bg-medium-green text-white text-sm font-semibold disabled:opacity-60"
                >
                  {patchRole.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
