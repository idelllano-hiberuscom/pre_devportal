/*
 * Árbol de páginas por idioma.
 *
 * El español vive en la raíz sin prefijo y los demás idiomas cuelgan de `/<código>/`, que
 * es la estructura de URLs del portal de origen. Los slugs NO se traducen (`/en/inicio`,
 * no `/en/home`), también como el original: así una misma ruta identifica la misma página
 * en los tres idiomas y el conmutador de la cabecera solo tiene que cambiar el prefijo.
 *
 * A diferencia del portal —que hace i18n en cliente, declara `lang="es"` al recargar una
 * página inglesa y no permite entrar en frío— aquí cada idioma son páginas reales: se
 * sirven del servidor, se indexan y se editan en Universal Editor como cualquier otra.
 *
 * Qué NO se traduce, y por qué:
 *   · Nombres propios y de producto: Cecabank, Bizum, Apple Pay, Google Pay, Hosted
 *     Checkout, TPV, PSD2, 3D Secure.
 *   · Los bloques `code-block` y `table` de la documentación técnica: llevan nombres de
 *     parámetro (`Num_operacion`, `AcquirerBIN`), endpoints y ejemplos ejecutables. Una
 *     traducción ingenua convierte `Importe` en `Amount` dentro de un curl y el ejemplo
 *     deja de funcionar.
 *   · Las páginas legales (aviso legal, privacidad, cookies): ya existen en cecabank.es en
 *     cada idioma. Se enlazan, no se traducen — generar texto legal nuevo sin validar en
 *     el portal de un banco no es una decisión que tome un script.
 *
 *   node idiomas.mjs <idioma> <dirSalida>      p. ej.: node idiomas.mjs en /tmp/en-forms
 */
import fs from 'node:fs';
import path from 'node:path';

const IDIOMA = process.argv[2];
const OUT = process.argv[3] || `/tmp/${IDIOMA}-forms`;
const DAM = '/content/dam/pre-devportal/demo';
const ROOT = '/content/pre-devportal';

const RT = {
  section: 'core/franklin/components/section/v1/section',
  block: 'core/franklin/components/block/v1/block',
  item: 'core/franklin/components/block/v1/block/item',
  text: 'core/franklin/components/text/v1/text',
  title: 'core/franklin/components/title/v1/title',
  image: 'core/franklin/components/image/v1/image',
};

/* ---------- traducciones ---------- */

