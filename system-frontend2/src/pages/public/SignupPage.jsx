import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, ArrowLeft } from 'lucide-react'
import NetivLogo from '../../components/marketing/NetivLogo'
import ThemeToggle from '../../components/ThemeToggle'
import { publicIdentityApi } from '../../services/publicIdentityApi'
import useAuthStore from '../../store/authStore'

const COUNTRIES = [
  'Ghana',
  'Nigeria',
  'Kenya',
  'South Africa',
  'Uganda',
  'Tanzania',
  'Rwanda',
  'Ethiopia',
  'Egypt',
  'Morocco',
  'Senegal',
  'Ivory Coast',
  'Cameroon',
  'United States',
  'United Kingdom',
  'Germany',
  'France',
  'Other',
]

function permissionsForRole(roleName) {
  if (!roleName) return []
  const map = {
    SUPER_ADMIN: ['users:ADMIN', 'inventory:READ', 'inventory:WRITE', 'orders:READ', 'orders:WRITE', 'reports:READ'],
    COMPANY_ADMIN: ['users:ADMIN', 'inventory:READ', 'inventory:WRITE', 'orders:READ', 'orders:WRITE', 'reports:READ'],
    ADMIN: ['inventory:READ', 'inventory:WRITE', 'orders:READ', 'orders:WRITE', 'reports:READ'],
    WAREHOUSE_STAFF: ['inventory:READ', 'inventory:WRITE', 'orders:READ', 'orders:WRITE'],
    VIEWER: ['inventory:READ', 'orders:READ', 'reports:READ'],
  }
  return map[roleName] ?? []
}

function normalizeAuthUser(apiUser) {
  if (!apiUser) return null
  const roleName = apiUser.roleName ?? apiUser.role
  const email = String(apiUser.email ?? '')
  const local = email.split('@')[0] ?? 'User'
  const parts = local.split(/[._-]+/).filter(Boolean)
  const firstName =
    apiUser.firstName ??
    (parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase() : 'User')
  const lastName =
    apiUser.lastName ??
    (parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase() : '')
  return {
    userId: apiUser.userId,
    email,
    firstName,
    lastName,
    roleName,
    warehouseId: apiUser.warehouseId,
    permissions: permissionsForRole(roleName),
  }
}

