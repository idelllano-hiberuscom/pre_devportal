---
tags: [pattern, cecabank]
detectado: 2026-08-14
ocurrencias: 7
candidato_transversal: true
---
# Leer las celdas del bloque por posición

## Síntoma

El bloque se ve bien mientras el autor rellena todos los campos. En cuanto deja uno vacío
—que es el caso normal— todos los campos siguientes se desplazan un puesto y el bloque pinta
mal sin dar ningún error:

- el titular aparece dentro del contenedor oculto del texto alternativo y **no se ve**
- el texto alternativo se pinta como contenido visible
- una imagen acaba tratada como lista de clases CSS

Se manifestó en 7 bloques del mismo proyecto: `hero`, `cards`, `pie-chart`, `feature-list`,
`contact-form`, `video` y `code-block`. Ninguno lo detectó el gate, porque el gate renderiza
siempre el bloque con todos los campos rellenos.

## Causa

**AEM no emite fila para un campo que el autor no ha rellenado.** Un modelo de 4 campos con
2 sin autorizar llega a `decorate()` con 2 filas, no con 4 vacías. Por tanto:

```js
// ❌ Roto en cuanto falte un campo opcional
const [imageRow, altRow, textRow] = [...block.children];
```

Hay además dos colapsos que reducen filas aunque el campo **sí** esté relleno:

- `image` + `imageAlt` → una sola celda: el alt viaja en `<img alt="…">`, **no ocupa fila**
- `title` + `titleType` → una sola celda `<h2>`

Es decir, ni siquiera contar los campos del modelo predice el número de filas.

## Corrección

Resolver por **contenido**, no por índice. Lo reconocible primero (imagen, enlace, lista),
y el resto en el orden del modelo sobre lo que quede:

```js
function resolveCells(cells, { hasText = true, hasLink = false } = {}) {
  const imageCell = cells.find((c) => c.querySelector('picture'));
  const rest = cells.filter((c) => c !== imageCell && c.textContent.trim());

  let linkCell = null;
  if (hasLink) {
    const i = rest.findIndex((c) => c.querySelector('a') || /^(?:https?:\/\/|\/)\S*$/.test(c.textContent.trim()));
    if (i >= 0) [linkCell] = rest.splice(i, 1);
  }

  // Con campo de texto y una sola celda restante, esa celda es el texto — nunca el alt.
  let altCell = null;
  let bodyCells = [];
  if (!hasText) [altCell] = rest;
  else if (rest.length > 1) [altCell, ...bodyCells] = rest;
  else bodyCells = rest;

  return { imageCell, altCell, bodyCells, linkCell };
}
```

Cuando el DOM lleva instrumentación (dentro de Universal Editor) se puede indexar por
`data-aue-prop`, que es exacto. En entrega no existe: ahí solo vale el contenido.

## Dónde aplica

- **`eds-developer`** — invariante duro en su prompt, no una recomendación.
- **`eds-xwalk-conventions`** — la sección 5 ya explica los colapsos `image`+`imageAlt`;
  falta justo encima la regla de que un campo vacío no emite fila.
- **`quality-gate.mjs`** — es donde se caza. Renderizar el bloque **dos veces**: una con
  todos los campos y otra **solo con los obligatorios**, y afirmar que ningún valor cambia
  de sitio. Un único test cubre los 7 casos.
- **`block-auditor` (PRE-PUSH)** — detector barato: `grep` de desestructuración posicional
  sobre `block.children` en cualquier `blocks/*/*.js`.

MOC: [[Cecabank]]
