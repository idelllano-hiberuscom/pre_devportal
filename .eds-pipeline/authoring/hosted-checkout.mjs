/*
 * Contribución de /integraciones/hosted-checkout y de la tabla comparativa de
 * /herramientas-para-desarrolladores, con el contenido tomado del portal.
 *
 * Estructura de la página de integración, en el orden en que la pinta el portal:
 *   section              hero + las cuatro tarjetas blancas que se solapan (hero-with-cards)
 *   section_banner       franja navy en diagonal con el diagrama de secuencia
 *   section_1            carrusel "Paso a paso" (ya existía) con su titular a la izquierda
 *   section_entornos     "Entornos y endpoints": dos columnas con divisor
 *   section_migracion    los pasos de la migración, con tabla y bloques de código
 *
 * Igual que home-blocks.mjs: cada payload toca un único nodo y solo borra ese nodo, así que
 * se puede reejecutar sin duplicar y sin pisar lo que se esté autorizando en paralelo.
 *
 *   node hosted-checkout.mjs <dirSalida>
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || '/tmp/hc-forms';
const DAM = '/content/dam/pre-devportal/demo';
const ROOT = '/content/pre-devportal';
const PAGE = '/integraciones/hosted-checkout';

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

/* ---------- contenido ---------- */

const HERO_TEXTO = [
  'La integración Hosted se basa en la redirección del cliente a un formulario de pago alojado en Cecabank.',
  'El cliente llega al formulario desde la página web del comercio a través de una redirección.',
  'Con este tipo de integración se facilita el cumplimiento de la norma PCI-DSS de la web.',
  'Nosotros nos encargamos de la recogida de los datos de la tarjeta.',
];

const TARJETAS = [
  ['icon-plug.png', 'enchufe', 'Integración fácil',
    'Integración sencilla y rápida. Múltiples opciones de integración, adaptadas a tu comercio.'],
  ['icon-user-check.png', 'usuario verificado', 'Personaliza tu check out',
    'Podrás crear tu página de pago, incluyendo el logo de tu comercio para tus clientes.'],
  ['icon-code.png', 'código', 'Prueba tu integración',
    'Gracias a nuestros entornos de pruebas podrás probar la funcionalidad antes de la puesta en producción.'],
  ['icon-handshake.png', 'apretón de manos', 'Prevención de fraude',
    'Nuestras herramientas avanzadas de análisis y nuestros equipos de expertos en fraude monitorean las transacciones y ofrecen soporte siempre que lo necesites.'],
];

const ENTORNOS = [
  ['Sandbox', [
    ['icon-shield.png', 'Creado para que puedas probar nuestra solución en un entorno seguro e igual que el de Producción.'],
    ['icon-check-double.png', 'Te permitirá comprobar que tu integración se ha realizado correctamente, probando todas las funcionalidades que tenemos disponibles: tipos de autenticación (frictionless, challenge) y resultados (autorizada, denegada).'],
    ['icon-card.png', 'Te ofrecemos un listado de tarjetas y cuentas para realizar pruebas.'],
  ]],
  ['Producción', [
    ['icon-shield.png', 'Procesa pagos reales con la misma latencia que Sandbox.'],
    ['icon-check-double.png', 'Alta disponibilidad y monitorización 24x7.'],
    ['icon-card.png', 'Acceso a un conjunto configurable de tarjetas y cuentas para validar escenarios reales en producción.'],
  ]],
];

const PARAMETROS = [
  ['MerchantID', 'ID del comercio.'],
  ['AcquirerBIN', 'Código BIN de la entidad adquirente.'],
  ['TerminalID', 'ID del terminal asignado.'],
  ['Num_operacion', 'Referencia única de la operación.'],
  ['Importe', 'Importe en céntimos (100 = 1 €).'],
  ['TipoMoneda', 'Código ISO-4217 de moneda (978 = EUR).'],
  ['Exponente', 'Valor constante (2).'],
];

