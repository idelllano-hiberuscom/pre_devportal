/*
 * Dispara la replicación de páginas y assets desde el author.
 *
 *   AEM_TOKEN=... node replicar.mjs [--agente preview|publish|ambos] [--assets] [--paginas]
 *   AEM_TOKEN=... node replicar.mjs /content/pre-devportal/inicio ...
 *
 * Hasta ahora esto se hacía a mano desde la consola de Sites porque no sabíamos el id del
 * agente. Son `preview` y `publish`, comprobado contra este entorno: `/bin/replicate.json`
 * acepta los dos y responde `status.code: 200` con `Replication started`.
 *
 * Hace falta después de cambiar un binario del DAM: EDS resuelve las referencias a
 * `./media_<hash>` al generar el HTML, y ese hash sale del binario. Si solo se replica el
 * asset, las páginas siguen apuntando al hash viejo; hay que replicar también las páginas.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AUTHOR = 'https://author-p34633-e913315.adobeaemcloud.com';
const TOKEN = process.env.AEM_TOKEN;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = '/content/pre-devportal';
const DAM = '/content/dam/pre-devportal/demo';

if (!TOKEN) { console.error('falta AEM_TOKEN'); process.exit(2); }

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const agentes = { preview: ['preview'], publish: ['publish'], ambos: ['preview', 'publish'] }[flag('--agente') || 'ambos'];

const rutas = args.filter((a) => a.startsWith('/content/'));

if (args.includes('--assets')) {
  const dir = path.join(HERE, 'assets-reales');
  fs.readdirSync(dir).forEach((f) => rutas.push(`${DAM}/${f}`));
}

if (args.includes('--paginas')) {
  const paginas = JSON.parse(fs.readFileSync(path.join(HERE, 'authoring/page-content.json'), 'utf8'));
  paginas.forEach((p) => rutas.push(`${ROOT}${p.docPath}`));
  // Los fragmentos no son páginas de contenido pero se sirven igual y hay que replicarlos.
  ['/nav', '/footer'].forEach((f) => rutas.push(`${ROOT}${f}`));
}

if (!rutas.length) {
  console.error('nada que replicar: pasa rutas, o --assets, o --paginas');
  process.exit(2);
}

async function replicar(ruta, agentId) {
  const res = await fetch(`${AUTHOR}/bin/replicate.json`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ cmd: 'Activate', agentId, path: ruta }).toString(),
  });
  const text = await res.text();
  // Como en el resto del pipeline: manda el cuerpo, no el código de estado.
  return /Replication started/.test(text) || /"status\.code":\s*200/.test(text);
}

let ok = 0;
let fallos = 0;
for (const ruta of rutas) {
  const resultados = [];
  for (const agentId of agentes) {
    // eslint-disable-next-line no-await-in-loop
    resultados.push([agentId, await replicar(ruta, agentId)]);
  }
  const malos = resultados.filter(([, r]) => !r).map(([a]) => a);
  if (malos.length) {
    fallos += 1;
    console.log(`  FALLO ${ruta} -> ${malos.join(', ')}`);
  } else {
    ok += 1;
  }
}

console.log(`\n${ok}/${rutas.length} replicadas a ${agentes.join(' + ')}${fallos ? ` · ${fallos} con fallo` : ''}`);
process.exit(fallos ? 1 : 0);
