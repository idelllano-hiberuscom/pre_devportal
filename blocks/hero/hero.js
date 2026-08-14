import { moveInstrumentation } from '../../scripts/scripts.js';

/*
 * El bloque hero no tenía JS: el fichero estaba vacío, así que nunca se decoraba y la celda
 * de texto alternativo se renderizaba como contenido visible.
 *
 * Medido en import-work/evidence/hero-cards/ (/integraciones/api):
 *   fotografía a sangre con linear-gradient(rgba(0,0,0,.3), rgba(0,0,0,.3)) encima
 *   texto centrado en blanco · h1 64px/600/80px · margin inferior 80px
 */

/*
 * Las páginas de integración ponen bajo el hero una rejilla de tarjetas blancas que se solapa
 * con la fotografía. En el portal es un único componente, `hero-with-cards`; aquí se compone
 * en la sección, porque en EDS un bloque no puede contener otro (decorateBlocks solo recorre
 * `div.section > div > div`).
 *
 * El hero solo marca la sección: el solapamiento y el ancho de la rejilla los pone el CSS.
 */
function markSectionWithCards(block) {
  const section = block.closest('.section');
  if (!section) return;

  const cards = [...section.children]
    .find((child) => child !== block.parentElement && child.querySelector(':scope > .cards'));

  if (cards) section.classList.add('hero-with-cards');
}

/**
 * loads and decorates the hero block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  /*
   * AEM omite la fila de cualquier campo que el autor no haya rellenado, así que leer por
   * posición ciega desplaza los campos: un hero sin texto alternativo llega con dos filas y
   * el titular acabaría tratado como alt.
   *
   * La imagen sí se reconoce por contenido. Para las dos filas de texto no sirve mirar el
   * contenido, porque EDS envuelve el texto plano en <p> y entonces el alt es indistinguible
   * de un párrafo; se usa el orden del modelo (image, imageAlt, text), que es el que AEM
   * respeta al emitir las filas.
   */
  const cellOf = (row) => row?.firstElementChild || row;
  const imageRow = rows.find((row) => cellOf(row)?.querySelector('picture, img'));
  const rest = rows.filter((row) => row !== imageRow);

  let altRow;
  let textRows;
  if (rest.length > 1) {
    [altRow] = rest;
    textRows = rest.slice(1);
  } else {
    // Una sola fila: es el texto salvo que no traiga titular ni varios bloques.
    const only = rest[0];
    const cell = cellOf(only);
    const isText = !only || cell?.querySelector('h1, h2, h3, h4, h5, h6')
      || (cell?.children.length || 0) > 1;
    altRow = isText ? undefined : only;
    textRows = isText && only ? [only] : [];
  }

  const imageCell = cellOf(imageRow);
  const altCell = cellOf(altRow);

  const media = document.createElement('div');
  media.className = 'hero-background';
  media.setAttribute('aria-hidden', 'true');

  const picture = imageCell?.querySelector('picture');
  const img = imageCell?.querySelector('img');
  if (picture || img) {
    const element = picture || img;
    moveInstrumentation(imageCell, element);
    // Fondo decorativo: el nombre accesible lo aporta el titular, no la imagen.
    const image = element.querySelector('img') || element;
    image.alt = '';
    image.loading = 'eager';
    media.append(element);
  }

  const content = document.createElement('div');
  content.className = 'hero-content';
  textRows.forEach((row) => {
    const cell = row.firstElementChild || row;
    while (cell.firstChild) content.append(cell.firstChild);
    moveInstrumentation(cell, content);
  });

  // El campo de alt se conserva en el DOM para que siga siendo editable, pero no se muestra.
  if (altCell) {
    altCell.className = 'hero-alt';
    altCell.setAttribute('aria-hidden', 'true');
  }

  rows.forEach((row) => row.remove());
  block.append(media, content);
  if (altCell) block.append(altCell);

  markSectionWithCards(block);
}
