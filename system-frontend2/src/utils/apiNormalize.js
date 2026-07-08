/**
 * Spring Data `Page<T>` serializes as `{ content, totalElements, totalPages, ... }`.
 * system-frontend2 previously assumed `{ data, pagination }` in several places.
 */
export function springPageItems(payload) {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  return payload.content ?? payload.data ?? []
}

export function springPageTotalElements(payload) {
  if (!payload || Array.isArray(payload)) return 0
  return typeof payload.totalElements === 'number'
    ? payload.totalElements
    : typeof payload.pagination?.total === 'number'
      ? payload.pagination.total
      : springPageItems(payload).length
}

export function springPageTotalPages(payload) {
  if (!payload || Array.isArray(payload)) return 1
  return typeof payload.totalPages === 'number'
    ? payload.totalPages
    : typeof payload.pagination?.totalPages === 'number'
      ? payload.pagination.totalPages
      : 1
}
