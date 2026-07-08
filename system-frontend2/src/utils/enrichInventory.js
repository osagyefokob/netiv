/** Map productId -> product row from inventory /products page */
export function buildProductLookup(products) {
  const m = new Map()
  for (const p of products || []) {
    const id = String(p.productId ?? p.id ?? '')
    if (id) m.set(id, p)
  }
  return m
}

export function buildWarehouseLookup(warehouses) {
  const m = new Map()
  for (const w of warehouses || []) {
    const id = String(w.warehouseId ?? w.id ?? '')
    if (id) m.set(id, w)
  }
  return m
}

export function shortId(uuid) {
  if (uuid == null) return '—'
  const s = String(uuid)
  return s.length > 8 ? `${s.slice(0, 8)}…` : s
}

/**
 * StockLevelResponse: stockLevelId, productId, locationId, quantityOnHand, quantityReserved, quantityAvailable
 */
export function enrichStockLevel(raw, productById, warehouseById, locationMeta) {
  const pid = String(raw.productId)
  const lid = String(raw.locationId)
  const prod = productById.get(pid)
  const whId = locationMeta?.warehouseIdByLocationId?.get(lid)
  const wh = whId ? warehouseById.get(String(whId)) : null
  const minLevel = prod?.reorderThreshold ?? 0
  return {
    stockLevelId: raw.stockLevelId,
    productId: pid,
    sku: prod?.sku ?? '—',
    name: prod?.name ?? `Product ${shortId(pid)}`,
    category: prod?.category ?? '—',
    locationId: lid,
    location: locationMeta?.locationLabelById?.get(lid) ?? shortId(lid),
    warehouse: wh?.name ?? (whId ? shortId(whId) : '—'),
    warehouseId: whId ?? null,
    quantityOnHand: raw.quantityOnHand ?? 0,
    quantityReserved: raw.quantityReserved ?? 0,
    quantityAvailable: raw.quantityAvailable ?? 0,
    minLevel,
    maxLevel: minLevel > 0 ? minLevel * 10 : 100,
    supplier: '—',
    lastUpdated: raw.lastUpdated ? String(raw.lastUpdated).slice(0, 10) : '—',
    version: raw.version,
  }
}

/**
 * Low stock: same StockLevelResponse[] from /stock/low-stock — enrich with product reorderThreshold
 */
export function enrichLowStockRow(raw, productById, warehouseById, locationMeta) {
  const row = enrichStockLevel(raw, productById, warehouseById, locationMeta)
  const pid = String(raw.productId)
  const prod = productById.get(pid)
  const rt = prod?.reorderThreshold ?? 0
  return {
    ...row,
    name: row.name,
    productName: row.name,
    sku: row.sku,
    warehouseId: row.warehouseId,
    warehouse: row.warehouse,
    quantityAvailable: raw.quantityAvailable ?? 0,
    reorderThreshold: rt,
    currentStock: raw.quantityAvailable ?? 0,
  }
}
