import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function isImageCell(cell) {
  return Boolean(cell?.querySelector('picture'));
}

function isEmptyCell(cell) {
  return Boolean(cell) && !cell.textContent.trim() && !cell.children.length;
}

/** Una celda de enlace es una ruta o URL suelta, o un ancla. */
function isLinkCell(cell) {
  const text = cell?.textContent.trim() || '';
  return Boolean(cell?.querySelector('a')) || /^(?:https?:\/\/|\/)\S*$/.test(text);
}

/*
 * AEM omite la fila de cualquier campo que el autor no haya rellenado, así que las celdas no
 * se pueden leer por posición fija: el blog está autorizado con el modelo `card` base
 * (image + text, sin imageAlt) y leer la segunda celda como alt dejaba el titular y la fecha
 * dentro de un contenedor oculto — el texto no se pintaba.
 *
 * La imagen se reconoce por contenido. Para el resto se combina el orden del modelo con lo
 * que la variante declara: si la variante tiene campo de texto y solo queda una celda, esa
 * celda es el texto, no el alt.
 */
function resolveCells(cells, { hasText = true, hasLink = false } = {}) {
  const imageCell = cells.find(isImageCell) || null;
  const rest = cells.filter((cell) => cell !== imageCell && !isEmptyCell(cell));

  let linkCell = null;
  if (hasLink) {
    const index = rest.findIndex(isLinkCell);
    if (index >= 0) [linkCell] = rest.splice(index, 1);
  }

  let altCell = null;
  let bodyCells = [];
  if (!hasText) {
    [altCell] = rest;
  } else if (rest.length > 1) {
    [altCell, ...bodyCells] = rest;
  } else {
    bodyCells = rest;
  }

  return {
    imageCell, altCell, bodyCells, linkCell,
  };
}

function decorateIconCard(li, cells) {
  const { imageCell, altCell, bodyCells } = resolveCells(cells);
  const altText = altCell?.textContent.trim() || '';

  if (imageCell) {
    imageCell.className = 'cards-card-image';
    li.append(imageCell);
  }
  if (altCell) {
    altCell.className = 'cards-card-alt';
    altCell.setAttribute('aria-hidden', 'true');
    li.append(altCell);
  }
  bodyCells.forEach((cell) => {
    cell.className = 'cards-card-body';
    li.append(cell);
  });

  return altText;
}

function decorateDefaultCard(li, cells) {
  cells.forEach((cell) => {
    cell.className = isImageCell(cell) ? 'cards-card-image' : 'cards-card-body';
    li.append(cell);
  });
}

function optimizeCardImages(li, altText, width) {
  li.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(
      img.src,
      altText || img.alt,
      false,
      [{ width }],
    );
    const optimizedImg = optimizedPic.querySelector('img');
    ['width', 'height'].forEach((attribute) => {
      if (img.hasAttribute(attribute)) {
        optimizedImg.setAttribute(attribute, img.getAttribute(attribute));
      }
    });
    moveInstrumentation(img, optimizedImg);
    img.closest('picture').replaceWith(optimizedPic);
  });
}

/* El contrato de la variante logos declara únicamente image + imageAlt: el portal no muestra
   texto dentro del círculo, así que la celda restante es siempre el alt. */
function decorateLogoCard(li, cells) {
  const { altCell } = resolveCells(cells, { hasText: false });
  const altText = altCell?.textContent.trim() || '';

  if (altCell) {
    altCell.className = 'cards-card-alt';
    altCell.setAttribute('aria-hidden', 'true');
    li.append(altCell);
  }

  return altText;
}

function decorateEditorialCard(li, cells) {
  const { imageCell, altCell, bodyCells } = resolveCells(cells);
  const altText = altCell?.textContent.trim() || '';

  if (imageCell) {
    imageCell.className = 'cards-card-image';
    li.append(imageCell);
  }
  if (altCell) {
    altCell.className = 'cards-card-alt';
    altCell.setAttribute('aria-hidden', 'true');
    li.append(altCell);
  }
  bodyCells.forEach((cell) => {
    cell.className = 'cards-card-body';
    li.append(cell);
  });

  return altText;
}

/*
 * En /inicio las cuatro tarjetas ocupan la mitad izquierda y a la derecha va un retrato.
 * En EDS eso no puede ser un bloque dentro de un `columns`: decorateBlocks solo recorre
 * `div.section > div > div`, así que un bloque anidado nunca llegaría a decorarse y el
 * backend lo entrega aplanado. La composición se resuelve, como en feature-list, marcando
 * la sección cuando el bloque convive con una imagen de contenido por defecto.
 */
function splitSectionWithImage(block) {
  const section = block.closest('.section');
  if (!section) return;

  const aside = [...section.children]
    .find((child) => child !== block.parentElement
      && child.classList.contains('default-content-wrapper')
      && child.querySelector('picture'));

  if (!aside) return;
  aside.classList.add('cards-aside');
  section.classList.add('cards-section-split');
}

export default function decorate(block) {
  const isLogoVariant = block.classList.contains('logos');
  /*
   * icon-grid es la rejilla de tres columnas de /inicio y boxed son las tarjetas blancas que
   * se solapan con el hero en las páginas de integración. Las tres variantes comparten el
   * mismo item (icono + titular + texto), así que comparten también la decoración: solo
   * cambia la disposición, que es cosa del CSS.
   */
  const isIconCardsVariant = block.classList.contains('icon-cards')
    || block.classList.contains('icon-grid')
    || block.classList.contains('boxed');
  const isPluginsVariant = block.classList.contains('plugins');
  const isEditorialVariant = block.classList.contains('editorial');
  if (isIconCardsVariant) splitSectionWithImage(block);
  const ul = document.createElement('ul');

  while (block.firstElementChild) {
    const row = block.firstElementChild;
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    const cells = [...row.children];
    let altText = '';

    if (isLogoVariant) {
      const imageCell = cells.find(isImageCell);
      if (imageCell) {
        imageCell.className = 'cards-card-image';
        li.append(imageCell);
      }
      altText = decorateLogoCard(li, cells);
    } else if (isIconCardsVariant) {
      altText = decorateIconCard(li, cells);
    } else if (isEditorialVariant) {
      altText = decorateEditorialCard(li, cells);
    } else if (isPluginsVariant) {
      const {
        imageCell, altCell, bodyCells, linkCell,
      } = resolveCells(cells, { hasLink: true });
      altText = altCell?.textContent.trim() || '';

      if (imageCell) {
        imageCell.className = 'cards-card-image';
      }
      bodyCells.forEach((cell) => {
        cell.className = 'cards-card-body';
      });
      if (altCell) {
        altCell.className = 'cards-card-alt';
        altCell.setAttribute('aria-hidden', 'true');
      }
      if (linkCell) {
        linkCell.className = 'cards-card-link';
        linkCell.setAttribute('aria-hidden', 'true');
      }

      const href = linkCell?.textContent.trim() || '#';
      const anchor = document.createElement('a');
      anchor.href = href;

      if (imageCell) anchor.append(imageCell);
      bodyCells.forEach((cell) => anchor.append(cell));
      li.append(anchor);
      if (altCell) li.append(altCell);
      if (linkCell) li.append(linkCell);
    } else {
      decorateDefaultCard(li, cells);
    }

    let imageWidth = '750';
    if (isLogoVariant) {
      imageWidth = '288';
    } else if (isEditorialVariant) {
      imageWidth = '810';
    }
    optimizeCardImages(li, altText, imageWidth);
    ul.append(li);
    row.remove();
  }

  block.append(ul);
}
