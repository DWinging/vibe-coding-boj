import { cp, mkdir, readFile } from 'node:fs/promises';
import { WORKER_URL } from '../js/config.js';
const root = new URL('../', import.meta.url);
if (!WORKER_URL) throw new Error('Configure the deployed Worker URL before packaging.');
const url = new URL(WORKER_URL);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
if (url.protocol !== 'https:' || manifest.host_permissions.length !== 1 || manifest.host_permissions[0] !== url.origin + '/*')
  throw new Error('Worker URL and host_permissions must match.');
const output = new URL('dist/extension-' + Date.now() + '/', root);
await mkdir(output, { recursive: true });
// Explicit allowlist: never ship Worker .dev.vars, configuration, tests, or tooling.
for (const name of ['manifest.json', 'popup.html', 'options.html', 'js', 'css', 'icons']) {
  await cp(new URL(name, root), new URL(name, output), { recursive: true, errorOnExist: true, force: false });
}
console.log('Extension files only: ' + output.pathname);
