---
tags: [moc, cecabank]
updated: 2026-08-14
---
# Cecabank — Portal de Desarrolladores TPV

Migración del portal de desarrolladores de e-commerce a AEM Edge Delivery Services (xwalk,
Universal Editor). Origen: portal Angular sobre Drupal.

## Taxonomía

- [[current-components]] — 12 bloques con ticket, 4 construidos sin él, 4 variantes añadidas

## Patrones recurrentes

Ordenados por impacto observado.

- [[celdas-por-posicion]] — **7 bloques**. AEM no emite fila para un campo vacío
- [[tokens-globales-sin-dueno-en-prod]] — la rama PROD no genera `global-tokens.md`
- [[variante-declarada-como-variant]] — **4 variantes** sin estilo por usar `variant`
- [[deteccion-incompleta-de-componentes]] — 2 componentes masivos no propuestos
- [[evidencia-visual-no-leida]] — se captura, no se lee; y está capada a 30 nodos

## Decisiones de gate

- [[2026-08-14-gate-que-mide-el-caso-facil]] — los 12 pasaban el gate con 7 rotos
- [[2026-08-14-los-bloques-no-anidan]] — `decorateBlocks` solo ve nietos de sección
- [[2026-08-14-tablas-y-codigo-no-caben-en-texto]] — el saneador de `text/v1/text`

## Lectura recomendada antes de la próxima demo

Si solo hay tiempo para dos cosas: **[[tokens-globales-sin-dueno-en-prod]]** (explica casi
toda la brecha de fidelidad) y **[[celdas-por-posicion]]** (explica casi todo el
comportamiento roto). Las dos se corrigen en un sitio cada una y ninguna cuesta más de una
tarde.

## Estado del portal a día de hoy

- **Código:** tokens de marca, tipografía Poppins con fallback medido, 17 bloques.
- **Contenido:** home, onboarding, 9 páginas de detalle, 18 de documentación, 5 de plugin,
  cabecera, menú lateral y pie. Cabecera y menú anclados, pie sangrado en páginas con menú.
- **Pendiente conocido:** `<code>` inline se degrada a `<strong>`; los enlaces a redes del
  pie salen como texto por no tener los glifos de marca.
