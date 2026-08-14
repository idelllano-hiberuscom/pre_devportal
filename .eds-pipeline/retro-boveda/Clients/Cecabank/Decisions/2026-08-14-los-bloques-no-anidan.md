---
tags: [decision, gate, cecabank, xwalk]
fecha: 2026-08-14
gate: 2
---
# Un bloque no puede vivir dentro de un `columns`

## Qué propuso el agente

Montar las cuatro tarjetas de `/inicio` como un bloque `cards` **dentro** de una columna del
componente `columns`, para reproducir la composición del portal (4 tarjetas a la izquierda,
imagen a la derecha). El filtro `column` acepta `cards` entre sus componentes, así que
Universal Editor lo permite.

## Qué decidió el humano

No se puede. Se resuelve **a nivel de sección**: el bloque de tarjetas y la imagen como
hermanos, y el propio bloque marca la sección para repartirla en dos columnas.

## Motivo

Se comprobó de forma empírica, en dos intentos:

1. Con las columnas sin `sling:resourceType`, la entrega devolvía el contenido de las
   tarjetas **aplanado**: imagen + `h4` + `p` sueltos, sin envoltorio ni clase.
2. Poniendo el tipo correcto (`.../columns/v1/columns/column`) el resultado fue **el mismo**.

La causa está en el runtime, no en el contenido:

```js
// scripts/aem.js
function decorateBlocks(main) {
  main.querySelectorAll('div.section > div > div').forEach(decorateBlock);
}
```

**EDS solo decora nietos directos de una sección.** Un bloque dentro de una columna queda en
`div.section > div.columns-wrapper > div.columns > div > div > div.cards` y nunca se decora.
Que el filtro de UE lo permita es engañoso: el autor puede insertarlo y no funcionará.

## Consecuencia

- Regla nueva para `component-architect` y `ue-qa-specialist`: **los bloques no anidan**.
  Una composición de dos columnas con bloques dentro se resuelve marcando la sección desde el
  `decorate()` del bloque, como ya hacía `feature-list`.
- **Sí anida el contenido por defecto**: titulares, imágenes y párrafos dentro de una columna
  se renderizan bien. Ese es el camino cuando la columna solo lleva contenido, no bloques
  (se usó para "Entornos y endpoints").
- Revisar los filtros `column` que listan bloques: hoy prometen algo que no funciona.

MOC: [[Cecabank]]
