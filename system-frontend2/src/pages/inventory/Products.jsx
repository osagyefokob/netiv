import { useState } from 'react'

import { Search, Plus, Edit, Trash2, ArrowUpDown, Package, Loader2, X, Upload } from 'lucide-react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import useAuthStore from '../../store/authStore'

import { inventoryApi } from '../../services/axiosInstance'

import { springPageItems, springPageTotalElements, springPageTotalPages } from '../../utils/apiNormalize'



const categories = ['All', 'Packaging', 'Hardware', 'Storage', 'Safety']

const categoryOptions = categories.filter((c) => c !== 'All')



const emptyCreateForm = () => ({

  sku: '',

  name: '',

  description: '',

  category: 'Packaging',

  unitOfMeasure: 'EA',

  unitCost: '',

  reorderThreshold: '0',

})



function formatMoney(v) {

  const n = Number(v ?? 0)

  return Number.isFinite(n) ? n.toFixed(2) : '0.00'

}



export default function Products() {

  const isAdmin = useAuthStore((s) => s.isAdmin())



  const [search, setSearch]         = useState('')

  const [category, setCategory]     = useState('All')

  const [page, setPage]             = useState(1)

  const [sortField, setSortField]   = useState(null)

  const [sortDir, setSortDir]       = useState('asc')

  const [deleteTarget, setDeleteTarget] = useState(null)

  const [showAddForm, setShowAddForm]   = useState(false)

  const [editTarget, setEditTarget]     = useState(null)

  const [formError, setFormError]       = useState('')

  const [importFile, setImportFile]     = useState(null)

  const [importFormat, setImportFormat] = useState('csv')

  const [importMessage, setImportMessage] = useState('')

  const [importError, setImportError]   = useState('')

  const [createForm, setCreateForm]     = useState(emptyCreateForm)

  const [editForm, setEditForm]         = useState({

    name: '',

    description: '',

    unitCost: '',

    reorderThreshold: '',

  })



  const queryClient = useQueryClient()



  const { data, isLoading, isError, refetch } = useQuery({

    queryKey: ['products', { page, category, search }],

    queryFn: async () => {

      const response = await inventoryApi.get('/products', {

        params: {

          page,

          limit: 20,

          category: category !== 'All' ? category : undefined,

          search: search || undefined,

        },

      })

      return response.data

    },

    staleTime: 30_000,

    placeholderData: (prev) => prev,

  })

  const products = springPageItems(data)

  const pagination = {

    total: springPageTotalElements(data),

    totalPages: springPageTotalPages(data),

  }



  const deleteProduct = useMutation({

    mutationFn: (productId) => inventoryApi.delete(`/products/${productId}`),

    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),

  })



  const createProduct = useMutation({

    mutationFn: (body) => inventoryApi.post('/products', body),

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ['products'] })

      setShowAddForm(false)

      setCreateForm(emptyCreateForm())

      setFormError('')

    },

    onError: (err) => {

      const msg = err?.apiError?.message ?? err?.response?.data?.message ?? 'Could not create product'

      setFormError(msg)

    },

  })



  const updateProduct = useMutation({

    mutationFn: ({ productId, body }) => inventoryApi.put(`/products/${productId}`, body),

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ['products'] })

      setEditTarget(null)

      setFormError('')

    },

    onError: (err) => {

      const msg = err?.apiError?.message ?? err?.response?.data?.message ?? 'Could not update product'

      setFormError(msg)

    },

  })



  const importProducts = useMutation({

    mutationFn: async ({ file, format }) => {

      const formData = new FormData()

      formData.append('file', file)

      const r = await inventoryApi.post(`/products/import`, formData, { params: { format } })

      return r.data

    },

    onSuccess: (result) => {

      queryClient.invalidateQueries({ queryKey: ['products'] })

      const n = result?.rowsProcessed

      const pu = result?.productsUpserted

      const su = result?.stockLevelsUpdated

      setImportMessage(

        `Import completed: ${n ?? 0} rows, ${pu ?? 0} products upserted, ${su ?? 0} stock rows updated.`

      )

      setImportError('')

      setImportFile(null)

    },

    onError: (err) => {

      const msg = err?.apiError?.message ?? err?.response?.data?.message ?? 'Import failed'

      setImportError(msg)

      setImportMessage('')

    },

  })



  const handleSort = (field) => {

    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))

    else { setSortField(field); setSortDir('asc') }

  }



  const filtered = products

    .filter((p) => {

      const q = search.toLowerCase()

      return (

        (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) &&

        (category === 'All' || p.category === category)

      )

    })

    .sort((a, b) => {

      if (!sortField) return 0

      const dir = sortDir === 'asc' ? 1 : -1

      if (sortField === 'unitCost') return (Number(a.unitCost) - Number(b.unitCost)) * dir

      return String(a[sortField]).localeCompare(String(b[sortField])) * dir

    })



  function openCreate() {

    setFormError('')

    setCreateForm(emptyCreateForm())

    setShowAddForm(true)

  }



  function openEdit(p) {

    setFormError('')

    setEditForm({

      name: p.name ?? '',

      description: p.description ?? '',

      unitCost: String(p.unitCost ?? ''),

      reorderThreshold: String(p.reorderThreshold ?? '0'),

    })

    setEditTarget(p)

  }



  function submitCreate(e) {

    e.preventDefault()

    setFormError('')

    const unitCost = Number(createForm.unitCost)

    const reorderThreshold = parseInt(createForm.reorderThreshold, 10)

    if (!createForm.sku.trim() || !createForm.name.trim()) {

      setFormError('SKU and name are required')

      return

    }

    if (!Number.isFinite(unitCost) || unitCost < 0) {

      setFormError('Unit cost must be a valid non-negative number')

      return

    }

    if (!Number.isFinite(reorderThreshold) || reorderThreshold < 0) {

      setFormError('Reorder threshold must be a non-negative integer')

      return

    }

    createProduct.mutate({

      sku: createForm.sku.trim(),

      name: createForm.name.trim(),

      description: createForm.description.trim() || undefined,

      category: createForm.category,

      unitOfMeasure: createForm.unitOfMeasure.trim() || 'EA',

      unitCost,

      reorderThreshold,

    })

  }



  function submitEdit(e) {

    e.preventDefault()

    if (!editTarget) return

    setFormError('')

    const unitCost = Number(editForm.unitCost)

    const reorderThreshold = parseInt(editForm.reorderThreshold, 10)

    if (!editForm.name.trim()) {

      setFormError('Name is required')

      return

    }

    if (!Number.isFinite(unitCost) || unitCost < 0) {

      setFormError('Unit cost must be a valid non-negative number')

      return

    }

    if (!Number.isFinite(reorderThreshold) || reorderThreshold < 0) {

      setFormError('Reorder threshold must be a non-negative integer')

      return

    }

    updateProduct.mutate({

      productId: editTarget.productId,

      body: {

        name: editForm.name.trim(),

        description: editForm.description.trim() || undefined,

        unitCost,

        reorderThreshold,

      },

    })

  }



  return (

    <div className="space-y-5">



      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-xl font-bold text-dark-base dark:text-white">Products</h2>

          <p className="text-sm text-gray-400 mt-0.5">

            {isLoading ? 'Loading...' : `${products.length} products in catalog`}

          </p>

        </div>

        {isAdmin && (

          <button

            type="button"

            onClick={openCreate}

            className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"

          >

            <Plus size={15} /> Add Product

          </button>

        )}

      </div>



      {isAdmin && (

        <div className="app-card p-4 space-y-3">

          <div className="flex items-center gap-2 text-sm font-semibold text-dark-base dark:text-white">

            <Upload size={16} className="text-medium-green" />

            Import products (CSV or XLSX)

          </div>

          <p className="text-xs text-gray-500">

            Headers: sku, name, category, unit_of_measure, unit_cost, reorder_threshold, quantity_on_hand, location_id (optional: description).

            Uses your selected company (X-Company-Id).

          </p>

          <div className="flex flex-wrap items-end gap-3">

            <div>

              <label className="text-xs text-gray-500 block mb-1">File</label>

              <input

                type="file"

                accept=".csv,.xlsx,.xls"

                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}

                className="text-sm"

              />

            </div>

            <div>

              <label className="text-xs text-gray-500 block mb-1">Format</label>

              <select

                value={importFormat}

                onChange={(e) => setImportFormat(e.target.value)}

                className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"

              >

                <option value="csv">csv</option>

                <option value="xlsx">xlsx</option>

              </select>

            </div>

            <button

              type="button"

              disabled={!importFile || importProducts.isPending}

              onClick={() => importFile && importProducts.mutate({ file: importFile, format: importFormat })}

              className="px-4 py-2 rounded-lg bg-slate-800 dark:bg-slate-600 text-white text-sm font-semibold disabled:opacity-50"

            >

              {importProducts.isPending ? 'Importing…' : 'Run import'}

            </button>

          </div>

          {importMessage && <p className="text-sm text-emerald-600">{importMessage}</p>}

          {importError && <p className="text-sm text-red-600">{importError}</p>}

        </div>

      )}



      <div className="app-card p-4 flex flex-wrap gap-3">

        <div className="relative flex-1 min-w-[200px]">

          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

          <input

            type="text"

            placeholder="Search by name or SKU..."

            value={search}

            onChange={(e) => { setSearch(e.target.value); setPage(1) }}

            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-dark-base dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-all"

          />

        </div>

        <select

          value={category}

          onChange={(e) => { setCategory(e.target.value); setPage(1) }}

          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-dark-base dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"

        >

          {categories.map((c) => <option key={c}>{c}</option>)}

        </select>

      </div>



      {isLoading && (

        <div className="app-card p-12 flex flex-col items-center gap-3">

          <Loader2 size={24} className="animate-spin text-medium-green" />

          <p className="text-sm text-gray-400">Loading products...</p>

        </div>

      )}



      {isError && (

        <div className="app-card border-red-200 dark:border-red-900/40 p-8 text-center">

          <p className="text-sm text-red-500 mb-3">Failed to load products</p>

          <button onClick={() => refetch()} className="px-4 py-2 text-sm bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg hover:bg-red-100 transition-colors">

            Retry

          </button>

        </div>

      )}



      {!isLoading && !isError && (

        <div className="app-card overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>

                <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 text-xs uppercase border-b border-gray-100 dark:border-gray-700">

                  {[

                    { label: 'Product',    field: 'name'             },

                    { label: 'Category',   field: 'category'         },

                    { label: 'Unit',       field: 'unitOfMeasure'    },

                    { label: 'Unit Cost',  field: 'unitCost'         },

                    { label: 'Reorder At', field: 'reorderThreshold' },

                  ].map(({ label, field }) => (

                    <th

                      key={label}

                      onClick={() => handleSort(field)}

                      className="px-6 py-3 text-left font-medium cursor-pointer hover:text-gray-600 dark:hover:text-gray-200 select-none"

                    >

                      <div className="flex items-center gap-1">

                        {label} <ArrowUpDown size={10} className="opacity-40" />

                      </div>

                    </th>

                  ))}

                  {isAdmin && <th className="px-6 py-3" />}

                </tr>

              </thead>

              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">

                {filtered.length === 0 ? (

                  <tr>

                    <td colSpan={6} className="py-12 text-center">

                      <Package size={28} className="mx-auto mb-2 text-gray-300" />

                      <p className="text-sm text-gray-400">No products found</p>

                    </td>

                  </tr>

                ) : filtered.map((p) => (

                  <tr key={p.productId} className="hover:bg-green-50/40 dark:hover:bg-green-900/10 transition-colors group">

                    <td className="px-6 py-4">

                      <p className="font-semibold text-dark-base dark:text-white group-hover:text-medium-green transition-colors">{p.name}</p>

                      <p className="text-xs text-gray-400 mt-0.5">{p.sku}</p>

                    </td>

                    <td className="px-6 py-4">

                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs font-medium">

                        {p.category}

                      </span>

                    </td>

                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs font-mono">{p.unitOfMeasure}</td>

                    <td className="px-6 py-4 font-semibold text-dark-base dark:text-white">GHS {formatMoney(p.unitCost)}</td>

                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{p.reorderThreshold} units</td>

                    {isAdmin && (

                      <td className="px-6 py-4">

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">

                          <button

                            type="button"

                            onClick={() => openEdit(p)}

                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-medium-green transition-all"

                            title="Edit product"

                          >

                            <Edit size={14} />

                          </button>

                          <button

                            type="button"

                            onClick={() => setDeleteTarget(p)}

                            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all"

                            title="Delete product"

                          >

                            <Trash2 size={14} />

                          </button>

                        </div>

                      </td>

                    )}

                  </tr>

                ))}

              </tbody>

            </table>

          </div>



          <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">

            <p className="text-sm text-gray-400">

              Showing {filtered.length} of {pagination.total ?? products.length} products

            </p>

            <div className="flex gap-2">

              <button

                type="button"

                onClick={() => setPage((p) => Math.max(1, p - 1))}

                disabled={page === 1}

                className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-all"

              >

                Previous

              </button>

              <span className="px-3 py-1.5 text-xs bg-medium-green text-white rounded-lg font-semibold">{page}</span>

              <button

                type="button"

                onClick={() => setPage((p) => p + 1)}

                disabled={page >= (pagination.totalPages ?? 1)}

                className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-all"

              >

                Next

              </button>

            </div>

          </div>

        </div>

      )}



      {showAddForm && (

        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

          <div className="app-card rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between mb-4">

              <h3 className="font-bold text-dark-base dark:text-white">Add product</h3>

              <button

                type="button"

                onClick={() => { setShowAddForm(false); setFormError('') }}

                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"

              >

                <X size={18} className="text-gray-500" />

              </button>

            </div>

            <form onSubmit={submitCreate} className="space-y-3">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                <div>

                  <label className="text-xs text-gray-500 block mb-1">SKU *</label>

                  <input

                    required

                    value={createForm.sku}

                    onChange={(e) => setCreateForm((f) => ({ ...f, sku: e.target.value }))}

                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-dark-base dark:text-white"

                  />

                </div>

                <div>

                  <label className="text-xs text-gray-500 block mb-1">Category *</label>

                  <select

                    value={createForm.category}

                    onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}

                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-dark-base dark:text-white"

                  >

                    {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}

                  </select>

                </div>

              </div>

              <div>

                <label className="text-xs text-gray-500 block mb-1">Name *</label>

                <input

                  required

                  value={createForm.name}

                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}

                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-dark-base dark:text-white"

                />

              </div>

              <div>

                <label className="text-xs text-gray-500 block mb-1">Description</label>

                <textarea

                  value={createForm.description}

                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}

                  rows={2}

                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-dark-base dark:text-white resize-none"

                />

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                <div>

                  <label className="text-xs text-gray-500 block mb-1">Unit of measure *</label>

                  <input

                    required

                    placeholder="EA, PCS, KG…"

                    value={createForm.unitOfMeasure}

                    onChange={(e) => setCreateForm((f) => ({ ...f, unitOfMeasure: e.target.value }))}

                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-dark-base dark:text-white"

                  />

                </div>

                <div>

                  <label className="text-xs text-gray-500 block mb-1">Unit cost (GHS) *</label>

                  <input

                    required

                    type="number"

                    min="0"

                    step="0.01"

                    value={createForm.unitCost}

                    onChange={(e) => setCreateForm((f) => ({ ...f, unitCost: e.target.value }))}

                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-dark-base dark:text-white"

                  />

                </div>

              </div>

              <div>

                <label className="text-xs text-gray-500 block mb-1">Reorder threshold</label>

                <input

                  type="number"

                  min="0"

                  value={createForm.reorderThreshold}

                  onChange={(e) => setCreateForm((f) => ({ ...f, reorderThreshold: e.target.value }))}

                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-dark-base dark:text-white"

                />

              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex gap-3 pt-2">

                <button

                  type="button"

                  onClick={() => { setShowAddForm(false); setFormError('') }}

                  className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300"

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  disabled={createProduct.isPending}

                  className="flex-1 py-2 rounded-lg bg-brand-blue hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"

                >

                  {createProduct.isPending ? 'Saving…' : 'Create'}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {editTarget && (

        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

          <div className="app-card rounded-2xl p-6 w-full max-w-lg shadow-xl">

            <div className="flex items-center justify-between mb-4">

              <h3 className="font-bold text-dark-base dark:text-white">Edit product</h3>

              <button

                type="button"

                onClick={() => { setEditTarget(null); setFormError('') }}

                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"

              >

                <X size={18} className="text-gray-500" />

              </button>

            </div>

            <p className="text-xs text-gray-400 mb-3">SKU: <span className="font-mono">{editTarget.sku}</span></p>

            <form onSubmit={submitEdit} className="space-y-3">

              <div>

                <label className="text-xs text-gray-500 block mb-1">Name *</label>

                <input

                  required

                  value={editForm.name}

                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}

                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-dark-base dark:text-white"

                />

              </div>

              <div>

                <label className="text-xs text-gray-500 block mb-1">Description</label>

                <textarea

                  value={editForm.description}

                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}

                  rows={2}

                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-dark-base dark:text-white resize-none"

                />

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                <div>

                  <label className="text-xs text-gray-500 block mb-1">Unit cost (GHS) *</label>

                  <input

                    required

                    type="number"

                    min="0"

                    step="0.01"

                    value={editForm.unitCost}

                    onChange={(e) => setEditForm((f) => ({ ...f, unitCost: e.target.value }))}

                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-dark-base dark:text-white"

                  />

                </div>

                <div>

                  <label className="text-xs text-gray-500 block mb-1">Reorder threshold</label>

                  <input

                    type="number"

                    min="0"

                    value={editForm.reorderThreshold}

                    onChange={(e) => setEditForm((f) => ({ ...f, reorderThreshold: e.target.value }))}

                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-dark-base dark:text-white"

                  />

                </div>

              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex gap-3 pt-2">

                <button

                  type="button"

                  onClick={() => { setEditTarget(null); setFormError('') }}

                  className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300"

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  disabled={updateProduct.isPending}

                  className="flex-1 py-2 rounded-lg bg-brand-blue hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"

                >

                  {updateProduct.isPending ? 'Saving…' : 'Save'}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {deleteTarget && (

        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

          <div className="app-card rounded-2xl p-6 w-full max-w-sm shadow-xl">

            <h3 className="font-bold text-dark-base dark:text-white mb-1">Delete product?</h3>

            <p className="text-sm text-gray-400 mb-5">

              <span className="font-medium text-gray-600 dark:text-gray-300">{deleteTarget.name}</span> will be permanently removed.

            </p>

            <div className="flex gap-3">

              <button

                type="button"

                onClick={() => setDeleteTarget(null)}

                className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"

              >

                Cancel

              </button>

              <button

                type="button"

                onClick={() => {

                  deleteProduct.mutate(deleteTarget.productId)

                  setDeleteTarget(null)

                }}

                className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all"

              >

                Delete

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  )

}


