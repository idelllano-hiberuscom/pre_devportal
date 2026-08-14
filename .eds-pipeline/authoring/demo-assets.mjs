/*
 * Genera el juego de imágenes demo para el portal.
 * Todo se dibuja en canvas con la paleta medida del portal (navy #013451, teal #017f9b)
 * y se exporta como JPEG (fotografías) o PNG (iconos y logotipos, con transparencia).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Rutas relativas al propio script: la ruta del repositorio contiene espacios, así que
// fileURLToPath y no URL.pathname.
const HERE = path.dirname(fileURLToPath(import.meta.url));


const OUT = path.join(HERE, 'demo-assets');
fs.mkdirSync(OUT, { recursive: true });

// Fotografías de hero y de composición: degradados de marca con una malla suave encima.
const PHOTOS = [
  ['hero-inicio', 1600, 900, ['#013451', '#017f9b']],
  ['hero-ayuda', 1600, 900, ['#04283c', '#2a7d92']],
  ['hero-blog', 1600, 900, ['#012a40', '#4a8fa1']],
  ['hero-fraude', 1600, 900, ['#01202f', '#136b80']],
  ['hero-onboarding', 1600, 900, ['#023349', '#3f97ab']],
  ['hero-herramientas', 1600, 900, ['#012938', '#1c7f95']],
  ['hero-integraciones', 1600, 900, ['#01364f', '#0f8ba3']],
  ['hero-plugins', 1600, 900, ['#022c3e', '#2b8397']],
  ['contact-form', 720, 800, ['#01243a', '#1a6f88']],
  ['swagger-login', 1400, 900, ['#011e2c', '#125f75']],
  ['blog-destacado', 1200, 800, ['#023044', '#2d8497']],
  ['blog-secundario-1', 800, 600, ['#012c42', '#3b8b9d']],
  ['blog-secundario-2', 800, 600, ['#01374d', '#1d7d94']],
  ['paso-1', 704, 832, ['#01293c', '#17758c']],
  ['paso-2', 704, 832, ['#02324a', '#2b8598']],
  ['paso-3', 704, 832, ['#012534', '#0f6d84']],
  ['paso-4', 704, 832, ['#023a52', '#3d93a6']],
  // Retrato que acompaña a las cuatro tarjetas de /inicio (el portal usa 1090x1304).
  ['features-inicio', 1090, 1304, ['#012f45', '#2a8296']],
  // Póster del vídeo de /inicio. En 4:3, que es la proporción del vídeo del portal
  // (<video width="640" height="480">) y la que reproduce el bloque.
  ['video-poster', 960, 720, ['#01293c', '#1a7f96']],
  ['hero-hosted', 1600, 900, ['#02303f', '#227e93']],
  ['hosted-paso-1', 350, 525, ['#012b3f', '#1b7288']],
  ['hosted-paso-2', 554, 350, ['#023348', '#2f8799']],
  ['hosted-paso-3', 350, 450, ['#01243a', '#14708a']],
  // Heros de las páginas de detalle del menú "Pagos online".
  ['hero-sdk', 1600, 900, ['#012c40', '#1e7a90']],
  ['hero-iframe', 1600, 900, ['#02364c', '#2b8ba0']],
  ['hero-api', 1600, 900, ['#011f30', '#166f88']],
  ['hero-pagos-moto', 1600, 900, ['#023246', '#2a8095']],
  ['hero-pago-por-email', 1600, 900, ['#012738', '#1b7c93']],
  ['hero-google-pay', 1600, 900, ['#023b53', '#3a94a8']],
  ['hero-apple-pay', 1600, 900, ['#01222e', '#14657c']],
  ['hero-bizum', 1600, 900, ['#022e44', '#25849b']],
];

// Iconos de línea, estilo lucide, en teal de marca.
const ICONS = {
  'icon-basket': 'M5 8h14l-1.2 9.5a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Zm3.5 0 1.2-3.5M15.5 8l-1.2-3.5M9.5 12v3.5M14.5 12v3.5',
  'icon-coins': 'M8 10.5a4.5 3 0 1 0 9 0 4.5 3 0 1 0-9 0M8 10.5v4c0 1.6 2 3 4.5 3s4.5-1.4 4.5-3v-4M4 7.5a4.5 3 0 1 0 9 0 4.5 3 0 1 0-9 0M4 7.5v4',
  'icon-wallet': 'M4 8h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Zm0 0V6a2 2 0 0 1 2-2h10M16 13h2',
  'icon-shuffle': 'M17 4l3 3-3 3M4 7h6.5c2 0 3 1.5 4 3M17 20l3-3-3-3M4 17h6.5c2 0 3-1.5 4-3',
  'icon-plug': 'M9 3v6M15 3v6M6 9h12v3a6 6 0 0 1-12 0V9Zm6 9v3',
  'icon-shield': 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Zm-3.5 9 2.5 2.5 4.5-4.5',
  'icon-gear': 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM12 3v2.5M12 18.5V21M4.2 7.5l2.2 1.3M17.6 15.2l2.2 1.3M4.2 16.5l2.2-1.3M17.6 8.8l2.2-1.3',
  'icon-handshake': 'M4 12l4-4 3 3 3-3 4 4-4 4-3-3-3 3-4-4Z',
  'icon-folder': 'M4 7h5l2 2.5h9V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z',
  'icon-file': 'M7 3h7l4 4v14H7V3Zm7 0v4h4M10 12h6M10 16h6',
  'icon-user': 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5',
  'icon-history': 'M4 9V4m0 5h5M4.5 9a8 8 0 1 1 1.2 8M12 8v4.5l3.5 2',
  'icon-ruler': 'M3 15 15 3l6 6L9 21l-6-6Zm4-1 1.5 1.5M10 11l1.5 1.5M13 8l1.5 1.5',
  'icon-clock': 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 3.5V12l3 2',
  'icon-user-check': 'M10 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM3.5 20c0-3 2.9-5 6.5-5 1.3 0 2.5.26 3.5.72M15 17.5l2 2 4-4',
  'icon-code': 'M9 7 4 12l5 5M15 7l5 5-5 5',
  'icon-check-double': 'm3 12.5 4 4 7.5-9M11 16.5l1.5 1.5 8-9',
  'icon-card': 'M3 7h18v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Zm0 3.5h18',
};

// Logotipos de plataforma y de método de pago, tipográficos.
const LOGOS = [
  ['logo-visa', 'VISA', 200, 64],
  ['logo-mastercard', 'MC', 200, 64],
  ['logo-amex', 'AMEX', 200, 64],
  ['logo-bizum', 'bizum', 200, 64],
  ['logo-applepay', 'Pay', 200, 64],
  ['logo-googlepay', 'G Pay', 200, 64],
  ['logo-woocommerce', 'WooCommerce', 494, 100],
  ['logo-prestashop', 'PrestaShop', 494, 100],
  ['logo-magento', 'Magento', 494, 100],
  ['logo-oscommerce', 'osCommerce', 494, 100],
  ['logo-givewp', 'GiveWP', 494, 100],
];

/*
 * Logotipo de la marca para el pie: el pie va sobre navy, así que el tipográfico se dibuja en
 * blanco. A 448x80 para que los 224x40 que mide el portal se vean nítidos en pantallas 2x.
 */
