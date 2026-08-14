import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { rootPath } from '../../scripts/scripts.js';

/*
 * Footer del portal (medido en pre-devportaltpv.cloud.cecabank.es):
 *   raiz          flex column, gap 40px, padding 112px 96px, fondo rgb(1,52,81)
 *   contenido     1248px: logo de 224x40 a la izquierda (395px) y enlaces a la derecha (789px)
 *   enlaces       rejilla de 3 columnas de 210px con gap 80px, texto blanco 16px/32px
 *   certificaciones  fila propia con el titulo y los logos de marca (96x48, 83x48, 48x48)
 *
 * La entrada es contenido por defecto: el logo como primera imagen, cada titular con su lista
 * de enlaces debajo, y al final un titular con las imagenes de certificacion.
 */

const isHeading = (el) => /^H[1-6]$/.test(el?.tagName || '');
const isList = (el) => el?.tagName === 'UL' || el?.tagName === 'OL';

/**
 * Agrupa cada titular con la lista que le sigue, para maquetarlos en columnas.
 *
 * Solo cuenta como columna de enlaces el titular que va seguido de una lista. El de
 * certificaciones lleva imágenes debajo, no una lista, así que se queda fuera y acaba en su
 * propia fila; si no, se colaba como una cuarta columna.
 */
function groupLinkSections(container) {
  const sections = [];
  let current = null;

  [...container.children].forEach((child) => {
    if (isHeading(child)) {
      current = isList(child.nextElementSibling) ? document.createElement('div') : null;
      if (current) {
        current.className = 'footer-link-section';
        current.append(child);
        sections.push(current);
      }
    } else if (current && isList(child)) {
      current.append(child);
      current = null;
    }
  });

  return sections;
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : rootPath('/footer');
  const fragment = await loadFragment(footerPath);

  block.textContent = '';
  const source = document.createElement('div');
  while (fragment.firstElementChild) source.append(fragment.firstElementChild);

  /*
   * El contenido llega envuelto en secciones y en default-content-wrapper, así que hay que
   * bajar hasta los elementos reales: aplanar solo un nivel dejaba el wrapper dentro y no se
   * encontraba ni un titular.
   */
  const flat = document.createElement('div');
  const wrappers = [...source.querySelectorAll('.default-content-wrapper')];
  const holders = wrappers.length ? wrappers : [source];
  holders.forEach((holder) => {
    while (holder.firstElementChild) flat.append(holder.firstElementChild);
  });

  const inner = document.createElement('div');
  inner.className = 'footer-inner';

  const content = document.createElement('div');
  content.className = 'footer-content';

  /*
   * Marca: todo lo que va antes del primer titular, es decir el logotipo y, debajo, los
   * enlaces a redes. Antes se cogía solo la primera imagen, así que los enlaces a redes caían
   * en el bloque de certificaciones en vez de quedarse bajo el logotipo.
   */
  const brand = document.createElement('div');
  brand.className = 'footer-brand';
  while (flat.firstElementChild && !isHeading(flat.firstElementChild)) {
    const child = flat.firstElementChild;
    if (child.querySelector('a') && !child.querySelector('picture, img')) {
      child.classList.add('footer-social');
    }
    brand.append(child);
  }

  const links = document.createElement('div');
  links.className = 'footer-links';
  groupLinkSections(flat).forEach((section) => links.append(section));

  content.append(brand, links);
  inner.append(content);

  /*
   * Certificaciones: lo que queda tras extraer marca y enlaces. Suele ser un titular y un
   * grupo de imagenes, asi que se agrupa aparte en su propia fila.
   */
  const leftover = [...flat.children].filter((child) => child.textContent.trim() || child.querySelector('picture, img'));
  if (leftover.length) {
    const certifications = document.createElement('div');
    certifications.className = 'footer-certifications';

    /*
     * Los logotipos se juntan en una sola fila. Universal Editor emite un componente de imagen
     * por logotipo, es decir un <p> por imagen: sin agruparlos, cada uno formaba su propia
     * fila y los sellos salían apilados en vertical en lugar de en línea.
     */
    const logos = document.createElement('div');
    logos.className = 'footer-certification-logos';
    leftover.forEach((child) => {
      const onlyImage = child.querySelector('picture, img') && !child.textContent.trim();
      (onlyImage ? logos : certifications).append(child);
    });
    if (logos.children.length) certifications.append(logos);

    inner.append(certifications);
  }

  block.append(inner);
}
