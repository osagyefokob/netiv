import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Menu, X, UserPlus, Package, Activity, BarChart3, Warehouse, Truck } from 'lucide-react'
import NetivLogo, { NetivMark } from '../../components/marketing/NetivLogo'
import ThemeToggle from '../../components/ThemeToggle'
import useThemeStore from '../../store/themeStore'

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: 'easeOut' },
  viewport: { once: true, margin: '-100px' },
}

const TICKER = [
  'Real-time Stock Tracking',
  'Multi-warehouse Support',
  'Order Saga Orchestration',
  'Batch & Expiry Management',
  'Inbound Receiving Workflows',
  'Supplier & PO Management',
  'Role-based Access Control',
  'Event-driven Architecture',
  'Automated Low-stock Alerts',
  'Cryptographic Audit Trails',
]

const TABS = [
  {
    id: 'inventory',
    label: 'Inventory',
    bullets: [
      'Real-time stock levels across all locations',
      'Multi-warehouse and multi-bin location tracking',
      'Batch/lot tracking with expiry date management',
      'Automated low-stock alerts with threshold configuration',
      'Stock reservation and release with optimistic locking',
      'Manual adjustment with full audit trail',
      'Product catalog with category, UoM, and cost tracking',
    ],
    mockTitle: 'Stock levels',
  },
  {
    id: 'warehouse',
    label: 'Warehouse',
    bullets: [
      'Zone → Aisle → Shelf → Bin location hierarchy',
      'Inbound receiving with partial receipt support',
      'Putaway workflow with location assignment',
      'Outbound dispatch with pick confirmation',
      'Internal stock movements with full tracking',
      'Location capacity monitoring with occupancy bars',
      'Warehouse utilization overview',
    ],
    mockTitle: 'Location grid',
  },
  {
    id: 'orders',
    label: 'Orders',
    bullets: [
      'Full order lifecycle (Draft → Shipped → Delivered)',
      'Distributed Saga orchestration for reliable fulfillment',
      'Automatic stock reservation on order submission',
      'Order assignment to warehouse staff',
      'Priority queue (Standard / High / Urgent)',
      'Complete status history timeline per order',
      'Automatic compensation on failure — no orphaned reservations',
    ],
    mockTitle: 'Orders & priorities',
  },
  {
    id: 'procurement',
    label: 'Procurement',
    bullets: [
      'Supplier management with rating and lead time tracking',
      'Purchase order lifecycle (Draft → Received)',
      'PO line items with expected vs received quantities',
      'Overdue delivery monitoring and alerts',
      'Automatic inventory update on goods receipt',
      'Payment terms management per supplier',
    ],
    mockTitle: 'Purchase orders',
  },
  {
    id: 'reporting',
    label: 'Reporting',
    bullets: [
      'Inventory snapshot across all warehouses',
      'Stock movement trends (inbound vs outbound)',
      'Order fulfilment rate and timing analytics',
      'Low-stock summary with reorder recommendations',
      'Procurement performance by supplier',
      'Export to CSV for external analysis',
    ],
    mockTitle: 'Analytics',
  },
]

