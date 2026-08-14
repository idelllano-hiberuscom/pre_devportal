# Autoría de contenido en el author instance

Herramientas para rellenar las páginas de `/content/pre-devportal` con hero, contenido de
cabecera real del portal e imágenes demo, y para subir el juego de imágenes al DAM.

El token **nunca** se guarda en disco ni en el repositorio: se pasa por la variable de
entorno `AEM_TOKEN` en cada ejecución.

## Estado de partida detectado (2026-08-11)

En el author instance ya existían las 44 páginas con la plantilla Franklin, pero:

- solo **16 instancias de bloque** repartidas en 11 páginas
- **ninguna referencia de imagen** rellena: los items traían `imageAlt`, `iconAlt` y
  `media_imageAlt` pero el campo de imagen vacío
- `/inicio` completamente vacía, sin secciones
- ningún hero salvo el de `/index`, que es el del boilerplate de Adobe
- nada con preview hecho, de ahí el 404 en `*.aem.page`

## Cómo obtener el token

En el Experience Cloud shell, con sesión abierta en el programa p34633:
`https://experience.adobe.com` → consola de desarrollador → token de acceso.
Caduca en 24 h.

```bash
export AEM_TOKEN="eyJhbGciOi..."
```

## Uso

```bash
cd .eds-pipeline/authoring

# 1. Generar el juego de imágenes demo (42 ficheros, ~810 KB, paleta del portal)
node demo-assets.mjs                       # escribe ./demo-assets/

# 2. Subirlo al DAM (protocolo de subida binaria directa de AEM Cloud Service)
node aem.mjs upload demo-assets /content/dam/pre-devportal/demo

# 3. Regenerar el spec (opcional: ya viene spec.json commiteado)
#    Requiere aem-site.json, que es el volcado del árbol actual:
node aem.mjs get /content/pre-devportal.infinity.json 99999999 > aem-site.json
node extract-pages.mjs                     # títulos y entradillas del portal capturado
node build-spec.mjs                        # produce spec.json

# 4. Autoría. Primero en seco, para revisar lo que se va a escribir:
node aem.mjs author spec.json --only /content/pre-devportal/inicio --dry

# 5. Una página, para validar:
node aem.mjs author spec.json --only /content/pre-devportal/inicio

# 6. Las 25 páginas:
node aem.mjs author spec.json
```

## Qué escribe

Por cada página, una sección de hero delante y las secciones existentes conservadas y
enriquecidas:

- **hero**: `text` con el `<h1>` y la entradilla reales del portal (extraídos de
  `import-work/pages/*/cleaned.html`), `image` apuntando al DAM
- **bloques existentes**: se conservan íntegros y se les añade la referencia de imagen que
  faltaba — `image` en cards, `icon` en pie-chart, `media_image` en carousel,
  `backgroundImage` en swagger-console

La autoría es idempotente: cada sección declarada se borra y se reescribe, así que se puede
volver a ejecutar sin duplicar nodos.

## Estado actual (2026-08-12)

- las 42 imágenes están en `/content/dam/pre-devportal/demo`
- las **25 páginas están autorizadas** con hero, el h1 y la entradilla reales del portal, y
  las referencias de imagen rellenas en todos los bloques
- verificado en el endpoint de delivery del author, que es lo que consume EDS:
  `/bin/franklin.delivery/idelllano-hiberuscom/pre-devportal/main/inicio.html` devuelve el
  hero con su `<picture>` del DAM, el `<h1>` y la instrumentación de Universal Editor
- **falta el preview**: sin él, `main--pre-devportal--idelllano-hiberuscom.aem.page` sigue
  devolviendo 404

## Cómo disparar el preview

La admin API de aem.live no sirve aquí: `POST https://admin.hlx.page/preview/idelllano-hiberuscom/pre-devportal/main/<pagina>`
responde **401 `error from content-bus`**, porque con AEM como origen el preview se replica
desde el propio author, no desde el repositorio.

Se hace desde AEM. A mano son dos clics:

1. Sites console → `/content/pre-devportal` → seleccionar las páginas (o la raíz con sus
   descendientes) → **Publicar** → publica a preview
2. o abrir cualquier página en Universal Editor y usar su botón de preview

**Por API está resuelto** (antes figuraba aquí como pendiente). Los `agentId` son literalmente
`preview` y `publish`; listar `/etc/replication/agents.author` da 403, así que no se descubren
por ahí, pero funcionan:

```
POST /bin/replicate.json
  cmd=Activate&agentId=preview&path=/content/pre-devportal/inicio
  -> {"status.message":"Replication started for …","status.code":200}
```

Automatizado en `../replicar.mjs`:

```
AEM_TOKEN=... node .eds-pipeline/replicar.mjs --assets --paginas
AEM_TOKEN=... node .eds-pipeline/replicar.mjs /content/pre-devportal/inicio
```

Hace falta **también tras cambiar un binario del DAM**, y no basta con replicar el asset: EDS
resuelve las referencias del DAM a `./media_<hash>` al generar el HTML y ese hash sale del
binario, así que hasta que no se replican las páginas siguen apuntando al hash anterior.

## Aviso sobre `value` en pie-chart

Los nodos de `pie-chart-item` autorizados a mano guardan un campo heredado `value` en
`modelFields`, que el modelo ya no declara. `blocks/pie-chart/pie-chart.js` valida que el
color autorizado sea un color real y cae a la paleta medida si no lo es, así que un `"1"`
residual no rompe el render. Al reautorizar con `spec.json` el campo desaparece.
