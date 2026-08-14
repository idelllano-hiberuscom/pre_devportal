/*
 * Descarga las imágenes reales del portal de origen para sustituir a los placeholders.
 *
 *   node extract-images.mjs [--out <dir>] [--solo <ruta>] [--pipeline <dir>]
 *
 * `--pipeline` existe porque playwright no está instalado en este repositorio sino en el del
 * toolkit, y Node resuelve los paquetes desde la carpeta del script: hay que ejecutarlo desde
 * allí y decirle dónde está el `.eds-pipeline` con el inventario de páginas.
 *
 * Captura por tres vías porque ninguna basta sola:
 *
 *   1. `<img>`, interceptando las respuestas de red.
 *   2. `background-image`, leyendo los estilos computados de todo el DOM: si el fondo ya
 *      estaba en caché no vuelve a pasar por la red y la vía 1 no lo ve.
 *   3. `<svg>` inline, serializando el marcado. Aquí está la mitad del portal y no se
 *      descarga de ningún sitio: los iconos de las tarjetas los pinta `lucide-angular` en el
 *      DOM, y los grandes salen de un sprite propio vía `<use href="...svg#id">`. Sacarlos
 *      así los deja vectoriales, que es mejor que rasterizarlos.
 *
 * El portal es una SPA, de modo que hace falta navegador de verdad: `curl` devuelve el índice
 * vacío.
 *
 * Se deduplica por hash del contenido, no por URL: el mismo icono se sirve desde varias rutas
 * y con parámetros de tamaño distintos, y contarlo dos veces inflaría el DAM sin motivo.
 *
 * Salida: los binarios, más `inventario.json` con qué página usa cada imagen, sus dimensiones
 * y su papel (icono, foto, logotipo) deducido del tamaño y del contexto.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ORIGEN = 'https://pre-devportaltpv.cloud.cecabank.es';

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const PIPELINE = flag('--pipeline') || HERE;
const OUT = flag('--out') || path.join(PIPELINE, 'portal-images');
const SOLO = flag('--solo');

const paginas = JSON.parse(fs.readFileSync(path.join(PIPELINE, 'authoring/page-content.json'), 'utf8'))
  .map((p) => p.docPath)
  .filter((p) => !SOLO || p === SOLO);

fs.mkdirSync(OUT, { recursive: true });

/** Extensión a partir del content-type, que es más fiable que la de la URL. */
const extDe = (tipo, url) => {
  const porTipo = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/svg+xml': 'svg',
    'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif',
  }[(tipo || '').split(';')[0].trim()];
  if (porTipo) return porTipo;
  const m = url.match(/\.(jpe?g|png|svg|webp|gif|avif)(?:[?#]|$)/i);
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'bin';
};

/*
 * Nombre legible a partir de la URL. El portal sirve muchos assets con un hash por delante
 * (`a3f9d2.icono-tarjeta.png`); se quita para que el DAM quede navegable a ojo.
 */
const nombreDe = (url) => {
  const base = decodeURIComponent(new URL(url, ORIGEN).pathname.split('/').pop() || 'asset');
  return base
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/^[0-9a-f]{6,}[.-]/i, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'asset';
};

const porHash = new Map();   // hash -> registro
const usos = [];             // {pagina, hash, via, alt, ancho, alto}

const navegador = await chromium.launch();
const ctx = await navegador.newContext({ viewport: { width: 1440, height: 1000 } });

// Cachea los cuerpos de las respuestas de imagen que vayan pasando.
const cuerpos = new Map();   // url -> {buffer, tipo}
ctx.on('response', async (res) => {
  const tipo = res.headers()['content-type'] || '';
  if (!tipo.startsWith('image/')) return;
  try { cuerpos.set(res.url(), { buffer: await res.body(), tipo }); } catch { /* redirecciones */ }
});

/** Guarda un binario si no lo teníamos ya, y devuelve su registro. */
function registrar(url, buffer, tipo) {
  const hash = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 12);
  if (porHash.has(hash)) return porHash.get(hash);
  const ext = extDe(tipo, url);
  let nombre = nombreDe(url);
  // Colisión de nombre con contenido distinto: se desempata con el hash.
  if ([...porHash.values()].some((r) => r.nombre === nombre)) nombre = `${nombre}-${hash.slice(0, 4)}`;
  const fichero = `${nombre}.${ext}`;
  fs.writeFileSync(path.join(OUT, fichero), buffer);
  const reg = {
    hash, fichero, url, bytes: buffer.length, ext, nombre,
  };
  porHash.set(hash, reg);
  return reg;
}

for (const ruta of paginas) {
  const page = await ctx.newPage();
  try {
    /*
     * `networkidle` como condición de `goto` tumbaba dos páginas: alguna llamada queda
     * abierta indefinidamente (analítica, un sondeo) y la red nunca llega a quedarse quieta.
     * Se espera al DOM, que sí llega siempre, y la quietud se busca después con presupuesto
     * propio y sin que su vencimiento sea un error: para entonces las imágenes ya están.
     */
    await page.goto(`${ORIGEN}${ruta}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    // El portal monta bastante contenido al hacer scroll; se recorre para forzar la carga.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => { setTimeout(r, 60); });
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1200);

    // 1) <img> del DOM, con su alt y su tamaño renderizado: eso da el papel del asset.
    const imgs = await page.evaluate(() => [...document.querySelectorAll('img')]
      .filter((i) => i.currentSrc || i.src)
      .map((i) => ({
        url: i.currentSrc || i.src,
        alt: i.alt || '',
        ancho: Math.round(i.getBoundingClientRect().width),
        alto: Math.round(i.getBoundingClientRect().height),
      })));

    // 2) fondos de CSS en cualquier elemento del documento
    const fondos = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('*').forEach((el) => {
        const bg = getComputedStyle(el).backgroundImage;
        if (!bg || bg === 'none') return;
        [...bg.matchAll(/url\(["']?(.*?)["']?\)/g)].forEach((m) => {
          if (m[1] && !m[1].startsWith('data:')) {
            const r = el.getBoundingClientRect();
            out.push({ url: m[1], ancho: Math.round(r.width), alto: Math.round(r.height) });
          }
        });
      });
      return out;
    });

    // 3) SVG inline. Se descartan los del cromo de la interfaz (flechitas, hamburguesa,
    //    botón de cookies): no son contenido y no van al DAM.
    const svgs = await page.evaluate(() => {
      const CHROME = /chevron|arrow|caret|toggler|cookie|menu|close|search/i;
      return [...document.querySelectorAll('svg')].map((s) => {
        const r = s.getBoundingClientRect();
        const cls = (s.getAttribute('class') || '').toString();
        const uso = s.querySelector('use');
        const href = uso?.getAttribute('href') || uso?.getAttribute('xlink:href') || '';
        // Lucide deja el nombre del icono en la clase, pero no todos los SVG son suyos: para
        // esos se recurre a la etiqueta accesible o al destino del enlace que los envuelve
        // (los de redes sociales, por ejemplo, solo se distinguen por ahí).
        const enlace = s.closest('a')?.getAttribute('href') || '';
        return {
          cls,
          href,
          pista: s.getAttribute('aria-label') || s.querySelector('title')?.textContent
            || s.closest('[aria-label]')?.getAttribute('aria-label') || enlace,
          ancho: Math.round(r.width),
          alto: Math.round(r.height),
          // El color real con el que se pinta: el marcado usa `currentColor`, que fuera de
          // su página se resolvería a negro.
          color: getComputedStyle(s).color,
          markup: s.outerHTML,
          descartar: r.width < 24 || CHROME.test(cls),
        };
      }).filter((s) => !s.descartar);
    });

    for (const svg of svgs) {
      let markup = svg.markup;
      let nombre;

      if (svg.href) {
        // Referencia a un sprite: hay que traerse el símbolo y dejarlo independiente.
        const [spriteUrl, id] = svg.href.split('#');
        const abs = new URL(spriteUrl, `${ORIGEN}${ruta}`).href;
        // eslint-disable-next-line no-await-in-loop
        const sprite = await ctx.request.get(abs).then((r) => (r.ok() ? r.text() : '')).catch(() => '');
        const sym = sprite.match(new RegExp(`<symbol[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)</symbol>`));
        if (!sym) continue;
        const viewBox = sym[0].match(/viewBox=["']([^"']+)["']/)?.[1] || '0 0 108 108';
        markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${svg.ancho}" height="${svg.alto}">${sym[1]}</svg>`;
        nombre = id.replace(/^icon-/i, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      } else {
        const dePista = (svg.pista || '')
          .replace(/^https?:\/\/(?:www\.)?/, '')     // de una URL vale el dominio
          .split(/[/?#]/)[0]
          .replace(/\.(com|es|org|net)$/i, '')
          .replace(/[^a-z0-9]+/gi, '-')
          .replace(/^-+|-+$/g, '')
          .toLowerCase();
        nombre = (svg.cls.match(/lucide-([a-z0-9-]+)/i)?.[1] || dePista || 'icono').toLowerCase();
      }

      markup = markup
        .replace(/currentColor/g, svg.color)
        .replace(/\sclass=("|')[^"']*\1/g, '')
        .replace(/\s_?ng[a-z-]*=("|')[^"']*\1/gi, '');
      if (!markup.includes('xmlns')) markup = markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');

      const buffer = Buffer.from(markup, 'utf8');
      const reg = registrar(`${nombre}.svg`, buffer, 'image/svg+xml');
      usos.push({
        pagina: ruta, hash: reg.hash, fichero: reg.fichero, alt: '', ancho: svg.ancho, alto: svg.alto, via: 'svg-inline',
      });
    }

    const vistos = new Set();
    for (const { url, alt, ancho, alto } of [...imgs, ...fondos.map((f) => ({ ...f, alt: '' }))]) {
      const abs = new URL(url, `${ORIGEN}${ruta}`).href;
      if (vistos.has(abs)) continue;
      vistos.add(abs);

      let cuerpo = cuerpos.get(abs);
      if (!cuerpo) {
        // No pasó por la red (caché) o es un fondo: se pide aparte desde el mismo contexto.
        try {
          const r = await ctx.request.get(abs);
          if (!r.ok()) continue;
          cuerpo = { buffer: await r.body(), tipo: r.headers()['content-type'] || '' };
        } catch { continue; }
      }
      if (!cuerpo.buffer?.length) continue;

      const reg = registrar(abs, cuerpo.buffer, cuerpo.tipo);
      usos.push({
        pagina: ruta, hash: reg.hash, fichero: reg.fichero, alt, ancho, alto,
        via: imgs.some((i) => new URL(i.url, ORIGEN).href === abs) ? 'img' : 'background',
      });
    }
    console.log(`  ${ruta.padEnd(64)} ${vistos.size} imagen(es)`);
  } catch (e) {
    console.log(`  FALLO ${ruta} :: ${e.message.split('\n')[0]}`);
  } finally {
    await page.close();
  }
}

await navegador.close();

/*
 * Papel del asset, para saber a qué carpeta del DAM va y con qué nombre. Se deduce del tamaño
 * al que se pinta, no del fichero: el mismo PNG de 512px puede ser un icono de 48 o un hero.
 */
function papel(reg) {
  const u = usos.filter((x) => x.hash === reg.hash);
  const max = Math.max(0, ...u.map((x) => Math.max(x.ancho, x.alto)));
  if (/logo|marca|brand/.test(reg.nombre)) return 'logo';
  if (reg.ext === 'svg' || max <= 96) return 'icono';
  if (max >= 700) return 'foto';
  return 'ilustracion';
}

const inventario = [...porHash.values()]
  .map((reg) => ({
    ...reg,
    papel: papel(reg),
    paginas: [...new Set(usos.filter((u) => u.hash === reg.hash).map((u) => u.pagina))],
    alt: usos.find((u) => u.hash === reg.hash && u.alt)?.alt || '',
  }))
  .sort((a, b) => a.papel.localeCompare(b.papel) || b.bytes - a.bytes);

fs.writeFileSync(path.join(OUT, 'inventario.json'), `${JSON.stringify({ usos, inventario }, null, 2)}\n`);

const kb = (n) => `${Math.round(n / 1024)} KB`;
const porPapel = inventario.reduce((a, r) => { a[r.papel] = (a[r.papel] || 0) + 1; return a; }, {});
console.log(`\n${inventario.length} imágenes únicas · ${kb(inventario.reduce((a, r) => a + r.bytes, 0))}`);
console.log(Object.entries(porPapel).map(([k, v]) => `${k}: ${v}`).join(' · '));
console.log(`\n${OUT}`);
