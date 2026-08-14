/*
 * Navegación lateral de sección. En el portal es `speedcode-sidenav` en
 * /herramientas-para-desarrolladores: un panel de 250px con buscador arriba y un árbol de
 * enlaces agrupados debajo, con grupos desplegables.
 *
 * Medido en el portal:
 *   panel        250px de ancho, borde derecho, alto completo
 *   cabecera     padding 32px 24px, input de 14px/21px
 *   enlace       14px/24px, padding 8px 24px, alto 40px
 *   actual       rgb(1,127,155) peso 500 ls 0.1px
 *   grupo        rgb(32,31,31) peso 500 ls 0.25px, sangrado 24px, con filete inferior
 *   enlace normal rgb(32,31,31) peso 400 ls 0.25px
 *
 * Entrada esperada: una lista anidada. Un <li> con <ul> dentro es un grupo; en el primer
 * nivel se pinta como encabezado y en niveles inferiores como desplegable.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgIcon(paths, className) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  paths.forEach((d) => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  });
  return svg;
}

const searchIcon = () => svgIcon(['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z', 'm16 16 4.5 4.5'], 'sidenav-search-icon');
const chevronIcon = () => svgIcon(['m9 6 6 6-6 6'], 'sidenav-chevron');

/** Normaliza una ruta para comparar el enlace actual. */
const normalize = (path) => (path || '').replace(/\.html$/, '').replace(/\/$/, '') || '/';

/** Marca el enlace de la página actual y despliega los grupos que lo contienen. */
function markCurrent(tree) {
  const here = normalize(window.location.pathname);
  tree.querySelectorAll('a[href]').forEach((a) => {
    if (normalize(new URL(a.href, window.location).pathname) !== here) return;
    a.classList.add('is-current');
    a.setAttribute('aria-current', 'page');
    let group = a.closest('.sidenav-group');
    while (group) {
      const toggle = group.querySelector(':scope > .sidenav-toggle');
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'true');
        group.classList.add('is-open');
      }
      group = group.parentElement?.closest('.sidenav-group');
    }
  });
}

/** Convierte los <li> con lista anidada en grupos: encabezado en nivel 1, desplegable debajo. */
function decorateLevel(list, level) {
  list.classList.add('sidenav-list', `sidenav-list-${level}`);

  [...list.children].forEach((item) => {
    const nested = item.querySelector(':scope > ul, :scope > ol');
    item.classList.add('sidenav-item');

    if (!nested) {
      item.querySelector('a')?.classList.add('sidenav-link');
      return;
    }

    item.classList.add('sidenav-group');
    // El texto propio del <li>, sin contar la lista anidada, es la etiqueta del grupo.
    const label = document.createElement('span');
    label.className = 'sidenav-group-label';
    [...item.childNodes]
      .filter((node) => node !== nested)
      .forEach((node) => label.append(node));

    if (level === 1) {
      // Nivel 1: encabezado de grupo, siempre visible.
      label.classList.add('sidenav-group-title');
      label.querySelector('a')?.classList.add('sidenav-link');
      item.prepend(label);
    } else {
      // Niveles inferiores: desplegable con chevron.
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'sidenav-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.append(label, chevronIcon());
      toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        item.classList.toggle('is-open', !open);
      });
      item.prepend(toggle);
    }

    decorateLevel(nested, level + 1);
  });
}

/** Filtro en cliente: oculta lo que no coincide y abre los grupos con resultados. */
function wireSearch(input, tree) {
  const items = [...tree.querySelectorAll('.sidenav-item')];

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();

    if (!query) {
      items.forEach((item) => item.classList.remove('is-hidden', 'is-forced-open'));
      return;
    }

    items.forEach((item) => {
      const own = item.querySelector(':scope > .sidenav-link, :scope > .sidenav-group-label, :scope > .sidenav-toggle');
      const text = (own?.textContent || item.textContent || '').toLowerCase();
      item.classList.toggle('is-hidden', !text.includes(query));
    });

    // Un grupo permanece visible si alguno de sus descendientes coincide.
    [...items].reverse().forEach((item) => {
      if (!item.classList.contains('sidenav-group')) return;
      const hit = item.querySelector('.sidenav-item:not(.is-hidden)');
      if (hit) {
        item.classList.remove('is-hidden');
        item.classList.add('is-forced-open');
      } else {
        item.classList.remove('is-forced-open');
      }
    });
  });
}

/**
 * loads and decorates the sidenav block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  const cellOf = (row) => row?.firstElementChild || row;
  // El árbol es la fila que trae una lista; la otra, si existe, es el texto del buscador.
  const navRow = rows.find((row) => cellOf(row)?.querySelector('ul, ol'));
  const labelRow = rows.find((row) => row !== navRow && cellOf(row)?.textContent.trim());
  const placeholder = labelRow ? cellOf(labelRow).textContent.trim() : 'Buscar';

  const panel = document.createElement('div');
  panel.className = 'sidenav-panel';

  // --- buscador ---
  const search = document.createElement('div');
  search.className = 'sidenav-search';
  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'sidenav-search-input';
  input.placeholder = placeholder;
  input.setAttribute('aria-label', placeholder);
  search.append(searchIcon(), input);

  // --- árbol ---
  const nav = document.createElement('nav');
  nav.className = 'sidenav-tree';
  nav.setAttribute('aria-label', 'Navegación de sección');
  const list = cellOf(navRow)?.querySelector('ul, ol');
  if (list) {
    nav.append(list);
    decorateLevel(list, 1);
    markCurrent(nav);
  }

  panel.append(search, nav);
  rows.forEach((row) => row.remove());
  block.append(panel);

  wireSearch(input, nav);

  // La sección del sidenav pasa a ser la columna izquierda de la página.
  block.closest('.section')?.classList.add('sidenav-section');
  block.closest('main')?.classList.add('has-sidenav');
  // También en el body: el pie vive fuera de `main` y en el portal arranca donde acaba el
  // menú, no a sangre, así que necesita saber que la página lleva menú lateral.
  document.body.classList.add('has-sidenav');
}
