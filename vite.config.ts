import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL ?? 'http://localhost:8000';
  const port = Number(env.VITE_PORT) || 5173;
  const base = '/scapegoat/';
  const allowedHosts = env.VITE_ALLOWED_HOSTS
    ? env.VITE_ALLOWED_HOSTS.split(',').map((h) => h.trim()).filter(Boolean)
    : [];

  if (port && !allowedHosts.includes(`localhost:${port}`)) {
    allowedHosts.push(`localhost:${port}`);
  }

  return {
    plugins: [react()],
    base,
    server: {
      port,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
      allowedHosts,
    },
  };
});