const CURL = (host) => [
  `curl -X POST "https://${host}/tpvweb/tpv/compra.action" \\`,
  '  -H "Content-Type: application/x-www-form-urlencoded" \\',
  '  --data-urlencode "MerchantID=111111111" \\',
  '  --data-urlencode "AcquirerBIN=0000000000" \\',
  '  --data-urlencode "TerminalID=00000003" \\',
  '  --data-urlencode "Num_operacion=PEDIDO123" \\',
  '  --data-urlencode "Importe=500" \\',
  '  --data-urlencode "TipoMoneda=978" \\',
  '  --data-urlencode "Exponente=2" \\',
  '  --data-urlencode "URL_OK=https://www.miweb.com/pago-ok" \\',
  '  --data-urlencode "URL_NOK=https://www.miweb.com/pago-nok" \\',
  '  --data-urlencode "Firma=8247067e77b0f3be3d6b5921ae0b0c72a09b5a69e3fa77e7e7777d3f30af3aa8" \\',
  '  --data-urlencode "Cifrado=SHA2" \\',
  '  --data-urlencode "Pago_soportado=SSL" \\',
  '  --data-urlencode "Idioma=1"',
].join('\n');

const FIRMA = 'Firma = SHA256( Clave_encriptacion + MerchantID + AcquirerBIN + TerminalID\n'
  + '  + Num_operacion + Importe + TipoMoneda + Exponente + Referencia + "SHA2"\n'
  + '  + URL_OK + URL_NOK + Exencion_SCA (si aplica) + fechaTope (si aplica) )';

const PASOS = [
  ['Paso 1', 'Preparar el entorno', [
    'Revisar la clave de cifrado correspondiente al entorno de pruebas o producción.',
    'Asegurarse de que el dominio del comercio soporte HTTPS (recomendado).',
  ]],
  ['Paso 3', 'Probar con tarjetas de prueba.', [
    'Cecabank proporciona numeraciones de tarjetas de test en el entorno de desarrollo para validar la integración.',
    'Revisar posibles errores en la consola y en la documentación.',
  ]],
];

const RECOMENDACIONES = [
  ['Usar Comunicación On-Line', 'Garantiza que el comercio reciba confirmación inmediata de cada operación, evitando depender de la acción del cliente.'],
  ['Mantener una buena gestión de claves', 'Cambiar la clave de acceso a la consola con frecuencia y custodiar cuidadosamente la clave de cifrado que se usa para calcular la firma.'],
  ['Evitar números de operación duplicados', 'Cada Num_operacion debe ser único al menos durante 24 horas.'],
  ['Probar en entorno de desarrollo', 'Antes de activar en producción y usar las tarjetas de prueba facilitadas por Cecabank.'],
  ['Aplicar PSD2 y 3D Secure', 'Si procede, incluir la autenticación reforzada del cliente para cumplir normativa y disminuir el riesgo de fraude.'],
];

