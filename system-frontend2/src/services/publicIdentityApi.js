import axios from 'axios'

const getEnv = (...keys) => keys.map((k) => import.meta.env[k]).find(Boolean)

const defaultIdentity = 'http://localhost:8081/api/v1/identity'
const identityBaseUrl = getEnv('VITE_IDENTITY_SERVICE_URL', 'VITE_IDENTITY_API_URL') || defaultIdentity

/**
 * Identity API without auth interceptors — for public routes (register, future marketing forms).
 */
export const publicIdentityApi = axios.create({
  baseURL: identityBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

publicIdentityApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data
    const flat = data?.code && data?.message ? { code: data.code, message: data.message, details: data.details } : null
    if (flat?.code && flat?.message) {
      error.apiError = flat
    }
    return Promise.reject(error)
  }
)
