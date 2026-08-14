/*
 * Contribuye las páginas de detalle del menú "Pagos online", a partir de lo scrapeado del
 * portal (detalle-contenido.json). Todas comparten la estructura de hosted-checkout:
 *
 *   section              hero + las cuatro tarjetas blancas solapadas (hero-with-cards)
 *   section_banner       franja navy en diagonal con el diagrama (solo donde el portal lo tiene)
 *   section_carrusel     "Paso a paso", con el titular a la izquierda
 *   section_entornos     "Entornos y endpoints": dos columnas con divisor
 *   section_contenido    el resto: titular, texto corrido, tablas y bloques de código
 *
 *   node detalle.mjs <detalle-contenido.json> <dirSalida>
 */
import fs from 'node:fs';
import path from 'node:path';

const ENTRADA = process.argv[2];
const OUT = process.argv[3] || '/tmp/det-forms';
const DAM = '/content/dam/pre-devportal/demo';
const ROOT = '/content/pre-devportal';

if (!ENTRADA) { console.error('uso: node detalle.mjs <detalle-contenido.json> <dirSalida>'); process.exit(2); }

const RT = {
  section: 'core/franklin/components/section/v1/section',
  block: 'core/franklin/components/block/v1/block',
  item: 'core/franklin/components/block/v1/block/item',
  text: 'core/franklin/components/text/v1/text',
  title: 'core/franklin/components/title/v1/title',
  image: 'core/franklin/components/image/v1/image',
  columns: 'core/franklin/components/columns/v1/columns',
  column: 'core/franklin/components/columns/v1/columns/column',
};

// Iconos con los que se ilustran las tarjetas del hero y los items de cada entorno.
const ICONOS_TARJETA = ['icon-plug.png', 'icon-user-check.png', 'icon-code.png', 'icon-handshake.png'];
const ICONOS_ENTORNO = ['icon-shield.png', 'icon-check-double.png', 'icon-card.png'];
const SLIDES = ['hosted-paso-1.jpg', 'hosted-paso-2.jpg', 'hosted-paso-3.jpg'];

