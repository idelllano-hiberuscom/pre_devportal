/*
 * Sustituye los placeholders del DAM por las imágenes reales del portal.
 *
 *   node assets-reales.mjs [--pipeline <dir>] [--out <dir>]
 *   AEM_TOKEN=... node authoring/aem.mjs upload <dir> /content/dam/pre-devportal/demo
 *
 * La idea que hace esto barato: cada imagen real se sube **con el nombre del placeholder al
 * que sustituye**, a la misma carpeta del DAM. Como el contenido ya contribuido referencia
 * esos nombres, las 25 páginas pasan a mostrar el material real sin reescribir ni una sola
 * página ni volver a ejecutar la autoría. Sale gratis, y sobre todo no arriesga el contenido
 * que ya está validado.
 *
 * De ahí sale la única restricción incómoda: hay que respetar la extensión del placeholder,
 * porque forma parte de la ruta del DAM. Un `.webp` real que sustituye a un `hero-inicio.jpg`
 * tiene que convertirse a JPEG de verdad, no solo renombrarse. Se hace con `sips`, que viene
 * en macOS, y los SVG se rasterizan con el navegador que ya usa el pipeline.
 *
 * El mapa de abajo no está adivinado: sale de `portal-images/inventario.json`, que registra
 * en qué página y con qué tamaño y `alt` aparece cada imagen del portal original.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const PIPELINE = flag('--pipeline') || HERE;
const SRC = path.join(PIPELINE, 'portal-images');
const OUT = flag('--out') || path.join(PIPELINE, 'assets-reales');

/*
 * placeholder -> fichero real. Los comentarios anotan de dónde sale cada decisión cuando no
 * es evidente; el resto se leen solos.
 */
