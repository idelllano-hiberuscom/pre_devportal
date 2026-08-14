import {
  createOptimizedPicture,
  toClassName,
} from '../../scripts/aem.js';

const FIELD_ALIASES = {
  'background-image': 'backgroundImage',
  backgroundimage: 'backgroundImage',
  'recovery-link': 'recoveryLink',
  recoverylink: 'recoveryLink',
  'register-link': 'registerLink',
  registerlink: 'registerLink',
  'auth-endpoint': 'authEndpoint',
  authendpoint: 'authEndpoint',
  'open-api-endpoint': 'openApiEndpoint',
  openapiendpoint: 'openApiEndpoint',
  endpoints: 'endpoints',
};

const sanitizeUrl = (value) => {
  if (!value || typeof value !== 'string') return '';
  try {
    const parsed = new URL(value, window.location.href);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch (e) {
    return '';
  }
  return '';
};

const normalizeFieldName = (value) => FIELD_ALIASES[toClassName(value)] || '';

const getCell = (row) => {
  const children = [...row.children];
  if (children.length > 1) return children[1];
  return children[0] || row;
};

const extractCellValue = (cell, fieldName) => {
  if (!cell) return '';
  if (fieldName === 'backgroundImage') {
    const image = cell.querySelector('img');
    if (image?.src) return image.src;
  }
  const link = cell.querySelector('a');
  if (link?.href) return link.href;
  return cell.textContent.trim();
};

/*
 * AEM omite la fila de todo campo que el autor deje vacío, así que `ORDERED_FIELDS[index]`
 * desplaza los cinco campos en cuanto falta uno: la consola acaba pidiendo el OpenAPI a la
 * URL de autenticación. Cuando no hay etiquetas se resuelve por contenido, que aquí es
 * suficiente porque los tres tipos de campo son distinguibles: la imagen trae <img>, los
 * enlaces traen <a>, y los endpoints son URLs sueltas en el orden del modelo.
 */
const inferirCampos = (rows) => {
  const restantes = ['recoveryLink', 'registerLink', 'authEndpoint', 'openApiEndpoint'];
  return rows.map((row) => {
    const celda = row.children[0] || row;
    if (celda.querySelector('img, picture')) return 'backgroundImage';
    const i = celda.querySelector('a') ? 0 : restantes.findIndex((f) => f.endsWith('Endpoint'));
    return i >= 0 ? restantes.splice(i, 1)[0] : '';
  });
};

const getEntries = (block) => {
  const rows = [...block.querySelectorAll(':scope > div')];
  const hasLabels = rows.length > 0 && rows.every((row) => row.children.length > 1);
  const inferidos = hasLabels ? null : inferirCampos(rows);
  const entries = rows.reduce((result, row, index) => {
    const fieldName = hasLabels
      ? normalizeFieldName(row.children[0]?.textContent || '')
      : inferidos[index];
    if (!fieldName) return result;

    const cell = getCell(row);
    result.push({
      fieldName,
      cell,
      content: cell?.cloneNode(true) || null,
      value: extractCellValue(cell, fieldName),
    });
    return result;
  }, []);

  if (!hasLabels && rows.length === 4) {
    const endpointsCell = getCell(rows[3]);
    entries.push({
      fieldName: 'endpoints',
      cell: endpointsCell,
      content: endpointsCell?.cloneNode(true) || null,
      value: extractCellValue(endpointsCell, 'endpoints'),
    });
  }

  return entries;
};

const readSwaggerConfig = (entries) => entries.reduce((config, entry) => {
  config[entry.fieldName] = entry.value;
  return config;
}, {});

const getEntry = (entries, fieldName) => entries.find((entry) => entry.fieldName === fieldName);

const resolveEndpoints = (config) => {
  let authEndpoint = sanitizeUrl(config.authEndpoint || '');
  let openApiEndpoint = sanitizeUrl(config.openApiEndpoint || '');
  const endpointsRaw = config.endpoints || '';

  if ((!authEndpoint || !openApiEndpoint) && endpointsRaw) {
    try {
      const parsed = JSON.parse(endpointsRaw);
      authEndpoint = authEndpoint || sanitizeUrl(parsed.authEndpoint || '');
      openApiEndpoint = openApiEndpoint || sanitizeUrl(parsed.openApiEndpoint || '');
    } catch (e) {
      const [auth, openapi] = endpointsRaw.split(',').map((item) => item.trim());
      authEndpoint = authEndpoint || sanitizeUrl(auth);
      openApiEndpoint = openApiEndpoint || sanitizeUrl(openapi);
    }
  }

  return { authEndpoint, openApiEndpoint };
};

const createLabeledInput = (labelText, type, name) => {
  const wrapper = document.createElement('label');
  wrapper.className = 'swagger-console-field';

  const label = document.createElement('span');
  label.className = 'swagger-console-label';
  label.textContent = labelText;

  const control = document.createElement('span');
  control.className = 'swagger-console-control';

  const input = document.createElement('input');
  input.className = 'swagger-console-input';
  input.type = type;
  input.name = name;
  input.required = true;
  input.autocomplete = name === 'email' ? 'email' : 'current-password';
  // El portal usa campos con etiqueta flotante: la etiqueta descansa dentro del recuadro y
  // sube al enfocar o al haber valor. El placeholder en blanco habilita :placeholder-shown.
  input.placeholder = ' ';

  control.append(input);
  wrapper.append(label, control);

  return {
    wrapper,
    control,
    input,
  };
};

const decorateBackground = (login, backgroundEntry, fallbackUrl) => {
  const media = document.createElement('div');
  media.className = 'swagger-console-background';
  media.setAttribute('aria-hidden', 'true');

  const picture = backgroundEntry?.content?.querySelector('picture');
  const image = backgroundEntry?.content?.querySelector('img');

  if (picture) {
    media.append(picture.cloneNode(true));
  } else if (image?.src) {
    media.append(createOptimizedPicture(image.src, '', false, [{ width: '1200' }]));
  } else if (fallbackUrl) {
    media.style.backgroundImage = `url("${fallbackUrl}")`;
  }

  const backgroundImage = media.querySelector('img');
  if (backgroundImage) {
    backgroundImage.alt = '';
    backgroundImage.loading = 'eager';
    backgroundImage.decoding = 'async';
  }

  login.append(media);
};

const createLink = (entry, href, className, fallbackText) => {
  const link = entry?.content?.querySelector('a')?.cloneNode(true) || document.createElement('a');
  link.className = className;
  link.href = sanitizeUrl(link.getAttribute('href') || href) || href;
  link.textContent = link.textContent.trim() || fallbackText;
  return link;
};

const createPasswordToggle = (input) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'swagger-console-password-toggle';
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-label', 'Mostrar contraseña');
  button.textContent = 'Mostrar';

  button.addEventListener('click', () => {
    const isVisible = input.type === 'text';
    input.type = isVisible ? 'password' : 'text';
    button.setAttribute('aria-pressed', String(!isVisible));
    button.setAttribute('aria-label', isVisible ? 'Mostrar contraseña' : 'Ocultar contraseña');
    button.textContent = isVisible ? 'Mostrar' : 'Ocultar';
  });

  return button;
};

