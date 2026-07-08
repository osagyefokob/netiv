import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import NetivLogo from '../components/marketing/NetivLogo'
import useAuthStore from '../store/authStore'
import { identityApi } from '../services/axiosInstance'
import ThemeToggle from '../components/ThemeToggle'

// Error code → friendly message map (from your API spec)
const API_ERRORS = {
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  ACCOUNT_DEACTIVATED: 'Your account has been deactivated. Contact your admin.',
  VALIDATION_ERROR: 'Please check your email and password.',
}

const DEV_AUTH_FALLBACK = import.meta.env.VITE_DEV_AUTH_FALLBACK === 'true'

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

/** Maps identity service `LoginResponse.user` to the shape used by Sidebar / guards. */
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
    companyId: apiUser.companyId,
    permissions: permissionsForRole(roleName),
  }
}

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetMessage, setResetMessage] = useState('')

  const setAuth = useAuthStore((state) => state.setAuth)
  const navigate = useNavigate()

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setResetMessage('')
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await identityApi.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        newPassword,
      })
      setResetMessage('If an account exists for this email, the password has been updated. You can sign in now.')
      setNewPassword('')
      setConfirmPassword('')
      setShowReset(false)
    } catch (err) {
      const code = err?.apiError?.code ?? err?.response?.data?.code
      const msg = err?.apiError?.message ?? err?.response?.data?.message
      setError(
        msg ||
          (code === 'VALIDATION_ERROR'
            ? 'Check email format and password length (8+).'
            : 'Unable to reset password. Try again.')
      )
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (DEV_AUTH_FALLBACK) {
        if (email === 'admin@logistics.com' && password === 'Admin@123') {
          setAuth('dev-token-admin', {
            userId: '1',
            email: 'admin@logistics.com',
            firstName: 'Admin',
            lastName: 'User',
            roleName: 'SUPER_ADMIN',
            companyId: null,
            warehouseId: null,
            permissions: permissionsForRole('SUPER_ADMIN'),
          })
          navigate('/dashboard')
          return
        }
        if (email === 'staff@logistics.com' && password === 'Staff@123') {
          setAuth('dev-token-staff', {
            userId: '2',
            email: 'staff@logistics.com',
            firstName: 'Warehouse',
            lastName: 'Staff',
            roleName: 'WAREHOUSE_STAFF',
            warehouseId: 'WH-01',
            permissions: ['inventory:READ', 'inventory:WRITE', 'orders:READ', 'orders:WRITE'],
          })
          navigate('/dashboard')
          return
        }
        if (email === 'viewer@logistics.com' && password === 'Viewer@123') {
          setAuth('dev-token-viewer', {
            userId: '3',
            email: 'viewer@logistics.com',
            firstName: 'Read',
            lastName: 'Only',
            roleName: 'VIEWER',
            warehouseId: null,
            permissions: ['inventory:READ', 'orders:READ', 'reports:READ'],
          })
          navigate('/dashboard')
          return
        }
        setError('Incorrect email or password.')
        return
      }

      const response = await identityApi.post('/auth/login', { email, password })
      const { accessToken, user } = response.data
      setAuth(accessToken, normalizeAuthUser(user))
      navigate('/dashboard')
    } catch (err) {
      const code = err?.apiError?.code ?? err?.response?.data?.code
      setError(API_ERRORS[code] || 'Unable to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left — matches Signup / landing brand panel (no image) */}
      <div className="flex flex-col bg-brand-navy p-8 text-white lg:w-1/2 lg:p-12">
        <NetivLogo wordClass="text-xl font-semibold text-white" />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10 lg:py-12">
          <h2 className="mb-2 text-3xl font-bold">Welcome back</h2>
          <p className="mb-8 text-slate-300">
            Sign in to Netiv — total visibility across inventory, warehouses, orders, and procurement.
          </p>
          <ul className="mb-10 space-y-3 text-sm text-slate-200">
            {[
              'Same real-time platform as the marketing site',
              'Role-based dashboards for your whole team',
              'Secure session · Audit-friendly operations',
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <span className="shrink-0 text-emerald-400">✓</span>
                {t}
              </li>
            ))}
          </ul>
          <blockquote className="border-l-[3px] border-brand-blue pl-4 text-sm italic text-slate-300">
            &ldquo;Total visibility. Smarter operations.&rdquo;
            <footer className="mt-2 not-italic text-slate-500">— Netiv</footer>
          </blockquote>
        </div>
      </div>

      {/* Right — form (aligned with SignupPage) */}
      <div className="relative flex flex-1 flex-col bg-white dark:bg-gray-950">
        <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-10 lg:px-10">
          <Link
            to="/"
            className="mb-8 inline-flex w-fit items-center gap-2 text-sm text-slate-500 hover:text-brand-blue dark:text-slate-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <h1 className="text-2xl font-semibold text-brand-navy dark:text-white">
            {showReset ? 'Reset password' : 'Log in to Netiv'}
          </h1>
          <p className="mt-1 mb-8 text-sm text-slate-500 dark:text-slate-400">
            {showReset ? (
              'Enter your account email and choose a new password (min. 8 characters).'
            ) : (
              <>
                New to Netiv?{' '}
                <Link to="/signup" className="font-medium text-brand-blue hover:underline">
                  Create an account
                </Link>
                {' · '}
                <Link to="/" className="text-brand-blue hover:underline">
                  Marketing site
                </Link>
              </>
            )}
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}
          {resetMessage && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              {resetMessage}
            </div>
          )}

          {showReset ? (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">New password</label>
                <div className="relative mt-1">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                    onClick={() => setShowNewPassword((s) => !s)}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Confirm new password</label>
                <div className="relative mt-1">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setShowReset(false)
                    setError('')
                    setResetMessage('')
                  }}
                  className="flex-1 rounded-lg border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Back to sign in
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-brand-blue py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  className={inputClass}
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReset(true)
                      setError('')
                      setResetMessage('')
                    }}
                    className="text-xs font-medium text-brand-blue hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center rounded-lg bg-brand-blue text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login