const EN = {
  titulos: {
    '/': 'Home',
    '/inicio': 'Home',
    '/nav': 'Nav',
    '/footer': 'Footer',
  },

  hero: {
    h1: 'Welcome to the e-commerce Developer Portal!',
    p: [
      'Start accepting online payments in just a few clicks.',
      'We offer different integration options tailored to your business.',
    ],
  },

  solucionTitulo: 'The online payment solution tailored to your business',
  solucion: [
    ['Merchant Portal', 'Get a unified view of all your online sales.'],
    ['Get paid quickly and easily', 'Set up your payment methods so your customers can pay with no friction.'],
    ['Subscriptions and recurring payments', 'We adapt to your business and your services.'],
    ['Omnichannel selling', 'Our unified solution lets you serve every sales channel from a single place.'],
  ],

  integracionTitulo: 'Choose the integration that best fits your online store',
  integraciones: [
    ['Hosted', 'A secure payment experience provided by Cecabank. The simplest integration there is.'],
    ['Iframe', 'More control over your page design. Fully embedded, with no navigation jumps for your customers.'],
    ['JavaScript', 'Components that are easy to embed in your own payment page.'],
    ['API', 'Keep full control of your page design. Card details are captured on your own site, with no pop-up windows for your customers.'],
  ],

  caracteristicas: [
    ['Customised checkout', 'Tailor the experience to your needs. Let your customers choose between card, Bizum, Apple Pay, Google Pay and more.'],
    ['Easy integration', 'Quick and straightforward. Multiple integration options to suit your store: Hosted Checkout, plugin, API and more.'],
    ['Fraud monitoring', 'A dedicated fraud-prevention tool where you can set rules to block fraudulent purchases while keeping checkout smooth for your regular customers.'],
    ['Security', '3D Secure customer authentication, using the authentication protocol of each payment method: 3DS for cards, Bizum authentication and so on.'],
    ['Merchant console', 'View and manage everything your store does through the Console — and integrate with it over the API.'],
    ['Merchant support', 'We are with you throughout. If you have any questions, get in touch with our support team.'],
  ],

  contacto: {
    heading: 'Want to know more? Leave it with us — we will get in touch.',
    nameLabel: 'Full name',
    emailLabel: 'Email address',
    phoneLabel: 'Phone',
    companyLabel: 'Company',
    messageLabel: 'Tell us what you need',
    submitLabel: 'Send',
  },

  nav: {
    inicio: 'Home',
    pagosOnline: 'Online payments',
    empieza: 'Get started with us',
    integraciones: 'Integrations',
    sinIntegracion: 'No integration',
    otros: 'Other',
    plugin: 'Plugin',
    pagosMoto: 'MOTO payments',
    pagoEmail: 'Pay by email',
    payByLink: 'Pay by link',
    googlePay: 'Google Pay',
    applePay: 'Apple Pay',
    bizum: 'Bizum',
    fraude: 'Fraud',
    herramientas: 'Developer tools',
    novedades: 'News',
    ayuda: 'Help',
  },

  /*
   * Las URL son las mismas del footer español, comprobadas contra `/footer.plain.html`: son
   * destinos corporativos de cecabank.es que no dependen del idioma del portal. Traducir la
   * etiqueta y dejar el enlace intacto es justo lo que hay que hacer aquí; inventar una
   * variante `/en/` de una página legal que quizá no existe sería peor que no traducirla.
   */
  footer: {
    grupos: [
      ['Services', [
        ['Currency exchange office', 'https://www.cecabank.es/oficina-de-cambio-de-divisas/'],
        ['Online banking', 'https://be.ceca.es/BEWeb/2000/2000/inicia_identificacion.action'],
        ['Supplier portal', 'https://www.cecabank.es/portal-de-proveedores/'],
      ]],
      ['Corporate governance', [
        ['Corporate governance and remuneration policy', 'https://www.cecabank.es/gobierno-corporativo/'],
        ['Corporate information', 'https://www.cecabank.es/informacion-corporativa/'],
        ['Corporate conduct channel', 'https://www.cecabank.es/canal-de-conducta/'],
        ['Notice board', 'https://www.cecabank.es/tablon-de-anuncios/'],
      ]],
      // Legal: se enlaza al original, no se traduce el texto legal.
      ['T&Cs', [
        ['Legal notice', 'https://www.cecabank.es/aviso-legal/'],
        ['Privacy rights', 'https://www.cecabank.es/privacidad/'],
        ['Cookie policy', 'https://www.cecabank.es/politica-de-cookies/'],
      ]],
    ],
    certificaciones: 'Brand certifications',
  },
};

const TRADUCCIONES = { en: EN };

const t = TRADUCCIONES[IDIOMA];
if (!IDIOMA || !t) {
  console.error(`uso: node idiomas.mjs <idioma> <dirSalida>\nidiomas disponibles: ${Object.keys(TRADUCCIONES).join(', ')}`);
  process.exit(2);
}

/* ---------- serialización ---------- */

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

const node = (rest) => ({ 'jcr:primaryType': 'nt:unstructured', ...rest });

const SECTION = {
  'sling:resourceType': RT.section,
  model: 'section',
  modelFields: ['name@text', 'style@multiselect'],
};

const textNode = (html) => node({ 'sling:resourceType': RT.text, text: html });

const titleNode = (titulo, tipo = 'h2') => node({
  'sling:resourceType': RT.title, model: 'title', titleType: tipo, title: titulo,
});

const imageNode = (file, alt) => node({
  'sling:resourceType': RT.image,
  modelFields: ['image@reference', 'imageAlt@text'],
  image: `${DAM}/${file}`,
  imageAlt: alt,
});

function cardsBlock(cards, iconos, { filter, classes }) {
  const items = {};
  cards.forEach(([titulo, cuerpo], i) => {
    items[`item_${i}`] = node({
      'sling:resourceType': RT.item,
      model: 'card-icon',
      modelFields: ['image@reference', 'imageAlt@text', 'text@richtext'],
      image: `${DAM}/${iconos[i % iconos.length]}`,
      imageAlt: '',
      text: `<h4>${titulo}</h4>\n<p>${cuerpo}</p>`,
    });
  });
  return node({
    'sling:resourceType': RT.block, name: 'Cards', filter, classes, ...items,
  });
}