const MAPA = {
  // --- heroes (fondos de CSS de cada página) ---
  'hero-inicio.jpg': 'home-hero.webp',
  'hero-ayuda.jpg': 'ayuda-hero.webp',
  'hero-blog.jpg': 'blog-hero.webp',
  'hero-fraude.jpg': 'ayuda-hero.webp', // el portal reutiliza el mismo fondo en /fraude
  'hero-onboarding.jpg': 'empieza-con-nosotros-hero.webp',
  'hero-herramientas.jpg': 'herramientas-desarrolladores-hero.webp',
  'hero-integraciones.jpg': 'hosted-checkout-hero.webp',
  'hero-hosted.jpg': 'hosted-checkout-hero.webp',
  'hero-api.jpg': 'a4368ae230d81b0dd338147e85052dce3c9ed9de.webp',
  'hero-sdk.jpg': 'fc15c0dec1ea2dfe13f0ecef8d85d6ba7beea832.webp',
  'hero-pagos-moto.jpg': 'd9aacdd74de1a91d0cf395af2b7629dde6d833dc-1-1.webp',
  'hero-pago-por-email.jpg': 'd9aacdd74de1a91d0cf395af2b7629dde6d833dc-1-1.webp',
  // Estas cuatro páginas del portal no tienen fondo propio: se les deja el de su sección.
  'hero-iframe.jpg': 'hosted-checkout-hero.webp',
  'hero-plugins.jpg': 'herramientas-desarrolladores-hero.webp',
  'hero-apple-pay.jpg': 'empieza-con-nosotros-hero.webp',
  'hero-bizum.jpg': 'empieza-con-nosotros-hero.webp',
  'hero-google-pay.jpg': 'empieza-con-nosotros-hero.webp',
  'swagger-login.jpg': 'jpeg.webp', // fondo de /con-integracion/api/swagger

  // --- imágenes de contenido ---
  'features-inicio.jpg': 'rectangle-36-png.webp',        // alt="Caracteristicas" en /inicio
  'contact-form.jpg': 'home-contacto-0.webp',            // alt="Contacto"
  'video-poster.jpg': 'rectangle-36-png.webp',
  'hosted-diagrama.png': 'checkout-2.webp',              // alt="hosted diagrama"
  'api-diagrama.png': 'api-rest-1-png.webp',             // alt="API Diagrama"
  'sdk-diagrama.png': 'sdk-1-png.webp',                  // alt="SDK diagrama"
  'iframe-diagrama.png': 'checkout-2.webp',              // /iframe no publica diagrama propio
  'hosted-paso-1.jpg': 'hosted-checkout-paso-1.webp',
  'hosted-paso-2.jpg': 'hosted-checkout-paso-2.webp',
  'hosted-paso-3.jpg': 'hosted-checkout-paso-3.webp',
  'paso-1.jpg': 'hosted-checkout-paso-1.webp',
  'paso-2.jpg': 'hosted-checkout-paso-2.webp',
  'paso-3.jpg': 'hosted-checkout-paso-3.webp',
  'paso-4.jpg': 'hosted-checkout-paso-3.webp',           // el portal repite el tercero
  'blog-destacado.jpg': 'landing-image-4.jpg',
  'blog-secundario-1.jpg': 'landing-form-image-2.png',
  'blog-secundario-2.jpg': 'nosostros-header-2.png',

  // --- logotipos ---
  'logo-cecabank.png': 'logo-footer-png.webp',
  'cert-visa.png': 'visa-logo-png.webp',
  'cert-mastercard.png': 'logo-mastercard-png.webp',
  'cert-amex.png': 'logo-american-express-png.webp',
  'logo-visa.png': 'visa.svg',
  'logo-mastercard.png': 'mastercard.svg',
  'logo-amex.png': 'americanexpress.svg',
  'logo-applepay.png': 'applepay.svg',
  'logo-googlepay.png': 'googlepay.svg',
  'logo-bizum.png': 'bizum.svg',
  'logo-woocommerce.png': 'woocommerce-logo-transp-png.webp',
  'logo-prestashop.png': 'prestashop-transparente1-png.webp',
  'logo-magento.png': 'magento-transparente1-png.webp',
  'logo-oscommerce.png': 'oscommerce-transparente-png.webp',
  'logo-givewp.png': 'give-logo-png.webp',

  // --- iconos (Lucide, tal y como los pinta el portal) ---
  'icon-basket.png': 'shopping-basket.svg',
  'icon-clock.png': 'clock-4.svg',
  'icon-history.png': 'wallet-cards.svg',
  'icon-shuffle.png': 'shuffle.svg',
  'icon-wallet.png': 'hand-coins.svg',
  'icon-plug.png': 'plug-2.svg',
  // La regla es la del donut de /fraude, donde el portal sí usa una regla. Al "Monitor de
  // fraude" de la home le corresponde un monitor, y ese placeholder no existía.
  'icon-ruler.png': 'ruler.svg',
  'icon-monitor.png': 'monitor.svg',
  'icon-shield.png': 'shield-check.svg',
  'icon-gear.png': 'settings.svg',
  'icon-handshake.png': 'handshake.svg',
  'icon-file.png': 'file-text.svg',
  'icon-card.png': 'credit-card.svg',
  'icon-check-double.png': 'check-check.svg',
  'icon-code.png': 'code-xml.svg',
  'icon-user-check.png': 'user-round-check.svg',
  'icon-user.png': 'user-round.svg',
  'icon-folder.png': 'folder.svg',
};

/*
 * Tope de anchura por destino. El portal sirve tres imágenes sin optimizar (una de 6,9 MB)
 * que aquí se reducen: son el 90 % del peso total y el objetivo de rendimiento del proyecto
 * es 95. A partir de 2000 px de ancho no se gana nada visible en pantalla.
 */
const ANCHO_MAX = 2000;
const ICONO_PX = 224;   // 2x sobre los 108 px del icono más grande del portal
const TEAL = 'rgb(1,127,155)';

/*
 * El portal pinta sus iconos en dos colores: teal y navy. El navy solo funciona sobre fondo
 * claro, que es donde el portal lo usa. `icon-file` es el único que además aparece sobre la
 * sección azul de la home, donde en navy queda literalmente invisible; se fuerza a teal, que
 * se lee bien sobre los dos fondos. El resto conserva el color con el que lo sirve el portal.
 */