// Comparativa de /herramientas-para-desarrolladores.
const COMPARATIVA = {
  cabeceras: ['Método', 'Descripción', 'Ventajas', 'Desventajas', 'Casos de uso ideales'],
  filas: [
    ['Hosted',
      'El cliente es redirigido a una página de pago segura alojada en Cecabank. El comercio debe construir la petición firmada y gestionar la respuesta.',
      ['Cumple con PCI-DSS sin tratar datos de tarjeta', 'No maneja datos sensibles', 'Integra autenticación 3-D Secure', 'Control parcial sobre el flujo de pago', 'Complejidad baja'],
      ['Requiere desarrollo técnico', 'Redirección fuera del entorno visual del comercio', 'Dependencia del navegador para finalizar el pago'],
      ['Comercios con equipo pequeño', 'Tiendas que desean simplicidad y externalizar la seguridad']],
    ['Plugin',
      'Plugins para CMS como WooCommerce, PrestaShop o Magento que integran el TPV con redirección (o una también página de pago alojada en Cecabank).',
      ['No requiere desarrollo propio', 'Instalación rápida', 'Soporte oficial', 'Complejidad baja'],
      ['Limitado a CMS compatibles', 'Menor capacidad de personalización visual', 'Redirección incluida (no fluidez total)'],
      ['Comercios con CMS conocidos y sin desarrolladores internos', 'Negocios que priorizan puesta en marcha rápida']],
    ['SDK',
      'SDK nativos para apps móviles (iOS/Android) que permiten recoger y tokenizar los datos de pago dentro de la app.',
      ['Integración nativa, fluida y adaptada a la app', 'UX fluida y nativa', 'Seguridad mediante tokenización y cifrado', 'Complejidad media'],
      ['Requiere conocimientos de desarrollo móvil', 'Gestión de certificados', 'Posible revisión de mercados por parte de Apple/Google'],
      ['Fintech, apps de movilidad, delivery, suscripciones móviles']],
    ['API',
      'API RESTful completa para gestionar pagos desde backend: toma control total del flujo de pago, parámetros y respuestas.',
      ['Integración flexible', 'Control absoluto del flujo', 'Adaptable a sistemas complejos'],
      ['Requiere alto nivel técnico', 'Cumplimiento estricto de PCI si se capturan datos', 'Mayor responsabilidad de seguridad y validaciones', 'Complejidad alta'],
      ['Grandes comercios', 'Marketplaces, integraciones a medida, SaaS']],
    ['Iframe',
      'Formulario embebido mediante iframe seguro, integrado visualmente en la web del comercio.',
      ['El cliente no abandona el sitio', 'Cumple SAQ A', 'Personalizable visualmente'],
      ['Requiere trabajo frontend', 'Limitaciones de personalización dentro del iframe'],
      ['eCommerce con enfoque en branding y experiencia de usuario']],
    ['Pagos MOTO',
      'Formulario en entorno seguro para introducir manualmente los datos de la tarjeta, en pedidos por teléfono o correo.',
      ['Sin integración técnica', 'Ideal para atención telefónica'],
      ['Riesgo de fraude si no hay 3-D Secure', 'Necesita control de acceso y trazabilidad'],
      ['Clínicas, aseguradoras, contacto telefónico, reservas']],
    ['Pago por Email',
      'Permite generar un link de pago desde el backoffice y enviarlo al cliente por correo o mensajería.',
      ['Sin web propia', 'Sin integración técnica', 'Ideal para cobros puntuales'],
      ['El cliente puede no completar el pago', 'No apto para volúmenes altos'],
      ['Autónomos, despachos, formación, clínicas, servicios']],
  ],
};

/* ---------- serialización ---------- */

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

const SECTION = {
  'sling:resourceType': RT.section,
  model: 'section',
  modelFields: ['name@text', 'style@multiselect'],
};

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

/*
 * La tabla va en un bloque, no en un componente de texto: `text/v1/text` sanea el richtext al
 * guardarlo y se come la tabla (queda aplanada en párrafos). En el richtext de un bloque se
 * conserva entera; se comprobó escribiendo la misma tabla en los dos sitios.
 */
const tableNode = (rotulo, html) => node({
  'sling:resourceType': RT.block,
  name: 'Table',
  model: 'table',
  modelFields: ['caption@text', 'content@richtext'],
  caption: rotulo,
  content: html,
});

/*
 * El código viaja dentro de un <pre> porque el campo es richtext: como texto plano la entrega
 * colapsa los saltos de línea y un curl de quince líneas llegaba en una sola.
 */
const escapar = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const codeNode = (titulo, lenguaje, codigo) => node({
  'sling:resourceType': RT.block,
  name: 'Code Block',
  model: 'code-block',
  modelFields: ['title@text', 'language@select', 'code@richtext'],
  title: titulo,
  language: lenguaje,
  code: `<pre>${escapar(codigo)}</pre>`,
});

const ul = (items) => `<ul>\n${items.map((i) => `  <li>${i}</li>`).join('\n')}\n</ul>`;

/* ---------- secciones ---------- */

