import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
  },
  server: {
    open: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
    proxy: {
      '/proxy-soundhelix': {
        target: 'https://www.soundhelix.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-soundhelix/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['Cross-Origin-Resource-Policy'] = 'cross-origin';
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
          });
        }
      },
      '/proxy-mixkit': {
        target: 'https://assets.mixkit.co',
        changeOrigin: true,
        rewrite: (path) => {
          const cleanPath = path.replace(/^\/proxy-mixkit/, '');
          const match = cleanPath.match(/^\/videos\/preview\/mixkit-[a-zA-Z0-9-]*?-(\d+)-large\.mp4$/);
          if (match) {
            return `/videos/${match[1]}/${match[1]}-720.mp4`;
          }
          return cleanPath;
        },
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['Cross-Origin-Resource-Policy'] = 'cross-origin';
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
          });
        }
      }
    }
  },
})