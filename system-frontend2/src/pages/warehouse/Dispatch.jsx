import { Truck } from 'lucide-react'

export default function Dispatch() {
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold text-dark-base dark:text-white">Dispatch</h1>
      <div className="app-card p-6 space-y-3 text-sm text-gray-600 dark:text-gray-300">
        <p className="inline-flex items-center gap-2 font-medium text-dark-base dark:text-white">
          <Truck size={18} className="text-medium-green" />
          Outbound dispatch UI is not wired yet
        </p>
        <p>
          The warehouse service exposes receipts and movements; outbound dispatch flows are handled in the domain
          layer and may be added as dedicated endpoints later. Use <strong>Orders</strong> and{' '}
          <strong>Movements</strong> for operational visibility.
        </p>
      </div>
    </div>
  )
}
