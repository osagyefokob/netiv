import { springPageItems } from './apiNormalize'
import { buildProductLookup, buildWarehouseLookup } from './enrichInventory'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export async function fetchAllPages(api, path, extraParams = {}) {
  let page = 1
  const all = []
  for (;;) {
    const r = await api.get(path, { params: { page, limit: 100, ...extraParams } })
    const items = springPageItems(r.data)
    all.push(...items)
    if (items.length < 100) break
    page += 1
    if (page > 80) break
  }
  return all
}

export function computeInventoryValueGHS(stockRows, productById) {
  let sum = 0
  for (const row of stockRows) {
    const p = productById.get(String(row.productId))
    const cost = Number(p?.unitCost ?? 0)
    sum += (row.quantityOnHand ?? 0) * cost
  }
  return Math.round(sum * 100) / 100
}

const PIE_COLORS = ['#408A71', '#6366f1', '#f59e0b', '#0d9488', '#a78bfa', '#ec4899', '#64748b']

export function categoryShareByUnits(stockRows, productById) {
  const catQty = new Map()
  for (const row of stockRows) {
    const p = productById.get(String(row.productId))
    const cat = p?.category ?? 'Other'
    catQty.set(cat, (catQty.get(cat) ?? 0) + (row.quantityOnHand ?? 0))
  }
  const total = [...catQty.values()].reduce((a, b) => a + b, 0)
  if (total === 0) return []
  let i = 0
  const rows = [...catQty.entries()]
    .map(([label, qty]) => ({
      label,
      qty,
      color: PIE_COLORS[i++ % PIE_COLORS.length],
    }))
    .sort((a, b) => b.qty - a.qty)
  const scaled = rows.map((r) => ({ ...r, pct: (r.qty / total) * 100 }))
  const sumPct = scaled.reduce((s, r) => s + r.pct, 0)
  if (scaled.length && Math.abs(sumPct - 100) > 0.02) {
    const drift = 100 - sumPct
    scaled[scaled.length - 1] = { ...scaled[scaled.length - 1], pct: scaled[scaled.length - 1].pct + drift }
  }
  return scaled.map((r) => ({ ...r, pct: Math.round(r.pct * 10) / 10 }))
}

export async function warehouseStockBars(warehouseApi, stockRows) {
  const wr = await warehouseApi.get('/warehouses', { params: { page: 1, limit: 200 } })
  const warehouses = springPageItems(wr.data)
  const whQty = new Map()
  for (const w of warehouses) {
    whQty.set(String(w.warehouseId), { name: w.name ?? String(w.warehouseId), qty: 0 })
  }
  const locToWh = new Map()
  for (const w of warehouses) {
    const lr = await warehouseApi.get('/locations', { params: { warehouseId: w.warehouseId } })
    const list = Array.isArray(lr.data) ? lr.data : []
    for (const loc of list) {
      locToWh.set(String(loc.locationId), String(loc.warehouseId))
    }
  }
  for (const row of stockRows) {
    const wid = locToWh.get(String(row.locationId))
    if (!wid || !whQty.has(wid)) continue
    const e = whQty.get(wid)
    e.qty += row.quantityOnHand ?? 0
  }
  const rows = [...whQty.values()].filter((x) => x.qty >= 0)
  const maxQty = Math.max(...rows.map((x) => x.qty), 1)
  return rows.map((x) => ({
    name: x.name,
    used: x.qty,
    total: maxQty,
    frac: x.qty / maxQty,
  }))
}

export function lastSevenDaysOrderTrend(orders) {
  const dayStarts = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    dayStarts.push(d.getTime())
  }
  const counts = new Array(7).fill(0)
  const revenue = new Array(7).fill(0)
  const labelFor = (ts) => {
    const d = new Date(ts)
    return DAY_NAMES[d.getDay()]
  }
  const labels = dayStarts.map(labelFor)

  for (const o of orders) {
    if (!o?.createdAt) continue
    const od = new Date(o.createdAt)
    od.setHours(0, 0, 0, 0)
    const t = od.getTime()
    const idx = dayStarts.indexOf(t)
    if (idx >= 0) {
      counts[idx] += 1
      revenue[idx] += Number(o.totalAmount ?? 0)
    }
  }
  return { labels, counts, revenue }
}
