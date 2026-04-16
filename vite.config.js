import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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

          if (id.includes("node_modules/@ant-design/icons") || id.includes("node_modules/@ant-design/icons-svg")) {
            return "ant-icons";
          }

          if (id.includes("node_modules/rc-")) {
            return "ant-rc";
          }

          if (id.includes("node_modules/antd")) {
            return "antd";
          }

          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router")) {
            return "react-vendor";
          }
        },
      },
    },
  },
})
