/*
 * Contribución aditiva de lo que faltaba respecto al portal:
 *
 *   /inicio                 las 4 tarjetas con su imagen al lado, la rejilla de 6 tarjetas,
 *                           el vídeo y el formulario de contacto
 *   /footer                 logotipo, los tres grupos de enlaces y las certificaciones
 *   /empieza-con-nosotros   el bloque azul de funcionalidades, encima de los logotipos
 *
 * Cada payload toca un único nodo y borra solo ese nodo antes de reescribirlo, así que se
 * puede reejecutar sin duplicar y sin pisar lo que se esté autorizando en Universal Editor.
 *
 *   node home-blocks.mjs <dirSalida>   -> ficheros .form + index.tsv
 *
 * El índice lleva la ruta destino y, cuando importa, el `:order` con el que hay que colocar
 * el nodo: las secciones nuevas se añaden al final salvo que se pida lo contrario. El orden
 * va en una petición aparte porque `:order` posiciona el nodo al que se dirige el POST, y
 * estos payloads se dirigen al padre para poder borrar y recrear el hijo en un solo paso.
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || '/tmp/home-forms';
const DAM = '/content/dam/pre-devportal/demo';
const ROOT = '/content/pre-devportal';

const RT = {
  section: 'core/franklin/components/section/v1/section',
  block: 'core/franklin/components/block/v1/block',
  item: 'core/franklin/components/block/v1/block/item',
  text: 'core/franklin/components/text/v1/text',
  image: 'core/franklin/components/image/v1/image',
  columns: 'core/franklin/components/columns/v1/columns',
  column: 'core/franklin/components/columns/v1/columns/column',
};

/* ---------- contenido, tomado del portal ---------- */

// Las cuatro tarjetas que acompañan a "La solución de pagos online adaptada a tu negocio".
// En AEM las cuatro estaban duplicadas ("Portal de Comercios" cuatro veces).
const SOLUCION = [
  ['icon-basket.png', 'cesta de la compra', 'Portal de Comercios',
    'Accede a una visión unificada de todas tus ventas online.'],
  ['icon-clock.png', 'reloj', 'Cobra de forma rápida y ágil',
    'Configuración personalizada de tus métodos de pago para que tus clientes paguen de forma sencilla.'],
  ['icon-history.png', 'flecha circular', 'Suscripciones y pagos recurrentes',
    'Nos adaptamos a tu negocio y a tus servicios.'],
  ['icon-shuffle.png', 'flechas cruzadas', 'Venta Omnicanal',
    'Con nuestra solución unificada podrás adaptarte a los distintos canales de venta desde un único lugar.'],
];

const CARACTERISTICAS = [
  ['icon-wallet.png', 'cartera', 'Check out personalizado',
    'Adapta la experiencia de usuario en base a tus necesidades. Permite a tus clientes seleccionar distintos métodos de pago: tarjeta, bizum, Apple Pay, Google Pay, etc ...'],
  ['icon-plug.png', 'enchufe', 'Integración fácil',
    'Integración sencilla y rápida. Múltiples opciones de integración, adaptadas a tu comercio: Hosted Checkout, plugin, API, etc ...'],
  ['icon-monitor.png', 'monitor', 'Monitor de fraude',
    'Dispón de una herramienta especializada para prevenir el fraude en la que podrás establecer reglas para evitar compras fraudulentas y permitirá minimizar la fricción en el proceso del pago para aquellas compras de clientes habituales.'],
  ['icon-shield.png', 'escudo', 'Seguridad',
    'Autenticación de tu cliente 3D Secure. Se utilizan los protocolos de autenticación de cada medio de pago seleccionado: 3DS en Tarjetas, Autenticación Bizum, etc...'],
  ['icon-gear.png', 'engranaje', 'Consola de comercio',
    'Visualiza y controla toda la operativa de tu comercio a través de la Consola. Además, puedes integrarte a ella vía API.'],
  ['icon-handshake.png', 'apretón de manos', 'Atención al comercio',
    'Te acompañamos en el proceso. Si tienes cualquier consulta, no dudes en ponerte en contacto con nuestro equipo de soporte.'],
];

// Funcionalidades de la pestaña API, que en el portal es la pestaña por defecto.
const FUNCIONALIDADES = [
  ['icon-plug.png', 'Integración flexible',
    'La misma API permite realizar compras en un paso, compras en dos pasos, y compras tipo MOTO (Mail Order/Telephone Order).'],
  ['icon-shield.png', 'Seguridad avanzada',
    'Mensajes JSON + Base64 firmados con SHA 256 y soporte 3-D Secure 2.x.'],
  ['icon-gear.png', 'Control de tu operativa',
    'Gestiona pagos, anulaciones y devoluciones directamente desde tu servidor. Además, contamos con entorno de pruebas y producción independientes para validar cambios sin riesgo.'],
  ['icon-ruler.png', 'Prevención de fraude',
    'Nuestras herramientas avanzadas de análisis y nuestros equipos de expertos en fraude monitorean las transacciones y ofrecen soporte siempre que lo necesites.'],
];

