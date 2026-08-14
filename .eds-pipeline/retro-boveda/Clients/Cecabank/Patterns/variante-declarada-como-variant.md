---
tags: [pattern, cecabank, xwalk]
detectado: 2026-08-14
ocurrencias: 4
candidato_transversal: true
---
# La variante se declara en `classes`, no en `variant`

## Síntoma

El bloque insertado desde Universal Editor sale **sin estilo de variante**. En el panel del
autor todo parece correcto, el JSON valida, `npm run build:json` pasa y el lint pasa. Pero el
`<div>` entregado no lleva la clase de la variante, así que el CSS `.cards.icon-cards` no
engancha y el bloque cae al estilo base.

Ocurrió en las cuatro variantes de `cards` (`logos`, `icon-cards`, `plugins`, `editorial`):
las cuatro salían sin estilo.

## Causa

En el `template` de la definición se usó `variant`:

```json
{ "template": { "name": "Cards", "filter": "cards-icon-cards", "variant": "icon-cards" } }
```

**AEM guarda esa propiedad en el nodo sin quejarse, y la entrega la ignora.** La clase CSS de
un bloque sale de `classes`, que es lo que el pipeline vuelca sobre el `<div>`. `variant` no
es un campo del contrato xwalk: es una propiedad inventada que nadie rechaza.

Es un fallo silencioso en las cuatro capas: se escribe bien, se guarda bien, valida bien y no
hace nada.

## Corrección

```json
{ "template": { "name": "Cards", "filter": "cards-icon-cards", "classes": "icon-cards" } }
```

Si ya hay contenido autorizado con `variant`, no basta con corregir la definición: hay que
**parchear también los nodos ya creados**, porque conservan la propiedad antigua.

## Dónde aplica

- **`ue-qa-specialist`** — genera el `_<bloque>.json`; es quien debe emitirlo bien.
- **`quality-gate.mjs`** — comprobación estática, sin navegador: si una definición declara
  variante, que la clave sea `classes`. Y comprobación dinámica: que esa clase llega de
  verdad al `<div>` entregado.
- **`eds-xwalk-conventions`** — la tabla de la sección 5 ya lista `classes`; conviene añadir
  explícitamente que `variant` **no existe** y por qué no da error.

MOC: [[Cecabank]]
