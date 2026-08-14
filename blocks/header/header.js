import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import {
  rootPath, currentLang, LANGS, LANG_DEFAULT,
} from '../../scripts/scripts.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

const NOMBRE_IDIOMA = { es: 'Español', en: 'English', gl: 'Galego' };

/**
 * Convierte la etiqueta de idioma del nav en un conmutador real.
 *
 * Tiene que vivir aquí y no en el contenido porque depende de la página actual: cada
 * enlace apunta a *esta misma* página en otro idioma. El fragmento de nav es estático y
 * por idioma, así que no puede saberlo.
 *
 * En el portal de origen esto es i18n de cliente y al recargar declara el idioma
 * equivocado. Aquí son páginas reales: el enlace es un `<a>` normal, indexable y que
 * funciona con el JavaScript desactivado.
 */
function decorarSelectorDeIdioma(tools) {
  if (!tools) return;

  const actual = currentLang();
  const todos = [LANG_DEFAULT, ...LANGS];

  // La ruta sin su prefijo de idioma: es la que se reutiliza para los demás.
  const rxPrefijo = new RegExp(`^/(?:${LANGS.join('|')})(?=/|$)`);
  const sinPrefijo = window.location.pathname.replace(rxPrefijo, '') || '/';

  const lista = document.createElement('ul');
  lista.className = 'nav-lang';
  todos.forEach((lang) => {
    const item = document.createElement('li');
    const destino = lang === LANG_DEFAULT ? sinPrefijo : `/${lang}${sinPrefijo}`;
    if (lang === actual) {
      item.setAttribute('aria-current', 'true');
      item.textContent = lang.toUpperCase();
    } else {
      const enlace = document.createElement('a');
      enlace.href = destino;
      enlace.hreflang = lang;
      enlace.textContent = lang.toUpperCase();
      // El nombre accesible dice el idioma, no dos letras sueltas.
      enlace.setAttribute('aria-label', NOMBRE_IDIOMA[lang] || lang);
      item.append(enlace);
    }
    lista.append(item);
  });

  const etiqueta = document.createElement('span');
  etiqueta.className = 'nav-lang-label';
  etiqueta.id = 'nav-lang-label';
  etiqueta.textContent = 'Idioma';
  lista.setAttribute('aria-labelledby', etiqueta.id);

  // La etiqueta de texto del contenido ("ES") se sustituye: ya la representa la lista.
  const marcador = [...tools.querySelectorAll('p')]
    .find((p) => todos.includes(p.textContent.trim().toLowerCase()));
  if (marcador) marcador.remove();

  tools.prepend(etiqueta, lista);
}

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === 'nav-drop';
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections.querySelectorAll('.nav-sections .default-content-wrapper > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  // enable nav dropdown keyboard accessibility
  if (navSections) {
    const navDrops = navSections.querySelectorAll('.nav-drop');
    if (isDesktop.matches) {
      navDrops.forEach((drop) => {
        if (!drop.hasAttribute('tabindex')) {
          drop.setAttribute('tabindex', 0);
          drop.addEventListener('focus', focusNavSection);
        }
      });
    } else {
      navDrops.forEach((drop) => {
        drop.removeAttribute('tabindex');
        drop.removeEventListener('focus', focusNavSection);
      });
    }
  }

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
    // collapse menu on focus lost
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : rootPath('/nav');
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand?.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    // decorateButtons de este proyecto marca el párrafo como `button-wrapper`, no como el
    // `button-container` del boilerplate. Buscar el nombre antiguo devolvía null y la
    // excepción tumbaba la decoración completa del header, que quedaba vacío.
    const wrapper = brandLink.closest('.button-wrapper, .button-container');
    if (wrapper) wrapper.className = '';
  }

  decorarSelectorDeIdioma(nav.querySelector('.nav-tools'));

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      if (navSection.querySelector('ul')) navSection.classList.add('nav-drop');

      /*
       * El portal abre "Pagos online" como un menú de dos niveles: el primer panel lista los
       * grupos y el segundo, al lado, los enlaces del grupo señalado. Cualquier <li> de
       * segundo nivel que traiga su propia lista se convierte en uno de esos grupos.
       */
      const groups = [...navSection.querySelectorAll(':scope > ul > li')]
        .filter((item) => item.querySelector(':scope > ul'));

      groups.forEach((group, index) => {
        group.classList.add('nav-drop-group');
        if (index === 0) group.classList.add('is-active');

        const activate = (event) => {
          // El grupo solo despliega su panel: no debe cerrar el menú padre.
          event.stopPropagation();
          groups.forEach((other) => other.classList.toggle('is-active', other === group));
        };
        group.addEventListener('mouseenter', activate);
        group.addEventListener('click', activate);
      });

      navSection.addEventListener('click', () => {
        if (isDesktop.matches) {
          const expanded = navSection.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
          // Al abrir, el primer grupo queda señalado, como en el portal.
          if (!expanded && groups.length) {
            groups.forEach((other, i) => other.classList.toggle('is-active', i === 0));
          }
        }
      });
    });
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