const FOOTER_ENLACES = [
  ['Servicios', [
    ['Oficina de cambio de divisas', 'https://www.cecabank.es/oficina-de-cambio-de-divisas/'],
    ['Banca electrónica', 'https://be.ceca.es/BEWeb/2000/2000/inicia_identificacion.action'],
    ['Portal de proveedores', 'https://www.cecabank.es/portal-de-proveedores/'],
  ]],
  ['Gobierno corporativo', [
    ['Gobierno corporativo y política de remuneraciones', 'https://www.cecabank.es/gobierno-corporativo/'],
    ['Información corporativa', 'https://www.cecabank.es/informacion-corporativa/'],
    ['Canal de conducta corporativa', 'https://www.cecabank.es/canal-de-conducta/'],
    ['Tablón de anuncios', 'https://www.cecabank.es/tablon-de-anuncios/'],
  ]],
  ['T&Cs', [
    ['Aviso legal', 'https://www.cecabank.es/aviso-legal/'],
    ['Derechos de privacidad', 'https://www.cecabank.es/privacidad/'],
    ['Política de cookies', 'https://www.cecabank.es/politica-de-cookies/'],
  ]],
];

// Los sellos del pie usan las variantes en blanco: sobre el navy del pie, las de color
// de marca quedan invisibles.
// Redes sociales del pie, bajo el logotipo, como en el portal.
const REDES = [
  ['Facebook', 'https://www.facebook.com/pages/CECABANK/307199180207838/'],
  ['X', 'https://www.x.com/Cecabank_es'],
  ['LinkedIn', 'https://www.linkedin.com/company/ceca/'],
];

const CERTIFICACIONES = [
  ['cert-visa.png', 'Visa'],
  ['cert-mastercard.png', 'Mastercard'],
  ['cert-amex.png', 'American Express'],
];

/* ---------- serialización a form de Sling ---------- */