const WORDMARKS = [
  ['logo-cecabank', 'cecabank', 448, 80],
];

// Sellos de certificación del pie. Son los mismos de LOGOS pero en blanco: sobre el navy del
// pie, la versión en color de marca queda invisible.
const CERT_LOGOS = [
  ['cert-visa', 'VISA', 200, 64],
  ['cert-mastercard', 'MC', 200, 64],
  ['cert-amex', 'AMEX', 200, 64],
];

/*
 * Diagrama de secuencia de la integración Hosted, el que el portal muestra dentro de la
 * franja azul. Se dibuja en blanco sobre transparente porque va sobre el navy de la sección.
 */
const DIAGRAMS = [
  ['sdk-diagrama', 1090, 631, {
    actores: ['Cliente', 'App / SDK', 'Cecabank'],
    pasos: [
      [0, 1, 'Inicia el pago en la app'],
      [1, 2, 'El SDK envía los datos de pago'],
      [2, 1, 'Resultado de la operación'],
      [1, 0, 'La app muestra el resultado'],
    ],
  }],
  ['iframe-diagrama', 1090, 631, {
    actores: ['Cliente', 'Comercio', 'Cecabank'],
    pasos: [
      [0, 1, 'Inicia el pago'],
      [1, 2, 'Solicita el formulario'],
      [2, 1, 'Devuelve el iframe embebible'],
      [1, 0, 'Muestra el iframe'],
      [0, 2, 'Introduce los datos en el iframe'],
      [2, 1, 'Notifica el resultado'],
    ],
  }],
  ['api-diagrama', 1090, 631, {
    actores: ['Cliente', 'Comercio', 'Cecabank'],
    pasos: [
      [0, 1, 'Inicia el pago'],
      [1, 2, 'Envía los datos del pago'],
      [2, 1, 'Responde con el resultado'],
      [1, 0, 'Muestra el resultado'],
    ],
  }],
  ['hosted-diagrama', 1090, 631, {
    actores: ['Cliente', 'Comercio', 'Cecabank'],
    pasos: [
      [0, 1, 'Inicia pago'],
      [1, 0, 'Redirecciona al formulario de pago'],
      [0, 2, 'Introduce datos y confirma'],
      [2, 1, 'Notificación de resultado'],
      [1, 0, 'Redirecciona a la URL de retorno'],
    ],
  }],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 100, height: 100 } });
await page.goto('about:blank');

const written = [];