const signupSchema = z
  .object({
    firstName: z.string().min(1, 'Required').max(100),
    lastName: z.string().min(1, 'Required').max(100),
    companyName: z.string().min(1, 'Required').max(100),
    email: z.string().email('Enter a valid work email'),
    country: z.string().min(1, 'Select a country'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/\d/, 'Include a number'),
    confirmPassword: z.string(),
    terms: z.boolean().refine((v) => v === true, { message: 'You must accept the terms' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

/** 0–4 filled segments: length → upper → digit → special */
function passwordStrengthSegments(password) {
  if (!password) return 0
  let n = 0
  if (password.length >= 8) n++
  if (/[A-Z]/.test(password)) n++
  if (/\d/.test(password)) n++
  if (/[^A-Za-z0-9]/.test(password)) n++
  return n
}

function segmentColor(totalFilled, segmentIndex) {
  if (totalFilled < segmentIndex) return 'bg-slate-200'
  if (totalFilled === 1) return 'bg-red-500'
  if (totalFilled === 2) return 'bg-amber-500'
  if (totalFilled === 3) return 'bg-yellow-400'
  return 'bg-emerald-500'
}

export default function SignupPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPw, setShowPw] = useState(false)
  const [showPw2, setShowPw2] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { terms: false, country: '' },
  })

  const password = watch('password') || ''

  const onSubmit = async (data) => {
    setToast('')
    setSubmitting(true)
    try {
      const res = await publicIdentityApi.post('/auth/register', {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        companyName: data.companyName.trim(),
        country: data.country,
      })
      const { accessToken, user } = res.data
      setAuth(accessToken, normalizeAuthUser(user))
      navigate('/dashboard')
    } catch (err) {
      const status = err?.response?.status
      const code = err?.apiError?.code ?? err?.response?.data?.code
      const details = err?.response?.data?.details

      if (status === 409 || code === 'CONFLICT') {
        setError('email', { message: 'An account with this email already exists' })
        return
      }
      if (status === 422 && details && typeof details === 'object') {
        Object.entries(details).forEach(([field, msg]) => {
          if (field === 'password') setError('password', { message: msg })
          else if (field === 'email') setError('email', { message: msg })
        })
        return
      }
      setToast('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const strengthSeg = passwordStrengthSegments(password)

  return (
    <div className="min-h-screen flex flex-col lg:flex-row dark:bg-gray-900">
      <div className="lg:w-1/2 bg-brand-navy text-white flex flex-col p-8 lg:p-12">
        <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>
        <NetivLogo wordClass="text-xl font-semibold text-white" />
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full py-10">
          <h2 className="text-3xl font-bold mb-2">Join Netiv</h2>
          <p className="text-slate-300 mb-8">Set up your account in under 2 minutes.</p>
          <ul className="space-y-3 text-sm text-slate-200 mb-12">
            {[
              'Full platform access from day one',
              'All modules included — inventory, orders, warehouse, procurement',
              'Role-based team management',
              'No credit card required · No commitment',
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <span className="text-emerald-400 shrink-0">✓</span>
                {t}
              </li>
            ))}
          </ul>
          <blockquote className="border-l-[3px] border-brand-blue pl-4 italic text-slate-300 text-sm">
            &ldquo;We went from spreadsheets to full warehouse visibility in one afternoon.&rdquo;
            <footer className="mt-2 not-italic text-slate-500">— Operations Manager, Accra Logistics Co.</footer>
          </blockquote>
        </div>
      </div>

      <div className="flex-1 bg-white flex flex-col">
        <div className="p-6 lg:p-10 flex-1 flex flex-col max-w-xl mx-auto w-full">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-blue mb-8 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <h1 className="text-2xl font-semibold text-brand-navy">Create your account</h1>
          <p className="text-sm text-muted mt-1 mb-8">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-blue font-medium hover:underline">
              Log in
            </Link>
          </p>

          {toast && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{toast}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-gray-300">First name *</label>
                <input
                  {...register('firstName')}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue dark:border-gray-600 dark:bg-white dark:text-gray-900"
                />
                {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-gray-300">Last name *</label>
                <input
                  {...register('lastName')}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue dark:border-gray-600 dark:bg-white dark:text-gray-900"
                />
                {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-gray-300">Company name *</label>
              <input
                {...register('companyName')}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue dark:border-gray-600 dark:bg-white dark:text-gray-900"
              />
              {errors.companyName && <p className="mt-1 text-xs text-red-600">{errors.companyName.message}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-gray-300">Work email *</label>
              <input
                type="email"
                placeholder="you@yourcompany.com"
                autoComplete="email"
                {...register('email')}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue dark:border-gray-600 dark:bg-white dark:text-gray-900"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.email.message}
                  {String(errors.email.message || '').includes('already') ? (
                    <>
                      {' '}
                      <Link to="/login" className="text-brand-blue underline">
                        Log in instead?
                      </Link>
                    </>
                  ) : null}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-gray-300">Country *</label>
              <select
                {...register('country')}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue bg-white"
              >
                <option value="">Select country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.country && <p className="mt-1 text-xs text-red-600">{errors.country.message}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-gray-300">Password *</label>
              <div className="relative mt-1">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('password')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-10 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue dark:border-gray-600 dark:bg-white dark:text-gray-900"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${segmentColor(strengthSeg, i)}`}
                  />
                ))}
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-gray-300">Confirm password *</label>
              <div className="relative mt-1">
                <input
                  type={showPw2 ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-10 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue dark:border-gray-600 dark:bg-white dark:text-gray-900"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPw2((s) => !s)}
                  aria-label={showPw2 ? 'Hide password' : 'Show password'}
                >
                  {showPw2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
            </div>

            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input type="checkbox" {...register('terms', { valueAsBoolean: true })} className="mt-1 rounded border-slate-300" />
              <span>I agree to the Terms of Service and Privacy Policy</span>
            </label>
            {errors.terms && <p className="text-xs text-red-600">{errors.terms.message}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-blue text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating your account...
                </>
              ) : (
                'Create My Account'
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5" />
            Secure · Role-based · Privacy-first
          </div>
        </div>
      </div>
    </div>
  )
}
