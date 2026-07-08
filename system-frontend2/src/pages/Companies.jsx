import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Loader2, Plus } from 'lucide-react'
import { identityApi } from '../services/axiosInstance'

export default function Companies() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [formError, setFormError] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['identity', 'companies'],
    queryFn: async () => {
      const r = await identityApi.get('/companies')
      return Array.isArray(r.data) ? r.data : []
    },
    staleTime: 30_000,
  })

  const rows = data ?? []

  const createCompany = useMutation({
    mutationFn: (body) => identityApi.post('/companies', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identity', 'companies'] })
      setName('')
      setCode('')
      setFormError('')
    },
    onError: (err) => {
      const msg = err?.apiError?.message ?? err?.response?.data?.message ?? 'Could not create company'
      setFormError(msg)
    },
  })

  function submit(e) {
    e.preventDefault()
    setFormError('')
    const n = name.trim()
    if (!n) {
      setFormError('Name is required')
      return
    }
    createCompany.mutate({ name: n, code: code.trim() || undefined })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-dark-base dark:text-white">Companies</h1>
        <p className="text-sm text-gray-500 mt-0.5">Create and list organizations (platform admin)</p>
      </div>

      <div className="app-card p-5">
        <h2 className="text-sm font-semibold text-dark-base dark:text-white mb-3 flex items-center gap-2">
          <Plus size={16} className="text-medium-green" /> New company
        </h2>
        <form onSubmit={submit} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-gray-500 block mb-1">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-dark-base dark:text-white"
            />
          </div>
          <div className="w-40">
            <label className="text-xs text-gray-500 block mb-1">Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="optional"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-dark-base dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={createCompany.isPending}
            className="px-4 py-2 rounded-lg bg-medium-green hover:bg-deep-green text-white text-sm font-semibold disabled:opacity-60"
          >
            {createCompany.isPending ? 'Saving…' : 'Create'}
          </button>
        </form>
        {formError && <p className="text-sm text-red-600 mt-2">{formError}</p>}
      </div>

      {isLoading && (
        <div className="app-card p-12 flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-medium-green" size={28} />
          <p className="text-sm text-gray-500">Loading companies…</p>
        </div>
      )}

      {isError && (
        <div className="app-card p-6 border-red-200 text-red-600 text-sm">
          Failed to load companies.{' '}
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-gray-400">
                      No companies yet
                    </td>
                  </tr>
                ) : (
                  rows.map((c) => (
                    <tr key={c.companyId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-medium text-dark-base dark:text-white">
                        <span className="inline-flex items-center gap-2">
                          <Building2 size={14} className="text-medium-green shrink-0" />
                          {c.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.code || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            c.active !== false ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {c.active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
