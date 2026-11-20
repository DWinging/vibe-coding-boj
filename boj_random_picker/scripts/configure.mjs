import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const url = new URL(process.argv[2]);
if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/')
  throw new Error('Use the HTTPS Worker origin, without a path or credentials.');
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
manifest.host_permissions = [url.origin + '/*'];
await writeFile(new URL('manifest.json', root), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(new URL('js/config.js', root), '// Public URL only. Secrets belong in Cloudflare.\nexport const WORKER_URL = ' + JSON.stringify(url.origin) + ';\n');
console.log('Configured Worker origin: ' + url.origin);

