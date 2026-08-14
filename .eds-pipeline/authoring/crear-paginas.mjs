/*
 * Crea páginas que faltan en el árbol de contenido, con la plantilla de Franklin y con el
 * menú lateral ya puesto, para que se puedan autorizar igual que las hermanas.
 *
 *   AEM_TOKEN=... node crear-paginas.mjs [--sin-sidenav] <ruta> <Título> [<ruta> <Título> ...]
 *
 * `--sin-sidenav` crea la página vacía. Lo llevan las páginas de documentación, pero no la
 * home ni los fragmentos (nav, footer), ni las raíces de idioma.
 *
 * Es idempotente: si la página ya existe, solo informa. Como en el resto del pipeline, una
 * escritura solo se da por buena si Sling responde con el literal `Content modified`.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AUTHOR = 'https://author-p34633-e913315.adobeaemcloud.com';
const TOKEN = process.env.AEM_TOKEN;
const HERE = path.dirname(fileURLToPath(import.meta.url));

if (!TOKEN) { console.error('falta AEM_TOKEN'); process.exit(2); }

const SIN_SIDENAV = process.argv.includes('--sin-sidenav');
const args = process.argv.slice(2).filter((a) => a !== '--sin-sidenav');
if (!args.length || args.length % 2) {
  console.error('uso: node crear-paginas.mjs [--sin-sidenav] <ruta> <Título> [...]');
  process.exit(2);
}

async function req(method, ruta, body) {
  const res = await fetch(`${AUTHOR}${ruta}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body,
  });
  const text = await res.text();
  // Una creación responde `Content created` y una modificación `Content modified`:
  // hay que aceptar las dos, porque la página se crea y su jcr:content se modifica.
  return { status: res.status, text, ok: /Content (created|modified)/.test(text) };
}

// El menú lateral es el mismo en todo el árbol; se reutiliza el que ya emite add-blocks.mjs.
const navHtml = (() => {
  const fuente = readFileSync(path.join(HERE, 'add-blocks.mjs'), 'utf8');
  const inicio = fuente.indexOf('const NAV_TREE = `');
  if (inicio < 0) return '';
  const desde = fuente.slice(inicio + 'const NAV_TREE = `'.length);
  return desde.slice(0, desde.indexOf('`;'));
})();

for (let i = 0; i < args.length; i += 2) {
  const ruta = args[i];
  const titulo = args[i + 1];

  // eslint-disable-next-line no-await-in-loop
  const existe = await fetch(`${AUTHOR}${ruta}.json`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (existe.status === 200) { console.log(`  ya existe  ${ruta}`); continue; }

  /*
   * En dos pasos a propósito: crear el nodo cq:Page y su jcr:content en la misma petición
   * devuelve 409. Primero el nodo de página, y luego su contenido colgando de él.
   */
  const pagina = new URLSearchParams();
  pagina.append('jcr:primaryType', 'cq:Page');
  // eslint-disable-next-line no-await-in-loop
  const creada = await req('POST', ruta, pagina.toString());
  if (!creada.ok) {
    console.log(`  FALLO      ${ruta} -> ${creada.status}`);
    continue;
  }

  const form = new URLSearchParams();
  form.append('./jcr:primaryType', 'cq:PageContent');
  form.append('./jcr:title', titulo);
  form.append('./sling:resourceType', 'core/franklin/components/page/v1/page');
  form.append('./cq:template', '/libs/core/franklin/templates/page');
  form.append('./modelFields', 'keywords@text');
  form.append('./modelFields@TypeHint', 'String[]');
  form.append('./root/jcr:primaryType', 'nt:unstructured');
  form.append('./root/sling:resourceType', 'core/franklin/components/root/v1/root');

  // sección con el menú lateral, igual que en las páginas hermanas
  if (!SIN_SIDENAV) {
    const s = './root/section_sidenav';
    form.append(`${s}/jcr:primaryType`, 'nt:unstructured');
    form.append(`${s}/sling:resourceType`, 'core/franklin/components/section/v1/section');
    form.append(`${s}/model`, 'section');
    form.append(`${s}/modelFields`, 'name@text');
    form.append(`${s}/modelFields`, 'style@multiselect');
    form.append(`${s}/modelFields@TypeHint`, 'String[]');
    form.append(`${s}/name`, 'sidenav');
    form.append(`${s}/sidenav/jcr:primaryType`, 'nt:unstructured');
    form.append(`${s}/sidenav/sling:resourceType`, 'core/franklin/components/block/v1/block');
    form.append(`${s}/sidenav/name`, 'Sidenav');
    form.append(`${s}/sidenav/model`, 'sidenav');
    form.append(`${s}/sidenav/modelFields`, 'searchLabel@text');
    form.append(`${s}/sidenav/modelFields`, 'nav@richtext');
    form.append(`${s}/sidenav/modelFields@TypeHint`, 'String[]');
    form.append(`${s}/sidenav/searchLabel`, 'Buscar');
    form.append(`${s}/sidenav/nav`, navHtml);
  }

  // eslint-disable-next-line no-await-in-loop
  const r = await req('POST', `${ruta}/jcr:content`, form.toString());
  console.log(r.ok ? `  creada     ${ruta}` : `  FALLO      ${ruta} -> ${r.status} ${r.text.replace(/\s+/g, ' ').slice(0, 120)}`);
}