/* ---------- /inicio ---------- */

const ICONOS_SOLUCION = ['icon-basket.png', 'icon-clock.png', 'icon-history.png', 'icon-shuffle.png'];
const ICONOS_CARACT = ['icon-wallet.png', 'icon-plug.png', 'icon-monitor.png', 'icon-shield.png', 'icon-gear.png', 'icon-handshake.png'];
const ICONOS_INTEGR = ['icon-plug.png', 'icon-file.png', 'icon-gear.png', 'icon-shuffle.png'];

const secciones = {
  section: node({
    ...SECTION,
    name: 'hero',
    hero: node({
      'sling:resourceType': RT.block,
      name: 'Hero',
      model: 'hero',
      modelFields: ['image@reference', 'imageAlt@text', 'text@richtext'],
      image: `${DAM}/hero-inicio.jpg`,
      imageAlt: t.hero.h1,
      text: `<h1>${t.hero.h1}</h1>\n${t.hero.p.map((p) => `<p>${p}</p>`).join('\n')}`,
    }),
  }),

  section_solucion: node({
    ...SECTION,
    name: 'solucion',
    title: titleNode(t.solucionTitulo),
    cards: cardsBlock(t.solucion, ICONOS_SOLUCION, { filter: 'cards-icon-cards', classes: 'icon-cards' }),
    image_features: imageNode('features-inicio.jpg', t.solucionTitulo),
  }),

  section_features: node({
    ...SECTION,
    name: 'features',
    text: textNode(`<h2>${t.integracionTitulo}</h2>`),
    'feature-list': node({
      'sling:resourceType': RT.block,
      name: 'Feature List',
      filter: 'feature-list',
      ...Object.fromEntries(t.integraciones.map(([titulo, cuerpo], i) => [`item_${i}`, node({
        'sling:resourceType': RT.item,
        model: 'feature-list-item',
        modelFields: ['icon@reference', 'iconAlt@text', 'text@richtext'],
        icon: `${DAM}/${ICONOS_INTEGR[i]}`,
        iconAlt: '',
        text: `<h4>${titulo}</h4>\n<p>${cuerpo}</p>`,
      })])),
    }),
  }),

  section_caracteristicas: node({
    ...SECTION,
    name: 'caracteristicas',
    cards: cardsBlock(t.caracteristicas, ICONOS_CARACT, { filter: 'cards-icon-grid', classes: 'icon-grid' }),
  }),

  section_video: node({
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
        uri: '/assets/video-demo.webm',
        placeholder_image: `${DAM}/video-poster.jpg`,
        placeholder_imageAlt: 'Developer portal introduction video',
      }),
    }),
  }),

  section_contacto: node({
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
      imageAlt: 'Contact',
      ...t.contacto,
      action: '',
    }),
  }),
};

/* ---------- /nav y /footer del idioma ---------- */

const P = `/${IDIOMA}`;   // los enlaces internos van prefijados; los externos, no
const n = t.nav;

const navHtml = `<ul>
 <li><a href="${P}/inicio">${n.inicio}</a></li>
 <li>${n.pagosOnline}
  <ul>
   <li><a href="${P}/empieza-con-nosotros">${n.empieza}</a></li>
   <li>${n.integraciones}
    <ul>
     <li><a href="${P}/integraciones/hosted-checkout">Hosted</a></li>
     <li><a href="${P}/herramientas-para-desarrolladores/sin-integracion/plugins/resumen">${n.plugin}</a></li>
     <li><a href="${P}/integraciones/sdk">SDK</a></li>
     <li><a href="${P}/integraciones/iframe">Iframe</a></li>
     <li><a href="${P}/integraciones/api">API</a></li>
    </ul></li>
   <li>${n.sinIntegracion}
    <ul>
     <li><a href="${P}/sin-integracion/pagos-moto">${n.pagosMoto}</a></li>
     <li><a href="${P}/sin-integracion/pago-por-email">${n.pagoEmail}</a></li>
     <li><a href="${P}/herramientas-para-desarrolladores/sin-integracion/pay-by-link">${n.payByLink}</a></li>
    </ul></li>
   <li>${n.otros}
    <ul>
     <li><a href="${P}/otros/google-pay">${n.googlePay}</a></li>
     <li><a href="${P}/otros/apple-pay">${n.applePay}</a></li>
     <li><a href="${P}/otros/bizum">${n.bizum}</a></li>
    </ul></li>
  </ul></li>
 <li><a href="${P}/fraude">${n.fraude}</a></li>
 <li><a href="${P}/herramientas-para-desarrolladores">${n.herramientas}</a></li>
 <li><a href="${P}/blog">${n.novedades}</a></li>
 <li><a href="${P}/ayuda">${n.ayuda}</a></li>
</ul>`;

