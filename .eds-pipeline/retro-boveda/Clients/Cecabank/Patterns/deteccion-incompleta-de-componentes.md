---
tags: [pattern, cecabank, deteccion]
detectado: 2026-08-14
ocurrencias: 2
candidato_transversal: true
---
# Componentes que la detección no propuso

## Síntoma

El inventario cerró con 12 componentes (12 tickets, 12 contratos, 12 carpetas de evidencia).
Al montar las páginas faltaban dos que el portal usa de forma masiva, y hubo que construirlos
a mitad de proyecto, sin contrato ni evidencia previa:

| No detectado | Dónde vive en el portal | Alcance |
|---|---|---|
| `feature-list` | Franja navy en diagonal de `/inicio` y `/empieza-con-nosotros` | 3+ páginas |
| `sidenav` | Menú lateral fijo de todo el árbol de herramientas | 20+ páginas |

Más tarde apareció un tercero, `table`, al entrar en la documentación técnica.

## Causa

Dos causas distintas, y conviene no confundirlas:

**1. `feature-list` — el sesgo de "no crear" sin suelo.**
`component-architect` tiene, con razón, un sesgo por defecto a no crear componentes. Una
banda con titular y una lista de iconos con texto se puede leer como "contenido por defecto
dentro de una sección con estilo", y así se clasificó. Pero se repetía en tres páginas con
una composición idéntica (titular a la izquierda, items a la derecha, divisor teal) que
ningún bloque existente sabía pintar.

**2. `sidenav` — la excepción del chrome no se aplicó.**
El prompt dice: *"Header, nav y footer son casos aparte… no los propongas como componentes
nuevos salvo que el portal haga algo que esos bloques no cubren"*. Un menú lateral fijo con
buscador, árbol de tres niveles y estado abierto/cerrado **es** algo que esos bloques no
cubren. La cláusula de excepción existía; lo que faltó fue reconocer el caso.

**3. `table` — no estaba en el conjunto crawleado.**
La comparativa vive en una página de documentación que no entró en el análisis inicial.

## Corrección

Tres reglas para `component-architect`:

- **Suelo al sesgo de no crear.** Un patrón visual repetido en **≥2 páginas** que ningún
  bloque existente pinta **se propone**, aunque parezca contenido por defecto. Que el Gate 1
  lo baje a variante es barato; descubrirlo a mitad de construcción no.
- **El chrome no es solo header/nav/footer.** Menú lateral, breadcrumb, tabla de contenidos
  y buscador de sección entran en el inventario. Ampliar la excepción con estos ejemplos.
- **Declarar la cobertura.** La propuesta debe decir **qué páginas se analizaron y cuántas
  tiene el árbol**. Si vio 8 de 40, eso es un riesgo que el Gate 1 tiene que ver. Hoy la
  propuesta no distingue "no hay más componentes" de "no miré más páginas".

## Dónde aplica

- **`component-architect`** — las tres reglas.
- **`orchestrator`** — el Gate 1 debe exigir el dato de cobertura.

MOC: [[Cecabank]]
