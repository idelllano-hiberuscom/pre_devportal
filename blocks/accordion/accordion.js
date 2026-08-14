import { moveInstrumentation } from '../../scripts/scripts.js';

let accordionGroupId = 0;

/**
 * Builds the lucide `plus` glyph the portal uses as the open/close affordance.
 * The vertical bar is hidden by CSS when the item is open, turning it into a minus.
 * @returns {SVGElement}
 */
function createToggleIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'accordion-item-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  const horizontal = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  horizontal.setAttribute('d', 'M5 12h14');

  const vertical = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  vertical.setAttribute('class', 'accordion-item-icon-bar');
  vertical.setAttribute('d', 'M12 5v14');

  svg.append(horizontal, vertical);
  return svg;
}

function buildSummary(cell) {
  const summary = document.createElement('summary');
  summary.className = 'accordion-item-summary';
  moveInstrumentation(cell, summary);

  const text = document.createElement('span');
  text.className = 'accordion-item-title';
  while (cell.firstChild) {
    text.append(cell.firstChild);
  }

  summary.append(text, createToggleIcon());

  return summary;
}

function buildBody(cells) {
  const body = document.createElement('div');
  body.className = 'accordion-item-body';

  cells.forEach((cell) => {
    moveInstrumentation(cell, body);
    while (cell.firstChild) {
      body.append(cell.firstChild);
    }
    cell.remove();
  });

  return body;
}

export default function decorate(block) {
  accordionGroupId += 1;
  const groupName = `accordion-${accordionGroupId}`;
  const section = block.closest('.section');
  section?.classList.add('accordion-section');

  // The portal centres the section heading above the list. It may be authored either in the
  // preceding section or as default content in this one, so mark whichever we find.
  const wrapperSibling = block.parentElement?.previousElementSibling;
  if (wrapperSibling?.classList.contains('default-content-wrapper')) {
    wrapperSibling.classList.add('accordion-intro');
  } else {
    section?.previousElementSibling?.classList.add('accordion-intro');
  }

  [...block.children].forEach((row) => {
    /*
     * AEM no emite fila para un campo vacío, así que con `summary` sin rellenar llega una
     * sola celda y leerla por posición promovía el cuerpo a titular, dejando el item sin
     * contenido. El titular es texto plano; el cuerpo es richtext y llega con estructura
     * (titulares, listas o varios párrafos), que es lo que los distingue.
     */
    const cells = [...row.children];
    const esCuerpo = (cell) => Boolean(cell?.querySelector('h1,h2,h3,h4,h5,h6,ul,ol,table'))
      || (cell?.children.length || 0) > 1;

    let summaryCell;
    let contentCells;
    if (cells.length > 1) {
      [summaryCell, ...contentCells] = cells;
    } else {
      summaryCell = esCuerpo(cells[0]) ? undefined : cells[0];
      contentCells = summaryCell ? [] : cells.filter(Boolean);
    }

    if (!summaryCell || !summaryCell.textContent.trim()) {
      return;
    }

    const details = document.createElement('details');
    details.className = 'accordion-item-details';
    details.setAttribute('name', groupName);
    moveInstrumentation(row, details);

    if (row.hasAttribute('open')) {
      details.setAttribute('open', '');
      row.removeAttribute('open');
    }

    details.append(buildSummary(summaryCell));

    if (contentCells.length > 0) {
      details.append(buildBody(contentCells));
    }

    row.classList.add('accordion-item');
    row.insertBefore(details, summaryCell);
    summaryCell.remove();
  });
}
