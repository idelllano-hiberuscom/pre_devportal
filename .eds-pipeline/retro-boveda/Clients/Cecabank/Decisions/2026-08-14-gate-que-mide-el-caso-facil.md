---
tags: [decision, gate, cecabank, calidad]
fecha: 2026-08-14
gate: 2
---
# El gate mide lo correcto sobre el caso equivocado

## Qué propuso el agente

Dar por aceptados los 12 componentes con el resultado de `quality-gate.mjs`: Lighthouse
(perf ≥ 95, a11y = 100, bp ≥ 95, seo ≥ 95) y axe (critical y serious a 0). Todos pasaban.

## Qué decidió el humano

No basta. Los 12 pasaban el gate y **7 de ellos tenían el mismo fallo funcional**
(ver [[celdas-por-posicion]]), más 4 variantes que salían sin estilo
(ver [[variante-declarada-como-variant]]).

## Motivo

El gate mide **rendimiento y accesibilidad**, no **conformidad con el modelo xwalk**. Y las
aserciones de DOM que sí tiene —`data-aue-model` presente, número de `data-aue-prop`,
`data-aue-filter` en contenedores, en `quality-gate.mjs:198-207`— se ejecutan siempre sobre
una página donde **el autor rellenó todos los campos**.

Ese es justo el único caso en el que los 7 fallos no se manifiestan. Un bloque roto para
cualquier autor real obtenía 100 de accesibilidad.

## Consecuencia

Cuatro comprobaciones nuevas. Tres son estáticas y no necesitan navegador:

1. `slug(template.name)` **=== nombre de la carpeta del bloque**. La clase CSS entregada sale
   del `name` slugificado: `"Section Navigation"` producía `section-navigation`, no `sidenav`,
   y el CSS del bloque no enganchaba.
2. Si la definición declara variante, la clave es **`classes`**, nunca `variant`.
3. Contenedor → `filter`; bloque simple → `model`. Nunca los dos.

Y una dinámica, que es la que más cubre:

4. **Renderizar el bloque dos veces** —una con todos los campos y otra solo con los
   obligatorios— y afirmar que ningún valor cambia de sitio.

La cuarta, por sí sola, habría cazado los 7 casos de golpe.

MOC: [[Cecabank]]
