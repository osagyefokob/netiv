import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 5174,
      strictPort: true,
    },
    define: {
      'import.meta.env.VITE_IDENTITY_SERVICE_URL': JSON.stringify(env.VITE_IDENTITY_SERVICE_URL),
      'import.meta.env.VITE_INVENTORY_SERVICE_URL': JSON.stringify(env.VITE_INVENTORY_SERVICE_URL),
      'import.meta.env.VITE_WAREHOUSE_SERVICE_URL': JSON.stringify(env.VITE_WAREHOUSE_SERVICE_URL),
      'import.meta.env.VITE_ORDERS_SERVICE_URL': JSON.stringify(env.VITE_ORDERS_SERVICE_URL),
      'import.meta.env.VITE_PROCUREMENT_SERVICE_URL': JSON.stringify(env.VITE_PROCUREMENT_SERVICE_URL),
      'import.meta.env.VITE_REPORTING_SERVICE_URL': JSON.stringify(env.VITE_REPORTING_SERVICE_URL),
    },
  }
})
