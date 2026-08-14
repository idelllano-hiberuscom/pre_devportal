---
tags: [pattern, cecabank, fidelidad]
detectado: 2026-08-14
ocurrencias: 1
candidato_transversal: true
---
# En la rama PROD nadie produce los tokens globales

## Síntoma

Los componentes que se midieron uno a uno salen exactos al píxel. Todo lo demás —titulares,
párrafos, botones, sombras, tipografía— sale con la apariencia del boilerplate de Adobe. El
resultado es un portal que "casi" se parece al original y en el que cada componente nuevo
vuelve a partir de cero.

En este proyecto `styles/styles.css` llegó a la demo **sin tocar**: ni color de marca, ni
escala tipográfica, ni sombras, ni fuentes. No había ningún fichero de fuentes en el repo.

## Causa

No fue descuido de ningún agente: es un hueco estructural del pipeline.

`global-tokens.md` lo produce **`figma-analyst`**, que solo corre en la **rama DEMO**. En la
rama PROD (portal real → `component-architect` → `task-writer` → `eds-developer`) no hay
ningún paso equivalente. Y sin embargo `eds-developer` lo declara como entrada suya:

```
agents/eds-developer.md:27   Entrada: `[nombre-bloque]-instructions.md` + `global-tokens.md`
```

En PROD ese fichero nunca llega. El agente construye cada bloque contra su propia evidencia
y no hay nada que consolide lo común, así que lo común se queda en los valores por defecto.

Agravante: `capture-component-evidence.mjs` mide **por componente**. Nadie agrega. La
auditoría de fidelidad de este proyecto concluyó que **la fidelidad seguía exactamente a la
cobertura de medición**: lo medido salía exacto, lo no medido caía en boilerplate.

## Corrección

Que **`component-architect`** emita `global-tokens.md` agregando la evidencia de todos los
componentes: color, escala tipográfica, interlineados, sombras y radios más repetidos del
portal. Y que sea **artefacto obligatorio del Gate 1**, no opcional.

Consecuencia práctica: un ticket de tokens **antes** que cualquier ticket de componente. Es
el trabajo con más apalancamiento del proyecto entero y en esta demo no lo tuvo nadie
asignado.

## Dónde aplica

- **`component-architect`** — nuevo artefacto de salida.
- **`orchestrator`** — el Gate 1 no cierra sin él.
- **`quality-gate.mjs`** — comprobación barata: si `styles/styles.css` no difiere del
  boilerplate, avisar. No es un fallo de bloque, es un fallo de proyecto.

MOC: [[Cecabank]]