const REDES = [
  ['Facebook', 'https://www.facebook.com/pages/CECABANK/307199180207838/'],
  ['X', 'https://www.x.com/Cecabank_es'],
  ['LinkedIn', 'https://www.linkedin.com/company/ceca/'],
];
const CERTIFICACIONES = [['cert-visa.png', 'Visa'], ['cert-mastercard.png', 'Mastercard'], ['cert-amex.png', 'American Express']];

const gruposHtml = t.footer.grupos.map(([titulo, enlaces]) => {
  const items = enlaces.map(([label, href]) => `<li><a href="${href}">${label}</a></li>`).join('\n ');
  return `<h3>${titulo}</h3>\n<ul>\n ${items}\n</ul>`;
}).join('\n');

const footerSection = node({
  ...SECTION,
  image: imageNode('logo-cecabank.png', 'Cecabank'),
  text_redes: textNode(`<p>${REDES.map(([l, h]) => `<a href="${h}">${l}</a>`).join(' ')}</p>`),
  text: textNode(gruposHtml),
  text_cert: textNode(`<h3>${t.footer.certificaciones}</h3>`),
  ...Object.fromEntries(CERTIFICACIONES.map(([f, alt], i) => [`image_cert_${i}`, imageNode(f, alt)])),
});

/*
 * El nav son tres secciones y ese número importa: header.js reparte las clases
 * `nav-brand`, `nav-sections` y `nav-tools` por posición sobre los hijos del fragmento. Con
 * una sección menos, el menú se estilaría como marca y el selector de idioma no aparecería.
 *
 * La tercera lleva solo el código de idioma, igual que el `ES` del nav español:
 * `decorarSelectorDeIdioma` lo reconoce como marcador, lo quita y pone la lista real.
 */
const navSecciones = {
  section: node({
    ...SECTION,
    text: textNode(`<p><strong><a href="${P}/inicio">Cecabank</a></strong></p>`),
  }),
  section_menu: node({ ...SECTION, text: textNode(navHtml) }),
  section_tools: node({ ...SECTION, text: textNode(`<p>${IDIOMA.toUpperCase()}</p>`) }),
};

/* ---------- emisión ---------- */

const targets = [
  ...Object.entries(secciones).map(([nombre, contenido]) => [`${P}/inicio`, nombre, contenido]),
  ...Object.entries(navSecciones).map(([nombre, contenido]) => [`${P}/nav`, nombre, contenido]),
  [`${P}/footer`, 'section', footerSection],
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const index = [];
const paginas = new Set();
targets.forEach(([pagina, nombre, contenido]) => {
  const form = new URLSearchParams();
  form.append(`./${nombre}@Delete`, 'true');
  flatten(`./${nombre}/`, contenido, form);
  const slug = `${pagina.replace(/^\//, '').replace(/\//g, '__')}--${nombre}`;
  fs.writeFileSync(path.join(OUT, `${slug}.form`), form.toString());
  index.push([slug, `${ROOT}${pagina}/jcr:content/root`, nombre, ''].join('\t'));
  paginas.add(pagina);
});

fs.writeFileSync(path.join(OUT, 'index.tsv'), `${index.join('\n')}\n`);
fs.writeFileSync(path.join(OUT, 'paginas.txt'), `${[...paginas].join('\n')}\n`);
console.log(`  idioma ${IDIOMA} · ${paginas.size} página(s) · ${index.length} sección(es)`);
[...paginas].forEach((p) => console.log(`    ${p}`));
console.log(`\npayloads en ${OUT}`);
