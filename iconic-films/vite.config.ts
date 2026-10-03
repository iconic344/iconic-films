import {defineConfig, loadEnv, type Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {handler} from './server/handler';

function iconicApi(): Plugin {
  const mount = (server: any) => {
    server.middlewares.use((req: any, res: any, next: any) => {
      if (req.url?.startsWith('/api/')) void handler(req, res);
      else next();
    });
  };
  return {name:'iconic-api', configureServer: mount, configurePreviewServer: mount};
}

export default defineConfig(({mode}) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    plugins: [react(), iconicApi()],
    resolve: {alias: {'@': fileURLToPath(new URL('./src', import.meta.url))}},
    build: {target: 'es2022'},
  };
});
