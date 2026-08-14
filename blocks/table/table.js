import { moveInstrumentation } from '../../scripts/scripts.js';

/*
 * Tabla de contenido.
 *
 * Existe como bloque porque el componente de texto no sirve: `core/franklin/components/
 * text/v1/text` sanea el richtext al guardarlo y se come la tabla — se comprobó escribiendo
 * la misma tabla en los dos sitios, y en el nodo de texto quedaba aplanada en párrafos
 * («<p>Método Descripción…</p>») mientras que en el richtext de un bloque se conserva entera.
 *
 * El bloque solo saca la tabla de la celda y la mete en un contenedor con scroll propio: una
 * comparativa de cinco columnas no cabe en un móvil, y así se desplaza ella sin desbordar la
 * página. El contenedor es enfocable y se anuncia como región para que quien navegue con
 * teclado pueda desplazarlo.
 */

const cellOf = (row) => row?.firstElementChild || row;

/**
 * loads and decorates the table block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const cells = rows.map(cellOf);

  const tableCell = cells.find((cell) => cell?.querySelector('table'));
  const table = tableCell?.querySelector('table');
  if (!table) return;

  // AEM no emite fila para un campo vacío, así que el rótulo se busca por contenido.
  const captionCell = cells.find((cell) => cell !== tableCell && cell?.textContent.trim());
  const caption = captionCell?.textContent.trim() || '';

  if (caption) {
    const element = document.createElement('caption');
    element.textContent = caption;
    moveInstrumentation(captionCell, element);
    table.prepend(element);
  }

  const scroll = document.createElement('div');
  scroll.className = 'table-scroll';
  scroll.tabIndex = 0;
  scroll.setAttribute('role', 'region');
  scroll.setAttribute('aria-label', caption || 'Tabla');

  moveInstrumentation(tableCell, table);
  scroll.append(table);

  rows.forEach((row) => row.remove());
  block.append(scroll);
}