// Imagen de hero y diagrama por página.
const MEDIOS = {
  '/integraciones/sdk': ['hero-sdk.jpg', 'sdk-diagrama.png'],
  '/integraciones/iframe': ['hero-iframe.jpg', 'iframe-diagrama.png'],
  '/integraciones/api': ['hero-api.jpg', 'api-diagrama.png'],
  '/sin-integracion/pagos-moto': ['hero-pagos-moto.jpg', null],
  '/sin-integracion/pago-por-email': ['hero-pago-por-email.jpg', null],
  '/otros/google-pay': ['hero-google-pay.jpg', null],
  '/otros/apple-pay': ['hero-apple-pay.jpg', null],
  '/otros/bizum': ['hero-bizum.jpg', null],
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

/*
 * Igual que en las páginas de herramientas: el componente de texto se come <code>, y la
 * entrega convierte `:palabra:` en un icono de EDS (aquí eso son coordenadas y rutas, no
 * iconos), así que el token se envuelve para partir el nodo de texto.
 */
function limpiarHtml(html) {
  return html
    .replace(/<code>/g, '<strong>')
    .replace(/<\/code>/g, '</strong>')
    .replace(/<img[^>]*>/g, '')
    .replace(/<span[^>]*class="[^"]*icon[^"]*"[^>]*>.*?<\/span>/g, '')
    .replace(/<div[^>]*>|<\/div>/g, '')
    .replace(/:([a-zA-Z][\w-]*):/g, ':<strong>$1</strong>:')
    .replace(/\s+/g, ' ')
    .trim();
}

const textNode = (html) => node({ 'sling:resourceType': RT.text, text: html });

const titleNode = (t, tipo = 'h2') => node({
  'sling:resourceType': RT.title, model: 'title', titleType: tipo, title: t,
});

const imageNode = (file, alt) => node({
  'sling:resourceType': RT.image,
  modelFields: ['image@reference', 'imageAlt@text'],
  image: `${DAM}/${file}`,
  imageAlt: alt,
});

const contenido = JSON.parse(fs.readFileSync(ENTRADA, 'utf8'));

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const index = [];
const paginas = [];

Object.entries(contenido).forEach(([ruta, d]) => {
  const [heroImg, diagrama] = MEDIOS[ruta] || [];
  const destino = `${ROOT}${ruta}/jcr:content/root`;
  const slug = ruta.replace(/^\//, '').replace(/\//g, '__');
  const emitir = (nombre, nodo, orden, borrar = []) => {
    const form = new URLSearchParams();
    form.append(`./${nombre}@Delete`, 'true');
    borrar.forEach((b) => form.append(`./${b}@Delete`, 'true'));
    flatten(`./${nombre}/`, nodo, form);
    const fichero = `${slug}--${nombre}`;
    fs.writeFileSync(path.join(OUT, `${fichero}.form`), form.toString());
    index.push([fichero, destino, nombre, orden || ''].join('\t'));
  };

  // --- hero + tarjetas ---
  const items = {};
  d.tarjetas.forEach((c, i) => {
    items[`item_${i}`] = node({
      'sling:resourceType': RT.item,
      model: 'card-icon',
      modelFields: ['image@reference', 'imageAlt@text', 'text@richtext'],
      image: `${DAM}/${ICONOS_TARJETA[i % ICONOS_TARJETA.length]}`,
      imageAlt: '',
      text: `<h4>${c.titulo}</h4>\n<p>${c.texto}</p>`,
    });
  });
  // El menú lateral no pinta en estas páginas: son las de detalle, no las de documentación.
  emitir('section', node({
    ...SECTION,
    name: 'hero',
    hero: node({
      'sling:resourceType': RT.block,
      name: 'Hero',
      model: 'hero',
      modelFields: ['image@reference', 'imageAlt@text', 'text@richtext'],
      image: `${DAM}/${heroImg}`,
      imageAlt: d.titulo,
      text: `<h1>${d.titulo}</h1>\n${d.entradilla.map((p) => `<p>${p}</p>`).join('\n')}`,
    }),
    cards: node({
      'sling:resourceType': RT.block, name: 'Cards', filter: 'cards-boxed', classes: 'boxed', ...items,
    }),
  }), '0', ['section_sidenav']);

  // --- franja azul con el diagrama ---
  if (d.banner && diagrama) {
    emitir('section_banner', node({
      ...SECTION,
      name: 'diagrama',
      style: ['banner'],
      text: textNode(`<h2>${d.banner.titulo}</h2>${d.banner.texto ? `\n<p>${d.banner.texto}</p>` : ''}`),
      image: imageNode(diagrama, d.banner.imgAlt || 'Diagrama de la integración'),
    }), '1');
  }

  // --- carrusel ---
  if (d.carrusel?.slides.length) {
    const slides = {};
    d.carrusel.slides.forEach((s, i) => {
      slides[`item_${i}`] = node({
        'sling:resourceType': RT.item,
        model: 'carousel-item',
        modelFields: ['media_image@reference', 'media_imageAlt@text', 'content_text@richtext'],
        media_image: `${DAM}/${SLIDES[i % SLIDES.length]}`,
        media_imageAlt: '',
        content_text: `<p>${s.texto}</p>`,
      });
    });
    emitir('section_carrusel', node({
      ...SECTION,
      name: 'carrusel',
      text: textNode(`<h2>${d.carrusel.titulo}</h2>${d.carrusel.texto ? `\n<p>${d.carrusel.texto}</p>` : ''}`),
      carousel: node({
        'sling:resourceType': RT.block, name: 'Carousel', filter: 'carousel', ...slides,
      }),
    }));
  }

  // --- entornos y endpoints ---
  if (d.dosColumnas?.columnas.length) {
    const columna = (col) => {
      const hijos = { titulo: titleNode(col.titulo, 'h3') };
      col.items.forEach((texto, i) => {
        hijos[`image_${i}`] = imageNode(ICONOS_ENTORNO[i % ICONOS_ENTORNO.length], '');
        hijos[`text_${i}`] = textNode(`<p>${texto}</p>`);
      });
      return node({ 'sling:resourceType': RT.column, ...hijos });
    };
    emitir('section_entornos', node({
      ...SECTION,
      name: 'entornos',
      title: titleNode(d.dosColumnas.titulo || 'Entornos y endpoints'),
      text: d.dosColumnas.texto ? textNode(`<p>${d.dosColumnas.texto}</p>`) : undefined,
      columns: node({
        'sling:resourceType': RT.columns,
        filter: 'columns-divided',
        classes: 'divided',
        columns: '2',
        rows: '1',
        row1: node({ col1: columna(d.dosColumnas.columnas[0]), col2: columna(d.dosColumnas.columnas[1]) }),
      }),
    }));
  }

  // --- contenido final ---
  const hijos = {};
  if (d.tituloFinal) hijos.title = titleNode(d.tituloFinal);
  if (d.textoFinal) hijos.text_intro = textNode(`<p>${d.textoFinal}</p>`);
  d.tramos.forEach((tramo, i) => {
    if (tramo.t === 'texto') {
      const html = limpiarHtml(tramo.html);
      if (html) hijos[`text_${i}`] = textNode(html);
    } else if (tramo.t === 'codigo') {
      hijos[`code-block_${i}`] = node({
        'sling:resourceType': RT.block,
        name: 'Code Block',
        model: 'code-block',
        modelFields: ['title@text', 'language@select', 'code@richtext'],
        title: 'Ejemplo',
        language: 'shell',
        code: `<pre>${escapar(tramo.codigo)}</pre>`,
      });
    } else if (tramo.t === 'tabla') {
      hijos[`table_${i}`] = node({
        'sling:resourceType': RT.block,
        name: 'Table',
        model: 'table',
        modelFields: ['caption@text', 'content@richtext'],
        caption: '',
        content: tramo.html,
      });
    }
  });
  if (Object.keys(hijos).length) {
    emitir('section_contenido', node({ ...SECTION, name: 'contenido', ...hijos }));
  }

  paginas.push(ruta);
  console.log(`  ${ruta.padEnd(34)} cards=${d.tarjetas.length} banner=${d.banner && diagrama ? 'si' : 'no'} slides=${d.carrusel?.slides.length || 0} tramos=${d.tramos.length}`);
});

fs.writeFileSync(path.join(OUT, 'index.tsv'), `${index.join('\n')}\n`);
fs.writeFileSync(path.join(OUT, 'paginas.txt'), `${paginas.join('\n')}\n`);
console.log(`\n${paginas.length} páginas · ${index.length} secciones en ${OUT}`);
