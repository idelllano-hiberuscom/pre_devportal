---
tags: [taxonomy, cecabank]
updated: 2026-08-14
---
# Taxonomía viva — Cecabank

## Bloques con ticket y contrato

| component_id | block_name | Estado | Ticket | Nota |
|---|---|---|---|---|
| [[cmp-swagger-console]] | `swagger-console` | activo | PA-24 | |
| [[cmp-cards-logos]] | `cards` · `logos` | activo | PA-25 | Círculo 144px, logotipos de medio de pago |
| [[cmp-contact-form]] | `contact-form` | activo | PA-26 | El alt de la imagen **no** ocupa fila |
| [[cmp-accordion]] | `accordion` | activo | PA-27 | |
| [[cmp-tabs]] | `tabs` | activo | PA-28 | Admite fragmento por ruta y contenido en línea |
| [[cmp-video]] | `video` | activo | PA-29 | 4:3, medido del portal (`width=640 height=480`) |
| [[cmp-pie-chart]] | `pie-chart` | activo | PA-30 | Donut SVG decorativo, sin librería |
| [[cmp-cards-icon-cards]] | `cards` · `icon-cards` | activo | PA-31 | Rejilla 2×2 a media anchura |
| [[cmp-cards-plugins]] | `cards` · `plugins` | activo | PA-32 | |
| [[cmp-cards-editorial]] | `cards` · `editorial` | activo | PA-33 | |
| [[cmp-code-block]] | `code-block` | activo | PA-34 | `code` es **richtext** con `<pre>` |
| [[cmp-carousel]] | `carousel` | activo | PA-35 | Filmstrip; admite titular a la izquierda |

## Bloques construidos sin ticket

Detectados tarde, sin contrato ni evidencia previa. Ver [[deteccion-incompleta-de-componentes]].

| block_name | Dónde se usa | Por qué faltaba |
|---|---|---|
| `hero` | Todas las páginas | La carpeta existía con el `.js` **vacío (0 bytes)** |
| `feature-list` | `/inicio`, `/empieza-con-nosotros`, integraciones | Se leyó como contenido por defecto |
| `sidenav` | Árbol de herramientas (20+ páginas) | Se trató como chrome tipo header/footer |
| `table` | Documentación técnica | Su página no entró en el crawl |

## Variantes y estilos añadidos después

| Qué | Dónde se declara | Para qué |
|---|---|---|
| `cards` · `icon-grid` | `blocks/cards/_cards.json` | Rejilla de 3 columnas de `/inicio` |
| `cards` · `boxed` | `blocks/cards/_cards.json` | Tarjetas blancas que solapan el hero |
| `columns` · `divided` | `blocks/columns/_columns.json` | Dos columnas con divisor teal |
| Estilo de sección `banner` | `models/_section.json` | Franja navy en diagonal con contenido centrado |

## Convenciones de este cliente

- Composición de dos columnas: **no** se hace con bloques dentro de `columns`
  (ver [[2026-08-14-los-bloques-no-anidan]]). El bloque marca su sección y el CSS reparte.
- Las páginas de detalle del menú "Pagos online" viven en `/integraciones/*`,
  `/sin-integracion/*` y `/otros/*`. Las de documentación, bajo
  `/herramientas-para-desarrolladores/*`. **Son árboles distintos con contenido distinto**:
  no se duplican.
- Las páginas de plugin cuelgan de `/plugin/herramientas-para-desarrolladores/…`, no del
  árbol de herramientas. Es la ruta a la que apunta el menú lateral.

MOC: [[Cecabank]]