const heroSection = () => {
  const items = {};
  TARJETAS.forEach(([icono, alt, titulo, cuerpo], i) => {
    items[`item_${i}`] = node({
      'sling:resourceType': RT.item,
      model: 'card-icon',
      modelFields: ['image@reference', 'imageAlt@text', 'text@richtext'],
      image: `${DAM}/${icono}`,
      imageAlt: alt,
      text: `<h4>${titulo}</h4>\n<p>${cuerpo}</p>`,
    });
  });
  return {
    hero: node({
      'sling:resourceType': RT.block,
      name: 'Hero',
      model: 'hero',
      modelFields: ['image@reference', 'imageAlt@text', 'text@richtext'],
      image: `${DAM}/hero-hosted.jpg`,
      imageAlt: 'Hosted Checkout',
      text: `<h1>Hosted Checkout</h1>\n${HERO_TEXTO.map((p) => `<p>${p}</p>`).join('\n')}`,
    }),
    cards: node({
      'sling:resourceType': RT.block,
      name: 'Cards',
      filter: 'cards-boxed',
      classes: 'boxed',
      ...items,
    }),
  };
};

// El estilo `banner` pinta la franja navy en diagonal; el contenido es contenido por defecto.
const bannerSection = () => node({
  ...SECTION,
  name: 'diagrama',
  style: ['banner'],
  text: textNode('<h2>¿Cómo funciona nuestra integración Hosted Checkout a nivel técnico?</h2>\n'
    + '<p>La integración Hosted sigue los siguientes pasos, explicados en el diagrama.</p>'),
  image: imageNode('hosted-diagrama.png', 'Diagrama de secuencia de la integración Hosted'),
});

const entornosSection = () => {
  const columna = ([titulo, items]) => {
    const hijos = { titulo: titleNode(titulo, 'h3') };
    items.forEach(([icono, texto], i) => {
      hijos[`image_${i}`] = imageNode(icono, '');
      hijos[`text_${i}`] = textNode(`<p>${texto}</p>`);
    });
    return node({ 'sling:resourceType': RT.column, ...hijos });
  };
  return node({
    ...SECTION,
    name: 'entornos',
    title: titleNode('Entornos y endpoints'),
    text: textNode('<p>Disponemos de dos entornos independientes.</p>'),
    columns: node({
      'sling:resourceType': RT.columns,
      filter: 'columns-divided',
      classes: 'divided',
      columns: '2',
      rows: '1',
      row1: node({ col1: columna(ENTORNOS[0]), col2: columna(ENTORNOS[1]) }),
    }),
  });
};

const migracionSection = () => {
  const tabla = `<table>\n<thead><tr><th>Nombre</th><th>Obligatorio</th><th>Descripción</th></tr></thead>\n<tbody>\n`
    + PARAMETROS.map(([n, d]) => `  <tr><td>${n}</td><td>✔</td><td>${d}</td></tr>`).join('\n')
    + '\n</tbody>\n</table>';

  return node({
    ...SECTION,
    name: 'migracion',
    title: titleNode('Paso a paso de la Migración'),
    text_intro: textNode('<p>A continuación, se explican los pasos para la integración Hosted.</p>'),

    text_paso1: textNode(`<h3>${PASOS[0][0]}</h3>\n<p>${PASOS[0][1]}</p>\n${ul(PASOS[0][2])}`),

    text_paso2: textNode('<h3>Paso 2</h3>\n<p>Configurar el formulario</p>\n'
      + '<p>Incluir todos los campos obligatorios:</p>'),

    table_parametros: tableNode('Campos obligatorios del formulario', tabla),

    text_firma: textNode(`${ul([
        'Calcular la firma: la firma es obligatoria para garantizar la integridad de la operación y la autenticidad de los datos.',
        'Se concatenan campos clave (la clave de encriptación asignada al comercio, MerchantID, AcquirerBIN, TerminalID, Num_operacion, Importe, TipoMoneda, Exponente, etc.) en un orden específico.',
        'Se aplica el algoritmo SHA-256 a la cadena resultante.',
        'El resultado se codifica en hexadecimal.',
      ])}`),

    'code-block_firma': codeNode('Ejemplo genérico (con cifrado=SHA2)', 'text', FIRMA),

    text_llamada: textNode('<p>Hacer la llamada POST al endpoint del TPV:</p>'),
    'code-block_pruebas': codeNode('Llamada POST al endpoint del TPV · Pruebas', 'shell', CURL('pgw.ceca.es')),

    text_paso3: textNode(`<h3>${PASOS[1][0]}</h3>\n<p>${PASOS[1][1]}</p>\n${ul(PASOS[1][2])}`),

    text_paso4: textNode('<h3>Paso 4</h3>\n<p>Cambio a producción</p>\n'
      + `${ul(['Requiere cambiar la URL ACTION de pruebas y la clave de cifrado al valor a producción.'])}`),
    'code-block_produccion': codeNode('Llamada POST al endpoint del TPV · Producción', 'shell', CURL('tpv.ceca.es')),

    text_recomendaciones: textNode('<h3>Recomendaciones</h3>\n'
      + ul(RECOMENDACIONES.map(([t, d]) => `<strong>${t}:</strong> ${d}`))),
  });
};