const FORZAR_TEAL = new Set(['icon-file.png']);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const svgPendientes = [];
const filas = [];

for (const [destino, origen] of Object.entries(MAPA)) {
  const src = path.join(SRC, origen);
  if (!fs.existsSync(src)) {
    filas.push([destino, origen, 'FALTA', 0]);
    continue;
  }
  const dst = path.join(OUT, destino);

  if (origen.endsWith('.svg')) {
    svgPendientes.push({ src, dst, destino, origen });
    continue;
  }

  const formato = destino.endsWith('.png') ? 'png' : 'jpeg';
  execFileSync('sips', ['-s', 'format', formato, src, '--out', dst], { stdio: 'ignore' });
  // El reescalado va en un segundo paso: sips ignora -Z si se combina con -s format.
  const ancho = Number(execFileSync('sips', ['-g', 'pixelWidth', dst]).toString().match(/pixelWidth:\s*(\d+)/)?.[1] || 0);
  if (ancho > ANCHO_MAX) execFileSync('sips', ['-Z', String(ANCHO_MAX), dst], { stdio: 'ignore' });

  filas.push([destino, origen, 'ok', fs.statSync(dst).size]);
}

// Los SVG se rasterizan en el navegador, que es lo único a mano que entiende SVG de verdad.
if (svgPendientes.length) {
  const navegador = await chromium.launch();
  const page = await navegador.newPage({
    viewport: { width: ICONO_PX, height: ICONO_PX },
    deviceScaleFactor: 1,
  });
  for (const { src, dst, destino, origen } of svgPendientes) {
    let svg = fs.readFileSync(src, 'utf8');
    /*
     * Los iconos que el portal saca de su sprite propio no llevan color en el marcado: lo
     * heredan por CSS y, sueltos, se pintarían en negro. Los de Lucide sí traen su `stroke`
     * ya resuelto, en teal o en navy según la página, y esos se dejan como están porque esa
     * variación es del portal, no un descuido. Solo se colorea lo que viene sin color.
     */
    /*
     * Dos casos distintos y no se pueden tratar igual. Los del sprite son trazados rellenos
     * y sin color: se les pone `fill` por CSS. Los de Lucide son line-art con `fill="none"` y
     * el color en `stroke`; ahí hay que sustituir el color *en el marcado*, porque una regla
     * CSS de `fill` gana a la presentación `fill="none"` y el icono sale como una mancha.
     */
    const sinColor = destino.startsWith('icon-') && !svg.includes('rgb(');
    const color = sinColor ? `svg{fill:${TEAL}}` : '';
    if (FORZAR_TEAL.has(destino)) svg = svg.replace(/rgb\([^)]*\)/g, TEAL);
    // Fondo transparente y el SVG estirado al lienzo: así el PNG sale sin márgenes muertos.
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${ICONO_PX}px;height:${ICONO_PX}px}${color}</style>${svg}`,
      { waitUntil: 'load' },
    );
    await page.screenshot({ path: dst, omitBackground: true });
    filas.push([destino, origen, 'ok (svg->png)', fs.statSync(dst).size]);
  }
  await navegador.close();
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
filas.sort((a, b) => a[0].localeCompare(b[0]));
filas.forEach(([d, o, est, bytes]) => {
  console.log(`  ${d.padEnd(26)} <- ${o.padEnd(50)} ${est.padEnd(14)} ${bytes ? kb(bytes) : ''}`);
});
const faltan = filas.filter((f) => f[2] === 'FALTA');
console.log(`\n${filas.length - faltan.length}/${filas.length} listas · ${kb(filas.reduce((a, f) => a + f[3], 0))}`);
if (faltan.length) console.log(`sin origen: ${faltan.map((f) => f[0]).join(', ')}`);
console.log(`\n${OUT}`);
