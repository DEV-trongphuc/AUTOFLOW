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
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              if (req.method === 'GET' || req.method === 'OPTIONS') {
                proxyReq.removeHeader('Content-Type');
                proxyReq.removeHeader('Content-Length');
              }
              proxyReq.setHeader('Origin', 'https://automation.ideas.edu.vn');
              proxyReq.setHeader('Referer', 'https://automation.ideas.edu.vn/');
              proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
              proxyReq.removeHeader('X-Forwarded-For');
              proxyReq.removeHeader('X-Forwarded-Host');
              proxyReq.removeHeader('X-Forwarded-Proto');
              proxyReq.removeHeader('Via');
            });
          }
        },
        '/mail_api': {
          target: 'https://automation.ideas.edu.vn',
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              if (req.method === 'GET' || req.method === 'OPTIONS') {
                proxyReq.removeHeader('Content-Type');
                proxyReq.removeHeader('Content-Length');
              }
              proxyReq.setHeader('Origin', 'https://automation.ideas.edu.vn');
              proxyReq.setHeader('Referer', 'https://automation.ideas.edu.vn/');
              proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
              proxyReq.removeHeader('X-Forwarded-For');
              proxyReq.removeHeader('X-Forwarded-Host');
              proxyReq.removeHeader('X-Forwarded-Proto');
              proxyReq.removeHeader('Via');
            });
          }
        },
        '/uploadss': {
          target: 'https://automation.ideas.edu.vn',
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              if (req.method === 'GET' || req.method === 'OPTIONS') {
                proxyReq.removeHeader('Content-Type');
                proxyReq.removeHeader('Content-Length');
              }
              proxyReq.setHeader('Origin', 'https://automation.ideas.edu.vn');
              proxyReq.setHeader('Referer', 'https://automation.ideas.edu.vn/');
              proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
              proxyReq.removeHeader('X-Forwarded-For');
              proxyReq.removeHeader('X-Forwarded-Host');
              proxyReq.removeHeader('X-Forwarded-Proto');
              proxyReq.removeHeader('Via');
            });
          }
        },
        '/go/': {
          target: 'https://automation.ideas.edu.vn',
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              if (req.method === 'GET' || req.method === 'OPTIONS') {
                proxyReq.removeHeader('Content-Type');
                proxyReq.removeHeader('Content-Length');
              }
              proxyReq.setHeader('Origin', 'https://automation.ideas.edu.vn');
              proxyReq.setHeader('Referer', 'https://automation.ideas.edu.vn/');
              proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
              proxyReq.removeHeader('X-Forwarded-For');
              proxyReq.removeHeader('X-Forwarded-Host');
              proxyReq.removeHeader('X-Forwarded-Proto');
              proxyReq.removeHeader('Via');
            });
          }
        }
      }
    },
    appType: 'spa', // Serve index.html for ALL routes (fix direct deep URL access like /api-triggers)
    plugins: [
      react(),

    ],
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

