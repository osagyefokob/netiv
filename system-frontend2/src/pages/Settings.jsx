import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Lock, User } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { identityApi } from '../services/axiosInstance'

export default function Settings() {
  const user = useAuthStore((s) => s.user)
  const setAuth = useAuthStore((s) => s.setAuth)
  const accessToken = useAuthStore((s) => s.accessToken)

  const [tab, setTab] = useState('profile')
  const [message, setMessage] = useState({ type: '', text: '' })

  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [pwError, setPwError] = useState('')

  const updateProfile = useMutation({
    mutationFn: async (payload) => {
      const r = await identityApi.patch(`/users/${user.userId}`, payload)
      return r.data
    },
    onSuccess: (updatedUser) => {
      setMessage({ type: 'success', text: 'Profile updated successfully' })
      setAuth(accessToken, { ...user, ...updatedUser })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    },
    onError: (err) => {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to update profile' })
    },
  })

  const changePassword = useMutation({
    mutationFn: async (payload) => {
      const r = await identityApi.post(`/users/${user.userId}/change-password`, payload)
      return r.data
    },
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Password changed successfully' })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPwError('')
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || 'Failed to change password'
      if (msg.toLowerCase().includes('current')) {
        setPwError(msg)
      } else {
        setMessage({ type: 'error', text: msg })
      }
    },
  })

  function handleProfileSubmit(e) {
    e.preventDefault()
    setMessage({ type: '', text: '' })
    updateProfile.mutate(profileForm)
  }

  function handlePasswordSubmit(e) {
    e.preventDefault()
    setPwError('')
    setMessage({ type: '', text: '' })

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPwError('New passwords do not match')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      setPwError('New password must be at least 8 characters')
      return
    }

    changePassword.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-dark-base dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and preferences</p>
      </div>

      {message.text && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setTab('profile')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'profile'
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <User size={14} /> Profile
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab('security')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'security'
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <Lock size={14} /> Security
          </span>
        </button>
      </div>

      {tab === 'profile' && (
        <div className="app-card p-6">
          <h2 className="font-semibold text-dark-base dark:text-white mb-4">Profile Information</h2>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">First Name</label>
                <input
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark-base dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Last Name</label>
                <input
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark-base dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Email (read-only)</label>
              <input
                value={user?.email ?? ''}
                readOnly
                className="w-full px-3 py-2 text-sm border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Role</label>
              <input
                value={user?.roleName ?? ''}
                readOnly
                className="w-full px-3 py-2 text-sm border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={updateProfile.isPending}
                className="px-4 py-2 bg-brand-blue text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
              >
                {updateProfile.isPending && <Loader2 size={14} className="animate-spin" />}
                {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'security' && (
        <div className="app-card p-6">
          <h2 className="font-semibold text-dark-base dark:text-white mb-4">Change Password</h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark-base dark:text-white"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark-base dark:text-white"
                required
              />
              <p className="text-xs text-gray-400 mt-1">At least 8 characters</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-dark-base dark:text-white"
                required
              />
            </div>
            {pwError && (
              <p className="text-sm text-red-600">{pwError}</p>
            )}
            <div className="pt-2">
              <button
                type="submit"
                disabled={changePassword.isPending}
                className="px-4 py-2 bg-brand-blue text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
              >
                {changePassword.isPending && <Loader2 size={14} className="animate-spin" />}
                {changePassword.isPending ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}