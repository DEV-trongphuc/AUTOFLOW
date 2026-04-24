import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      // [PERF] Pre-warm the most common modules to reduce first-tab cold start
      warmup: {
        clientFiles: ['./App.tsx', './components/Layout.tsx', './pages/Campaigns.tsx'],
      },
      proxy: {
        '/api/': {
          target: 'https://automation.ideas.edu.vn',
          changeOrigin: true,
          secure: false,
        },
        '/mail_api': {
          target: 'https://automation.ideas.edu.vn',
          changeOrigin: true,
          secure: false,
        },
        '/uploadss': {
          target: 'https://automation.ideas.edu.vn',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    appType: 'spa', // Serve index.html for ALL routes (fix direct deep URL access like /api-triggers)
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      chunkSizeWarningLimit: 1000,
      cssCodeSplit: true, // [PERF] Each page loads only its CSS chunk
      rollupOptions: {
        output: {
          manualChunks: {
            // Core logic
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // [PERF NEW] State management — separate chunk so pages share it
            'vendor-query': ['@tanstack/react-query'],
            // Heavy visualization
            'vendor-charts': ['apexcharts', 'react-apexcharts', 'recharts'],
            // Heavy data processing
            'vendor-docs': ['pdfjs-dist', 'xlsx', 'papaparse', 'mammoth'],
            // Common icons/ui
            'vendor-ui': ['lucide-react', 'react-hot-toast'],
          },
        },
      },
      // [PERF] esbuild is ~10x faster than terser for minification
      minify: 'esbuild',
      target: 'es2020',
    }
  };
});

