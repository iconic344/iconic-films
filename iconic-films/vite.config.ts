import {defineConfig, loadEnv, type Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {handler} from './server/handler';

function inlineProductionCss(): Plugin {
  return {
    name: 'viivii-inline-production-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const html = bundle['index.html'];
      if (!html || html.type !== 'asset') return;
      const cssAssets = Object.values(bundle).filter(
        (item): item is Extract<typeof item, {type:'asset'}> =>
          item.type === 'asset' && item.fileName.endsWith('.css')
      );
      if (!cssAssets.length) return;
      const css = cssAssets.map(item => String(item.source)).join('\n');
      const source = String(html.source);
      const linkPattern = /<link[^>]+rel=["']stylesheet["'][^>]*href=["'][^"']+\.css["'][^>]*>/g;
      const reverseLinkPattern = /<link[^>]+href=["'][^"']+\.css["'][^>]*rel=["']stylesheet["'][^>]*>/g;
      const style = '<style data-viivii-production-css>'+css+'</style>';
      const replaced = source.replace(linkPattern, style).replace(reverseLinkPattern, style);
      html.source = replaced === source ? source.replace('</head>', style+'</head>') : replaced;
    }
  };
}

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
    plugins: [react(), iconicApi(), inlineProductionCss()],
    resolve: {alias: {'@': fileURLToPath(new URL('./src', import.meta.url))}},
    build: {target: 'es2022'},
  };
});