function flatten(prefix, node, form) {
  Object.entries(node).forEach(([k, v]) => {
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

const node = (rest) => ({ 'jcr:primaryType': 'nt:unstructured', ...rest });

// Las secciones llevan su modelo para que sigan siendo editables desde Universal Editor.
// `name` es solo la etiqueta del árbol de contenido: la clase CSS la pone cada bloque.
const SECTION = {
  'sling:resourceType': RT.section,
  model: 'section',
  modelFields: ['name@text', 'style@multiselect'],
};

const textNode = (html) => node({ 'sling:resourceType': RT.text, text: html });

const imageNode = (file, alt) => node({
  'sling:resourceType': RT.image,
  modelFields: ['image@reference', 'imageAlt@text'],
  image: `${DAM}/${file}`,
  imageAlt: alt,
});

/** Bloque de tarjetas con el item card-icon, que es el que comparten icon-cards e icon-grid. */
function cardsBlock(cards, { filter, classes }) {
  const items = {};
  cards.forEach(([icon, alt, title, body], i) => {
    items[`item_${i}`] = node({
      'sling:resourceType': RT.item,
      model: 'card-icon',
      modelFields: ['image@reference', 'imageAlt@text', 'text@richtext'],
      image: `${DAM}/${icon}`,
      imageAlt: alt,
      text: `<h4>${title}</h4>\n<p>${body}</p>`,
    });
  });
  return node({
    'sling:resourceType': RT.block,
    name: 'Cards',
    filter,
    classes,
    ...items,
  });
}

/* ---------- /inicio ---------- */

/*
 * En el portal las tarjetas ocupan la mitad izquierda y a la derecha va un retrato.
 *
 * Esto NO se puede montar como bloque dentro de un `columns`: decorateBlocks solo recorre
 * `div.section > div > div`, de modo que un bloque anidado nunca se decora, y el backend lo
 * entrega aplanado (se comprobó: las tarjetas salían como imagen + h4 + p sueltos, sin
 * envoltorio ni clase). El reparto se hace a nivel de sección, y cards.js marca la sección
 * al detectar la imagen hermana.
 */
const solucionCards = () => cardsBlock(SOLUCION, { filter: 'cards-icon-cards', classes: 'icon-cards' });

const solucionImagen = () => imageNode('features-inicio.jpg', 'Características de la solución de pagos');

const caracteristicasSection = () => node({
  ...SECTION,
  name: 'caracteristicas',
  cards: cardsBlock(CARACTERISTICAS, { filter: 'cards-icon-grid', classes: 'icon-grid' }),
});

const videoSection = () => node({
  ...SECTION,
  name: 'video',
  video: node({
    'sling:resourceType': RT.block,
    name: 'Video',
    filter: 'video',
    item_0: node({
      'sling:resourceType': RT.item,
      model: 'video-item',
      modelFields: ['uri@text', 'classes@multiselect', 'placeholder_image@reference', 'placeholder_imageAlt@text'],
      // El vídeo se sirve desde el repositorio: el DAM no es accesible desde la entrega.
      uri: '/assets/video-demo.webm',
      placeholder_image: `${DAM}/video-poster.jpg`,
      placeholder_imageAlt: 'Vídeo de presentación del portal',
    }),
  }),
});

const contactoSection = () => node({
  ...SECTION,
  name: 'contacto',
  'contact-form': node({
    'sling:resourceType': RT.block,
    name: 'Contact Form',
    model: 'contact-form',
    modelFields: [
      'image@reference', 'imageAlt@text', 'heading@text', 'nameLabel@text', 'emailLabel@text',
      'phoneLabel@text', 'companyLabel@text', 'messageLabel@text', 'submitLabel@text', 'action@text',
    ],
    image: `${DAM}/contact-form.jpg`,
    imageAlt: 'Contacto',
    heading: '¿Quieres saber más? No te preocupes, ¡te contactamos!',
    nameLabel: 'Nombre y apellidos',
    emailLabel: 'Correo electrónico',
    phoneLabel: 'Teléfono',
    companyLabel: 'Empresa',
    messageLabel: 'Cuéntanos qué necesitas',
    submitLabel: 'Enviar',
    action: '',
  }),
});

/* ---------- /footer ---------- */

const gruposHtml = FOOTER_ENLACES.map(([titulo, enlaces]) => {
  const items = enlaces.map(([label, href]) => `<li><a href="${href}">${label}</a></li>`).join('\n ');
  return `<h3>${titulo}</h3>\n<ul>\n ${items}\n</ul>`;
}).join('\n');

/*
 * El pie se reescribe entero porque el orden de los nodos manda: footer.js toma como logotipo
 * la primera imagen del contenido, así que tiene que ir antes que los grupos de enlaces.
 */
const footerSection = () => {
  const sellos = {};
  CERTIFICACIONES.forEach(([file, alt], i) => {
    sellos[`image_cert_${i}`] = imageNode(file, alt);
  });
  const redesHtml = `<p>${REDES.map(([n, href]) => `<a href="${href}">${n}</a>`).join(' ')}</p>`;
  return node({
    ...SECTION,
    image: imageNode('logo-cecabank.png', 'Cecabank'),
    text_redes: textNode(redesHtml),
    text: textNode(gruposHtml),
    text_cert: textNode('<h3>Certificaciones de marcas</h3>'),
    ...sellos,
  });
};

/* ---------- /empieza-con-nosotros ---------- */

const funcionalidadesSection = () => {
  const items = {};
  FUNCIONALIDADES.forEach(([icon, title, body], i) => {
    items[`item_${i}`] = node({
      'sling:resourceType': RT.item,
      model: 'feature-list-item',
      modelFields: ['icon@reference', 'iconAlt@text', 'text@richtext'],
      icon: `${DAM}/${icon}`,
      iconAlt: '',
      text: `<h4>${title}</h4>\n<p>${body}</p>`,
    });
  });
  return node({
    ...SECTION,
    name: 'funcionalidades',
    text: textNode('<h2>Funcionalidades</h2>'),
    'feature-list': node({
      'sling:resourceType': RT.block,
      name: 'Feature List',
      filter: 'feature-list',
      ...items,
    }),
  });
};

/* ---------- emisión ---------- */

/*
 * target: [ruta de la página, nodo padre relativo a root, nombre del nodo, contenido, orden]
 * El orden solo se indica cuando el nodo no puede quedarse al final.
 */
const targets = [
  // Las tarjetas y su imagen van como hermanos dentro de la sección que ya trae el titular.
  // El columns anterior se borra: en EDS no hay bloques anidados.
  ['/inicio', 'section_341985424', 'cards_icon_cards', solucionCards(), null, ['columns']],
  ['/inicio', 'section_341985424', 'image_features', solucionImagen(), null, []],
  ['/inicio', '', 'section_caracteristicas', caracteristicasSection(), null, []],
  ['/inicio', '', 'section_video', videoSection(), null, []],
  ['/inicio', '', 'section_contacto', contactoSection(), null, []],
  ['/footer', '', 'section', footerSection(), null, []],
  ['/empieza-con-nosotros', '', 'section_funcionalidades', funcionalidadesSection(), '1', []],
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const index = [];
targets.forEach(([page, parent, name, content, order, alsoDelete]) => {
  const form = new URLSearchParams();
  // Se borra solo este nodo (y lo que sustituye) antes de reescribirlo: reejecutar no duplica.
  form.append(`./${name}@Delete`, 'true');
  alsoDelete.forEach((n) => form.append(`./${n}@Delete`, 'true'));
  flatten(`./${name}/`, content, form);

  const target = `${ROOT}${page}/jcr:content/root${parent ? `/${parent}` : ''}`;
  const slug = `${page.replace(/^\//, '').replace(/\//g, '__')}--${name}`;
  fs.writeFileSync(path.join(OUT, `${slug}.form`), form.toString());
  index.push([slug, target, name, order || ''].join('\t'));
  console.log(`  ${name.padEnd(26)} -> ${page}${parent ? `/${parent}` : ''}${order ? `  (:order=${order})` : ''}`);
});

fs.writeFileSync(path.join(OUT, 'index.tsv'), `${index.join('\n')}\n`);
console.log(`\n${index.length} payloads en ${OUT}`);