// El carrusel ya estaba autorizado; solo le falta el titular, que va delante para que
// carousel.js reparta la sección en dos columnas.
const carruselIntro = () => textNode('<h2>Paso a paso</h2>\n'
  + '<p>La integración Hosted sigue los siguientes pasos, explicados en el diagrama superior.</p>');

/* ---------- /herramientas-para-desarrolladores ---------- */

const comparativaSection = () => {
  const celda = (v) => (Array.isArray(v) ? ul(v) : v);
  const filas = COMPARATIVA.filas
    .map((f) => `  <tr>${f.map((c) => `<td>${celda(c)}</td>`).join('')}</tr>`)
    .join('\n');
  const tabla = `<table>\n<thead><tr>${COMPARATIVA.cabeceras.map((c) => `<th>${c}</th>`).join('')}</tr></thead>\n`
    + `<tbody>\n${filas}\n</tbody>\n</table>`;
  return node({
    ...SECTION,
    name: 'comparativa',
    table: tableNode('Comparativa de métodos de integración', tabla),
  });
};

/* ---------- emisión ---------- */

const hero = heroSection();

const targets = [
  [PAGE, 'section', 'hero', hero.hero, null, []],
  [PAGE, 'section', 'cards', hero.cards, null, []],
  [PAGE, '', 'section_banner', bannerSection(), '1', []],
  [PAGE, 'section_1', 'text', carruselIntro(), '0', []],
  [PAGE, '', 'section_entornos', entornosSection(), null, []],
  [PAGE, '', 'section_migracion', migracionSection(), null, []],
  ['/herramientas-para-desarrolladores', '', 'section_comparativa', comparativaSection(), null, []],
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const index = [];
targets.forEach(([page, parent, name, content, order, alsoDelete]) => {
  const form = new URLSearchParams();
  form.append(`./${name}@Delete`, 'true');
  alsoDelete.forEach((n) => form.append(`./${n}@Delete`, 'true'));
  flatten(`./${name}/`, content, form);

  const target = `${ROOT}${page}/jcr:content/root${parent ? `/${parent}` : ''}`;
  const slug = `${page.replace(/^\//, '').replace(/\//g, '__')}--${name}`;
  fs.writeFileSync(path.join(OUT, `${slug}.form`), form.toString());
  index.push([slug, target, name, order || ''].join('\t'));
  console.log(`  ${name.padEnd(20)} -> ${page}${parent ? `/${parent}` : ''}${order ? `  (:order=${order})` : ''}`);
});

fs.writeFileSync(path.join(OUT, 'index.tsv'), `${index.join('\n')}\n`);
console.log(`\n${index.length} payloads en ${OUT}`);