const setState = (block, form, status, state, message) => {
  block.dataset.state = state;
  form.setAttribute('aria-busy', String(state === 'loading'));
  status.textContent = message;
};

export default function decorate(block) {
  const entries = getEntries(block);
  const config = readSwaggerConfig(entries);
  const { authEndpoint, openApiEndpoint } = resolveEndpoints(config);
  const isMockIntegration = !authEndpoint || !openApiEndpoint;
  const backgroundImage = sanitizeUrl(config.backgroundImage || '');
  const recoveryLink = sanitizeUrl(config.recoveryLink || '/recovery');
  const registerLink = sanitizeUrl(config.registerLink || '/register');

  const content = document.createElement('div');
  content.className = 'swagger-console-content';

  const source = document.createElement('div');
  source.className = 'swagger-console-source';
  source.hidden = true;
  while (block.firstChild) {
    source.append(block.firstChild);
  }

  const login = document.createElement('div');
  login.className = 'swagger-console-login';
  decorateBackground(login, getEntry(entries, 'backgroundImage'), backgroundImage);

  const panel = document.createElement('div');
  panel.className = 'swagger-console-panel';

  const form = document.createElement('form');
  form.className = 'swagger-console-form';
  form.noValidate = true;

  const { wrapper: emailWrapper, input: emailInput } = createLabeledInput('Email', 'email', 'email');
  const {
    wrapper: passwordWrapper,
    control: passwordControl,
    input: passwordInput,
  } = createLabeledInput('Contraseña', 'password', 'password');
  passwordControl.append(createPasswordToggle(passwordInput));

  const hintLink = createLink(
    getEntry(entries, 'recoveryLink'),
    recoveryLink,
    'swagger-console-hint',
    '¿Has olvidado tu contraseña?',
  );

  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'swagger-console-submit';
  submitButton.textContent = 'Entrar';

  const registerText = document.createElement('p');
  registerText.className = 'swagger-console-register';
  const registerPrefix = document.createElement('span');
  registerPrefix.textContent = '¿No tienes una cuenta? ';
  const registerAnchor = createLink(
    getEntry(entries, 'registerLink'),
    registerLink,
    'swagger-console-register-link',
    'Regístrate',
  );
  registerText.append(registerPrefix, registerAnchor);

  const status = document.createElement('p');
  status.className = 'swagger-console-status';
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('role', 'status');

  const frame = document.createElement('iframe');
  frame.className = 'swagger-console-frame';
  frame.hidden = true;
  frame.title = 'Swagger Console';
  frame.loading = 'lazy';
  frame.referrerPolicy = 'no-referrer';

  form.append(emailWrapper, passwordWrapper, hintLink, submitButton);
  panel.append(form, registerText, status);
  login.append(panel);
  content.append(login, frame);
  block.append(content, source);

  if (isMockIntegration) {
    block.dataset.mockIntegration = 'true';
    setState(
      block,
      form,
      status,
      'ready',
      'Modo mock activo. Inicia sesión para probar la integración.',
    );
    // eslint-disable-next-line no-console
    console.info('[swagger-console:mock]', { event: 'integration-ready' });
  } else {
    setState(block, form, status, 'ready', 'Inicia sesión para cargar la consola de API.');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setState(block, form, status, 'loading', 'Cargando consola de API...');
    submitButton.disabled = true;
    emailInput.disabled = true;
    passwordInput.disabled = true;

    try {
      if (isMockIntegration) {
        // eslint-disable-next-line no-console
        console.info('[swagger-console:mock]', {
          event: 'authentication-submitted',
          emailProvided: Boolean(emailInput.value),
          passwordProvided: Boolean(passwordInput.value),
        });
        setState(block, form, status, 'ready', 'Autenticación mock completada.');
        return;
      }

      const authResponse = await fetch(authEndpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailInput.value,
          password: passwordInput.value,
        }),
      });

      if (!authResponse.ok) throw new Error('AUTH_FAILED');

      frame.src = openApiEndpoint;
      frame.hidden = false;
      setState(block, form, status, 'ready', 'Consola de API cargada.');
    } catch (e) {
      setState(block, form, status, 'error', 'No se pudo cargar la consola de API.');
    } finally {
      submitButton.disabled = false;
      emailInput.disabled = false;
      passwordInput.disabled = false;
      passwordInput.value = '';
    }
  });
}