async function shoot(name, ext, w, h, drawFn, args) {
  const dataUrl = await page.evaluate(async ({ w, h, fn, args, ext }) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    // eslint-disable-next-line no-new-func
    new Function('ctx', 'w', 'h', 'a', fn)(c.getContext('2d'), w, h, args);
    return c.toDataURL(ext === 'png' ? 'image/png' : 'image/jpeg', 0.86);
  }, { w, h, fn: drawFn, args, ext });
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  const file = `${OUT}/${name}.${ext}`;
  fs.writeFileSync(file, buf);
  written.push({ name: `${name}.${ext}`, bytes: buf.length, w, h });
}

const PHOTO_DRAW = `
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, a.c1); g.addColorStop(1, a.c2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // malla diagonal muy suave, para que no sea un degradado plano
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
  for (let i = -h; i < w; i += 26) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke(); }
  // dos halos radiales para dar profundidad
  for (const [cx, cy, r, al] of [[w * 0.24, h * 0.28, Math.max(w, h) * 0.42, 0.16], [w * 0.78, h * 0.74, Math.max(w, h) * 0.36, 0.10]]) {
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, 'rgba(255,255,255,' + al + ')'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
  }
  // viñeteado inferior, para que el texto superpuesto en blanco lea bien
  const vg = ctx.createLinearGradient(0, h * 0.45, 0, h);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
`;

const ICON_DRAW = `
  ctx.clearRect(0, 0, w, h);
  ctx.save(); ctx.scale(w / 24, h / 24);
  ctx.strokeStyle = '#017f9b'; ctx.lineWidth = 1.7;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke(new Path2D(a.d));
  ctx.restore();
`;

const LOGO_DRAW = `
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = a.ink || '#013451';
  ctx.font = '600 ' + Math.round(h * 0.46) + 'px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(a.label, w / 2, h / 2 + 1);
  ctx.strokeStyle = a.rule || 'rgba(1,127,155,0.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(w * 0.5 - a.label.length * h * 0.14, h * 0.82);
  ctx.lineTo(w * 0.5 + a.label.length * h * 0.14, h * 0.82); ctx.stroke();
`;

for (const [name, w, h, [c1, c2]] of PHOTOS) {
  await shoot(name, 'jpg', w, h, PHOTO_DRAW, { c1, c2 });
}
for (const [name, d] of Object.entries(ICONS)) {
  await shoot(name, 'png', 96, 96, ICON_DRAW, { d });
}
const WORDMARK_DRAW = `
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 ' + Math.round(h * 0.62) + 'px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(a.label, 0, h / 2);
`;

for (const [name, label, w, h] of LOGOS) {
  await shoot(name, 'png', w, h, LOGO_DRAW, { label });
}
for (const [name, label, w, h] of WORDMARKS) {
  await shoot(name, 'png', w, h, WORDMARK_DRAW, { label });
}
for (const [name, label, w, h] of CERT_LOGOS) {
  await shoot(name, 'png', w, h, LOGO_DRAW, { label, ink: '#ffffff', rule: 'rgba(255,255,255,0.55)' });
}

const DIAGRAM_DRAW = `
  ctx.clearRect(0, 0, w, h);
  const cols = a.actores.length;
  const paso = w / (cols + 1);
  const xs = a.actores.map((_, i) => paso * (i + 1));
  const yTop = 118;
  const yBase = h - 40;

  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // cabecera: un círculo por actor con su nombre debajo
  a.actores.forEach((nombre, i) => {
    ctx.beginPath(); ctx.arc(xs[i], 46, 30, 0, Math.PI * 2); ctx.stroke();
    ctx.font = '500 22px Helvetica, Arial, sans-serif';
    ctx.fillText(nombre, xs[i], yTop - 22);
    // línea de vida
    ctx.save();
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.moveTo(xs[i], yTop); ctx.lineTo(xs[i], yBase); ctx.stroke();
    ctx.restore();
  });

  // mensajes entre actores, con punta de flecha
  const salto = (yBase - yTop - 40) / a.pasos.length;
  a.pasos.forEach(([de, para, etiqueta], i) => {
    const y = yTop + 40 + salto * i;
    const x1 = xs[de];
    const x2 = xs[para];
    const dir = Math.sign(x2 - x1);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y); ctx.lineTo(x2 - 12 * dir, y - 6); ctx.lineTo(x2 - 12 * dir, y + 6);
    ctx.closePath(); ctx.fill();
    ctx.font = '400 17px Helvetica, Arial, sans-serif';
    ctx.fillText(etiqueta, (x1 + x2) / 2, y - 16);
  });
`;

for (const [name, w, h, args] of DIAGRAMS) {
  await shoot(name, 'png', w, h, DIAGRAM_DRAW, args);
}

await browser.close();

const total = written.reduce((s, f) => s + f.bytes, 0);
written.forEach((f) => console.log(`${f.name.padEnd(24)} ${String(f.w).padStart(4)}x${String(f.h).padEnd(4)} ${(f.bytes / 1024).toFixed(1)} KB`));
console.log(`\n${written.length} ficheros · ${(total / 1024).toFixed(0)} KB en total`);
fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify(written, null, 2));
