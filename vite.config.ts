import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import dts from 'vite-plugin-dts';
import svgr from 'vite-plugin-svgr';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:8080';

  return {
    plugins: [
      tailwindcss(),
      react(),
      svgr({ svgrOptions: { icon: true } }),
      dts({
        insertTypesEntry: true,
        exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/test/**', 'src/index.tsx', 'vitest.config.ts'],
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true,
        },
      },
    },
    build: {
      lib: {
        entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
        name: 'NebulaWeb',
        fileName: 'nebula-web',
        formats: ['es', 'umd'],
      },
      rollupOptions: {
        external: [
          'react',
          'react-dom',
          'react/jsx-runtime',
          'antd',
          '@ant-design/icons',
          '@ant-design/pro-components',
          'antd-style',
          'react-router-dom',
          'zustand',
          'zustand/middleware',
        ],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            'react/jsx-runtime': 'jsxRuntime',
            antd: 'antd',
            '@ant-design/icons': 'icons',
            '@ant-design/pro-components': 'AntDesignProComponents',
            'antd-style': 'antdStyle',
            'react-router-dom': 'ReactRouterDOM',
            zustand: 'zustand',
            'zustand/middleware': 'zustandMiddleware',
          },
        },
      },
    },
  };
});
