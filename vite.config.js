import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';
import url from 'node:url';

// Middleware to handle Vercel API routes locally
const localApiPlugin = () => ({
  name: 'local-api-bridge',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url.startsWith('/api/')) {
        try {
          // Parse path and query
          const parsedUrl = url.parse(req.url, true);
          const apiPath = parsedUrl.pathname;
          const query = parsedUrl.query;

          // Convert /api/foo/bar to ./api/foo/bar.js
          const relativePath = `.${apiPath}.js`;
          const filePath = path.resolve(process.cwd(), relativePath);
          console.log(`[Local API] Intercepting: ${req.url} -> ${filePath}`);

          // Mock Vercel res methods
          res.status = (code) => { res.statusCode = code; return res; };
          res.json = (data) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          };
          res.send = (data) => res.end(data);
          
          // Inject query into req for compatibility
          req.query = query;

          // Use Vite's SSR loader to handle modules and resolution
          const module = await server.ssrLoadModule(filePath);
          const handler = module.default;

          if (typeof handler === 'function') {
            await handler(req, res);
          } else {
            console.warn(`No default export found in ${filePath}`);
            next();
          }
        } catch (e) {
          console.error(`Local API Error (${req.url}):`, e);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
        return;
      }
      next();
    });
  }
});

export default defineConfig({
  plugins: [vue(), localApiPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
});
