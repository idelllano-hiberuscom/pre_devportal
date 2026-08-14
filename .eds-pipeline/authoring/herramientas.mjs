/*
 * Contribuye las 18 subpáginas del árbol de herramientas para desarrolladores, a partir de
 * lo scrapeado del portal (herr-contenido.json).
 *
 * Cada página queda como en el portal: sin hero — las subpáginas no lo tienen, y el que había
 * era un marcador automático con solo el nombre de la página, que además duplicaba el titular
 * del propio contenido — el menú lateral, y el contenido en una única sección.
 *
 * Los tramos se reparten según lo que admite cada componente:
 *   texto   -> nodo de texto. El saneador de `text/v1/text` respeta h3..h6, p, ul, ol, li,
 *              strong, em, u, a y br; lo único que se come es <code>, que aquí se convierte
 *              en <strong> porque es como el propio portal marca los parámetros en el resto
 *              del contenido.
 *   código  -> bloque code-block, con el código dentro de un <pre>
 *   tabla   -> bloque table
 *   imagen  -> componente de imagen con el logotipo del DAM; las tres imágenes del portal son
 *              logotipos enlazados a dominios de terceros (postimg, wikimedia) y no se copian
 *
 *   node herramientas.mjs <herr-contenido.json> <dirSalida>
 */
import fs from 'node:fs';
import path from 'node:path';

const ENTRADA = process.argv[2];
const OUT = process.argv[3] || '/tmp/herr-forms';
const DAM = '/content/dam/pre-devportal/demo';
const ROOT = '/content/pre-devportal';
const BASE = '/herramientas-para-desarrolladores';

/*
 * Las páginas de plugin viven bajo /plugin en el portal, y es ahí donde apunta el menú
 * lateral. El árbol paralelo bajo /herramientas-... no existe en el portal, así que se
 * autoriza en la ruta real para no duplicar contenido con dos URLs.
 */
const PREFIJO_PLUGIN = '/plugin';
const esPlugin = (slug) => /^sin-integracion\/plugins\/(?!resumen$)/.test(slug);

if (!ENTRADA) { console.error('uso: node herramientas.mjs <herr-contenido.json> <dirSalida>'); process.exit(2); }

const RT = {
  section: 'core/franklin/components/section/v1/section',
  block: 'core/franklin/components/block/v1/block',
  text: 'core/franklin/components/text/v1/text',
  image: 'core/franklin/components/image/v1/image',
};

// Logotipos que el portal enlaza desde fuera y que aquí salen del DAM.
const LOGOS = {
  'otros/google-pay': ['logo-googlepay.png', 'Google Pay'],
  'otros/apple-pay': ['logo-applepay.png', 'Apple Pay'],
  'otros/bizum': ['logo-bizum.png', 'Bizum'],
};

const node = (rest) => ({ 'jcr:primaryType': 'nt:unstructured', ...rest });

const SECTION = {
  'sling:resourceType': RT.section,
  model: 'section',
  modelFields: ['name@text', 'style@multiselect'],
};

function flatten(prefix, value, form) {
  Object.entries(value).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    if (Array.isArray(v)) {
      v.forEach((entry) => form.append(`${prefix}${k}`, entry));
      form.append(`${prefix}${k}@TypeHint`, 'String[]');
    } else if (typeof v === 'object') {
      flatten(`${prefix}${k}/`, v, form);
    } else {
      form.append(`${prefix}${k}`, String(v));
    }
  });
}

const escapar = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Deja el HTML como lo que el componente de texto sabe conservar. */
function limpiarHtml(html) {
  return html
    .replace(/<code>/g, '<strong>')
    .replace(/<\/code>/g, '</strong>')
    .replace(/<img[^>]*>/g, '')
    // Los <span class="icon icon-x"> del portal apuntan a un sprite que aquí no existe: EDS
    // los toma por iconos suyos e intenta cargar /icons/x.svg, que devuelve 404.
    .replace(/<span[^>]*class="[^"]*icon[^"]*"[^>]*>.*?<\/span>/g, '')
    .replace(/<div[^>]*>|<\/div>/g, '')
    /*
     * La entrega convierte `:palabra:` en un icono de EDS. En estas páginas eso no es un
     * icono sino una coordenada Gradle (`com.cecabank.tpv:tpvsdk:4.1.0`), y el pipeline se
     * comía el token dejando la versión mal. Envolviendo el token en <strong> el texto queda
     * partido en varios nodos, deja de coincidir con el patrón y se copia igual que estaba.
     */
    .replace(/:([a-zA-Z][\w-]*):/g, ':<strong>$1</strong>:')
    .replace(/\s+/g, ' ')
    .trim();
}

const contenido = JSON.parse(fs.readFileSync(ENTRADA, 'utf8'));

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const index = [];
const paginas = [];

Object.entries(contenido).forEach(([slug, datos]) => {
  if (!datos.tramos?.length) { console.log(`  (sin contenido) ${slug}`); return; }

  const hijos = {};
  let n = 0;

  const logo = LOGOS[slug];
  if (logo) {
    hijos.image_logo = node({
      'sling:resourceType': RT.image,
      modelFields: ['image@reference', 'imageAlt@text'],
      image: `${DAM}/${logo[0]}`,
      imageAlt: logo[1],
    });
  }

  datos.tramos.forEach((tramo) => {
    n += 1;
    if (tramo.t === 'texto') {
      const html = limpiarHtml(tramo.html);
      if (html) hijos[`text_${n}`] = node({ 'sling:resourceType': RT.text, text: html });
    } else if (tramo.t === 'codigo') {
      hijos[`code-block_${n}`] = node({
        'sling:resourceType': RT.block,
        name: 'Code Block',
        model: 'code-block',
        modelFields: ['title@text', 'language@select', 'code@richtext'],
        title: 'Ejemplo',
        language: 'shell',
        code: `<pre>${escapar(tramo.codigo)}</pre>`,
      });
    } else if (tramo.t === 'tabla') {
      hijos[`table_${n}`] = node({
        'sling:resourceType': RT.block,
        name: 'Table',
        model: 'table',
        modelFields: ['caption@text', 'content@richtext'],
        caption: '',
        content: tramo.html,
      });
    }
  });

  const seccion = node({ ...SECTION, name: 'contenido', ...hijos });
  const rutaPagina = `${esPlugin(slug) ? PREFIJO_PLUGIN : ''}${BASE}/${slug}`;
  const form = new URLSearchParams();
  // El hero era un marcador automático: se retira para que la página empiece por el contenido.
  form.append('./section@Delete', 'true');
  form.append('./section_contenido@Delete', 'true');
  flatten('./section_contenido/', seccion, form);

  const nombre = slug.replace(/\//g, '__');
  fs.writeFileSync(path.join(OUT, `${nombre}.form`), form.toString());
  index.push([nombre, `${ROOT}${rutaPagina}/jcr:content/root`, 'section_contenido', ''].join('\t'));
  paginas.push(rutaPagina);
  console.log(`  ${slug.padEnd(46)} ${Object.keys(hijos).length} nodos`);
});

fs.writeFileSync(path.join(OUT, 'index.tsv'), `${index.join('\n')}\n`);
fs.writeFileSync(path.join(OUT, 'paginas.txt'), `${paginas.join('\n')}\n`);
console.log(`\n${index.length} páginas en ${OUT}`);
