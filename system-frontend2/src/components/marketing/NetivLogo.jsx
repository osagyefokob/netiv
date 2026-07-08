/** Netiv wordmark + geometric mark (three nodes) — brand #2D5BE3 */
export function NetivMark({ className = 'w-9 h-9' }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="12" cy="12" r="5" fill="#2D5BE3" />
      <circle cx="28" cy="12" r="5" fill="#2D5BE3" />
      <circle cx="20" cy="26" r="5" fill="#2D5BE3" />
      <path d="M16.5 14.5L20 18l3.5-3.5M20 18v6" stroke="#1D4ED8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export default function NetivLogo({ className = '', wordClass = 'text-xl font-semibold text-brand-navy' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <NetivMark />
      <span className={wordClass} style={{ fontSize: '20px' }}>
        Netiv
      </span>
    </div>
  )
}