function HeroMockup() {
  return (
    <div className="relative animate-float">
      <div className="absolute -top-6 -left-4 z-10 rotate-[-2deg] rounded-lg bg-white px-3 py-1.5 text-xs shadow-md text-slate-700 dark:bg-gray-800 dark:text-slate-200">
        Live stock levels
      </div>
      <div className="absolute top-1/3 -right-4 z-10 rotate-[2deg] rounded-lg bg-white px-3 py-1.5 text-xs shadow-md text-slate-700 dark:bg-gray-800 dark:text-slate-200">
        Real-time events
      </div>
      <div className="absolute -top-6 right-8 z-10 rotate-[2deg] rounded-lg bg-white px-3 py-1.5 text-xs shadow-md text-slate-700 dark:bg-gray-800 dark:text-slate-200">
        Role-based access
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex">
          <div className="w-44 shrink-0 bg-brand-navy p-3 text-white">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold">
              <span className="h-2 w-2 rounded-full bg-brand-blue" />
              Netiv
            </div>
            <div className="space-y-1 text-[10px] text-white/60">
              <div className="rounded bg-brand-blue/20 px-2 py-1 text-white">Dashboard</div>
              <div className="px-2 py-1">Inventory</div>
              <div className="px-2 py-1">Warehouse</div>
              <div className="px-2 py-1">Orders</div>
            </div>
          </div>
          <div className="flex-1 p-4">
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Active Orders', v: '47', c: 'border-l-blue-500' },
                { label: 'Low Stock', v: '8', c: 'border-l-amber-500' },
                { label: 'Pending Receipts', v: '3', c: 'border-l-purple-500' },
                { label: 'Overdue', v: '2', c: 'border-l-red-500' },
              ].map((k) => (
                <div key={k.label} className={`rounded-lg border border-slate-100 bg-slate-50 p-2 border-l dark:border-gray-600 dark:bg-gray-800/80 ${k.c}`}>
                  <div className="text-[9px] uppercase text-slate-500 dark:text-slate-400">{k.label}</div>
                  <div className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100">{k.v}</div>
                </div>
              ))}
            </div>
            <div className="mb-3 text-xs font-medium text-slate-600 dark:text-slate-400">Order Activity</div>
            <div className="mb-4 h-24 rounded-lg bg-slate-50 p-2 dark:bg-gray-800/50">
              <svg viewBox="0 0 280 80" className="h-full w-full" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="#2D5BE3"
                  strokeWidth="2"
                  points="0,55 40,38 80,48 120,28 160,42 200,22 240,32 280,28"
                />
                <polyline
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="2"
                  points="0,65 40,52 80,58 120,48 160,52 200,45 240,48 280,40"
                />
              </svg>
            </div>
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Recent orders</div>
            <table className="mt-2 w-full text-[10px]">
              <tbody>
                {[
                  ['O-1024', 'PROCESSING'],
                  ['O-1023', 'SHIPPED'],
                  ['O-1022', 'DELIVERED'],
                ].map(([id, st]) => (
                  <tr key={id} className="border-t border-slate-100 dark:border-gray-700">
                    <td className="py-1 font-mono text-slate-700 dark:text-slate-300">{id}</td>
                    <td className="py-1 text-right">
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800">{st}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function TabMock({ title }) {
  return (
    <div className="relative min-h-[220px] rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 dark:border-gray-700 dark:from-gray-900 dark:to-gray-950">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{title}</div>
      <div className="mt-4 space-y-2">
        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-gray-700" />
        <div className="h-2 w-[80%] rounded-full bg-slate-200 dark:bg-gray-700" />
        <div className="h-2 w-[60%] rounded-full bg-emerald-200 dark:bg-emerald-800/60" />
      </div>
    </div>
  )
}

export default function LandingPage() {
  const theme = useThemeStore((s) => s.theme)
  const [navShadow, setNavShadow] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [tab, setTab] = useState('inventory')

  useEffect(() => {
    const onScroll = () => setNavShadow(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileOpen(false)
  }

  const active = TABS.find((t) => t.id === tab) || TABS[0]

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-gray-950 dark:text-slate-100">
      <header
        className={`sticky top-0 z-50 border-b border-slate-100 bg-white transition-shadow dark:border-gray-800 dark:bg-gray-950 ${
          navShadow ? 'shadow-sm dark:shadow-gray-900/40' : ''
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 lg:px-6">
          <Link to="/" className="flex items-center gap-2">
            <NetivLogo wordClass="text-xl font-semibold text-brand-navy dark:text-white" />
          </Link>
          <nav className="hidden items-center gap-8 lg:flex">
            {['Features', 'How It Works', "Who It's For", 'Contact'].map((label, i) => {
              const id = ['features', 'how-it-works', 'who-its-for', 'cta-footer'][i]
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => scrollTo(id)}
                  className="text-sm text-slate-600 transition hover:text-brand-blue dark:text-slate-300 dark:hover:text-white"
                >
                  {label}
                </button>
              )
            })}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Create Account
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              className="rounded-lg p-2 text-slate-800 dark:text-slate-200 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white dark:bg-gray-950 lg:hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 dark:border-gray-800">
            <NetivLogo wordClass="text-xl font-semibold text-brand-navy dark:text-white" />
            <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex flex-col gap-4 p-6">
            {['Features', 'How It Works', "Who It's For", 'Contact'].map((label, i) => {
              const id = ['features', 'how-it-works', 'who-its-for', 'cta-footer'][i]
              return (
                <button
                  key={label}
                  type="button"
                  className="text-left text-lg text-slate-700 dark:text-slate-200"
                  onClick={() => scrollTo(id)}
                >
                  {label}
                </button>
              )
            })}
            <Link to="/login" className="text-lg font-medium text-brand-blue" onClick={() => setMobileOpen(false)}>
              Log In
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-brand-blue py-3 text-center font-semibold text-white"
              onClick={() => setMobileOpen(false)}
            >
              Create Account
            </Link>
          </div>
        </div>
      )}

      <section className="mx-auto grid min-h-[92vh] max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:px-6">
        <motion.div {...fadeUp}>
          <div className="mb-4 inline-block rounded-full bg-brand-blue-light px-3 py-1 text-xs font-medium text-brand-blue dark:bg-brand-blue/20 dark:text-blue-300">
            Cloud-native logistics operations platform
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-brand-navy dark:text-white lg:text-[56px] lg:leading-tight">
            Total visibility. Smarter operations.
          </h1>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-slate-500 dark:text-slate-400">
            Netiv connects your warehouses, inventory, orders, and procurement in a single real-time platform —
            built for operations teams who need to move fast without losing control.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/signup"
              className="inline-flex h-12 items-center rounded-lg bg-brand-blue px-8 text-sm font-semibold text-white transition hover:scale-105 hover:bg-blue-700"
            >
              Create Account →
            </Link>
            <button
              type="button"
              onClick={() => scrollTo('how-it-works')}
              className="text-sm font-medium text-brand-blue underline decoration-brand-blue/30 underline-offset-4 hover:decoration-brand-blue"
            >
              See How It Works
            </button>
          </div>
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            Trusted by operations teams across 🇬🇭 🇳🇬 🇰🇪 🇿🇦
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {['Real-time stock sync', '7 integrated services', 'Event-driven architecture'].map((t) => (
              <span key={t} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-slate-300">
                {t}
              </span>
            ))}
          </div>
        </motion.div>
        <motion.div {...fadeUp}>
          <HeroMockup />
        </motion.div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50 py-6 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <p className="mb-4 text-sm font-medium text-slate-600 dark:text-slate-400">Designed for the full operational lifecycle:</p>
          <div className="overflow-hidden">
            <div className="animate-marquee flex gap-3 whitespace-nowrap">
              {[...TICKER, ...TICKER].map((t, i) => (
                <span
                  key={`${t}-${i}`}
                  className="inline-block rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-slate-300"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
        <motion.div {...fadeUp} className="text-center">
          <p className="text-sm font-medium text-brand-blue">Platform Capabilities</p>
          <h2 className="mt-2 text-3xl font-bold text-brand-navy dark:text-white">Everything your operations team needs</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-500 dark:text-slate-400">
            From warehouse floor to management dashboard — Netiv covers the full lifecycle of inventory and logistics
            operations.
          </p>
        </motion.div>
        <div className="mt-10 flex flex-wrap gap-2 border-b border-slate-200 dark:border-gray-700">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <motion.div {...fadeUp} className="mt-10 grid gap-10 lg:grid-cols-2">
          <ul className="space-y-3">
            {active.bullets.map((b) => (
              <li key={b} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="text-emerald-500">✓</span>
                {b}
              </li>
            ))}
          </ul>
          <TabMock title={active.mockTitle} />
        </motion.div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
        <motion.div {...fadeUp} className="text-center">
          <p className="text-sm font-medium text-brand-blue">Simple by design</p>
          <h2 className="mt-2 text-3xl font-bold text-brand-navy dark:text-white">Up and running in minutes</h2>
        </motion.div>
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {[
            {
              icon: UserPlus,
              title: 'Create your account',
              body: 'Register in minutes. No credit card required. Admin sets up your warehouse structure, locations, and invites your team.',
              circle: 'bg-brand-blue',
            },
            {
              icon: Package,
              title: 'Set up your inventory',
              body: 'Add your products, configure locations, and import stock levels. Your team gets role-appropriate access from day one.',
              circle: 'bg-teal-500',
            },
            {
              icon: Activity,
              title: 'Operate in real time',
              body: 'Receive goods, process orders, track stock, and manage suppliers — all connected in a single event-driven platform.',
              circle: 'bg-emerald-500',
            },
          ].map((s, i) => (
            <motion.div key={s.title} {...fadeUp} className="relative text-center">
              {i < 2 && (
                <div className="absolute left-[60%] top-10 hidden h-px w-[80%] bg-slate-200 dark:bg-gray-700 lg:block" />
              )}
              <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-white ${s.circle}`}>
                <s.icon className="h-7 w-7" />
              </div>
              <h3 className="font-semibold text-brand-navy dark:text-white">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{s.body}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <Link
            to="/signup"
            className="inline-flex h-12 items-center rounded-lg bg-brand-blue px-8 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Create Account
          </Link>
        </div>
      </section>

      <section id="who-its-for" className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              icon: BarChart3,
              title: 'Operations Managers',
              desc: 'Full visibility across all warehouses, real-time KPIs, and the reporting you need to make fast decisions without opening a spreadsheet.',
              pills: ['Dashboard', 'Reports', 'Multi-warehouse', 'Exports'],
              accent: 'hover:border-l-blue-500',
            },
            {
              icon: Warehouse,
              title: 'Warehouse Staff',
              desc: 'Task-focused views scoped to your location. Receive goods, process orders, move stock, and confirm dispatches — all from a clean, role-aware interface.',
              pills: ['Receiving', 'Putaway', 'Dispatch', 'Stock Moves'],
              accent: 'hover:border-l-emerald-500',
            },
            {
              icon: Truck,
              title: 'Procurement Teams',
              desc: 'Track suppliers, manage purchase orders, and get automated alerts before stockouts happen. Know what to order and when.',
              pills: ['Purchase Orders', 'Suppliers', 'Reorder Alerts', 'PO Tracking'],
              accent: 'hover:border-l-purple-500',
            },
          ].map((c) => (
            <motion.div
              key={c.title}
              {...fadeUp}
              className={`rounded-2xl border border-l-4 border-slate-200 border-l-transparent bg-white p-8 transition-all duration-300 hover:border-brand-blue/30 hover:shadow-lg dark:border-gray-700 dark:bg-gray-900 ${c.accent}`}
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-brand-blue dark:bg-gray-800">
                <c.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-brand-navy dark:text-white">{c.title}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{c.desc}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {c.pills.map((p) => (
                  <span key={p} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-gray-800 dark:text-slate-300">
                    {p}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-brand-navy py-16 text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 md:grid-cols-4 lg:px-6">
          {[
            ['7 Microservices', 'Independent, scalable services'],
            ['Real-time Events', 'Kafka-powered event streaming'],
            ['3 Access Roles', 'Granular permission control'],
            ['100% Audit Trail', 'Cryptographic record of every action'],
          ].map(([n, cap], i) => (
            <div key={n} className={`text-center ${i > 0 ? 'md:border-l md:border-white/10 md:pl-8' : ''}`}>
              <div className="text-4xl font-bold">{n}</div>
              <p className="mt-1 text-sm text-slate-400">{cap}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-b from-brand-blue-light to-white py-16 dark:from-gray-900 dark:to-gray-950">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-2 lg:px-6">
          <motion.div {...fadeUp}>
            <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              Coming Soon
            </span>
            <h2 className="mt-4 text-3xl font-bold text-brand-navy dark:text-white">AI-powered operational intelligence</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">
              We&apos;re building a context-aware assistant that reads your live event stream — answering questions like
              &quot;Which products are most at risk of stockout this week?&quot; or &quot;Why was order #2847 delayed?&quot;
              directly in your dashboard.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {[
                'Natural language inventory queries',
                'Automated reorder recommendations',
                'Anomaly detection across stock movements',
                'Predictive demand forecasting',
              ].map((x) => (
                <li key={x}>→ {x}</li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-500">
              Built on open-source LLMs · Privacy-first · No data leaves your stack
            </p>
          </motion.div>
          <motion.div {...fadeUp} className="relative rounded-2xl border border-white/20 bg-white/60 p-6 shadow backdrop-blur dark:border-gray-700 dark:bg-gray-900/80">
            <div className="mb-4 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">In Development</span>
            </div>
            <div className="space-y-3 rounded-lg bg-slate-50 p-4 text-sm dark:bg-gray-800/50">
              <div className="text-slate-500 dark:text-slate-400">You</div>
              <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-gray-800 dark:text-slate-200">Which SKUs are below threshold in Accra?</div>
              <div className="text-slate-500 dark:text-slate-400">Netiv AI</div>
              <div className="rounded-lg bg-brand-blue/20 p-3 text-slate-800 dark:text-slate-200">
                12 products are below reorder point — top risk: SKU-2048 (4 days of cover).
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="cta-footer" className="bg-brand-blue py-20 text-center text-white">
        <motion.div {...fadeUp}>
          <h2 className="text-3xl font-bold">Start managing your operations better, today.</h2>
          <p className="mt-3 text-white/80">Open registration — explore the platform with your team. No credit card required.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/signup"
              className="inline-flex h-12 items-center rounded-lg bg-white px-8 text-sm font-semibold text-brand-blue hover:bg-slate-100"
            >
              Create Account
            </Link>
            <Link
              to="/login"
              className="inline-flex h-12 items-center rounded-lg border-2 border-white px-8 text-sm font-semibold text-white hover:bg-white/10"
            >
              Log In to Netiv
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/70">
            Already have an account?{' '}
            <Link to="/login" className="underline">
              Log in →
            </Link>
          </p>
        </motion.div>
      </section>

      <footer className="bg-brand-navy py-16 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-6">
          <div className="flex flex-col items-center justify-center gap-5">
            <div className="flex items-center justify-center gap-4">
              <NetivMark className="h-14 w-14 md:h-16 md:w-16" aria-hidden />
              <span className="text-3xl font-bold tracking-tight text-white md:text-4xl">Netiv</span>
            </div>
            <p className="text-lg leading-relaxed text-slate-200 md:text-xl">
              Built for logistics teams who run on data, not guesswork.
            </p>
            <p className="max-w-xl text-base text-slate-400 md:text-lg">
              A unified operations platform for inventory, warehouses, orders, and procurement — real-time, role-aware,
              and ready for your team.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-6xl border-t border-white/10 px-4 pt-6 text-center text-xs text-slate-500 lg:px-6">
          © 2026 Netiv · All rights reserved · Privacy Policy
        </div>
      </footer>
    </div>
  )
}
