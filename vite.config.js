import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.PORT) || 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/monaco-editor")) {
            return "monaco";
          }

          if (id.includes("node_modules/@monaco-editor")) {
            return "monaco-react";
          }

          if (
            id.includes("node_modules/antd") ||
            id.includes("node_modules/rc-") ||
            id.includes("node_modules/@ant-design/icons") ||
            id.includes("node_modules/@ant-design/icons-svg")
          ) {
            return "antd-vendor";
          }
        },
      },
    },
  },
})
