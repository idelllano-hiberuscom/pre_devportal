---
tags: [pattern, cecabank, evidencia]
detectado: 2026-08-14
ocurrencias: 1
candidato_transversal: true
---
# La evidencia visual se captura pero no se lee

## Síntoma

Bloques construidos "según contrato" que no se parecen al original en lo que el contrato no
tabuló: composición, proporciones, qué va al lado de qué. El caso más claro fue el hero de
las páginas de integración: en el portal lleva cuatro tarjetas blancas solapando la
fotografía (el portal lo llama literalmente `hero-with-cards`), y eso **no está en ninguna
tabla de medidas** — solo se ve mirando la captura.

## Causa

Dos problemas encadenados.

**1. Leer la captura es una recomendación, no un requisito.**
`eds-developer.md` dice *"Abre las capturas — no son decorativas"*, pero nada verifica que se
haya hecho. Un agente puede completar su tarea entera sin abrir un solo `.png` y su salida
pasa todos los gates.

**2. La captura de estilos está capada por número.**

```
scripts/capture-component-evidence.mjs:213   [...interesting].slice(0, 30)
```

Se miden como mucho **30 descendientes**, y solo los que casan con una lista fija de
selectores. Todo lo que caiga fuera no tiene medida, y sin medida el desarrollador aplica el
valor por defecto del boilerplate. La auditoría de fidelidad de este proyecto concluyó que
**la fidelidad seguía exactamente a la cobertura de medición**.

## Corrección

- **Obligar la lectura de las imágenes.** El desarrollador debe declarar en su salida qué
  ficheros de `.eds-pipeline/assets/<bloque>/` ha abierto (`desktop.png`, `mobile.png`,
  `*-context.jpg`) y describir en una línea la **composición** que ve, no las medidas. Sin
  esa declaración, el gate rechaza. Es barato de verificar y obliga a mirar.
- **Quitar el tope de 30.** Que el criterio sea el contenido: todo descendiente con texto
  propio o con caja distinta de la del padre. Sin tope fijo.
- **Capturar el contexto, no solo el recorte.** Las imágenes `*-context.jpg` existen justo
  para ver la relación del bloque con lo que tiene alrededor — que es lo que se perdió en el
  hero. Deben ser de lectura obligatoria cuando el bloque toca a otro.

## Dónde aplica

- **`eds-developer`** — declaración obligatoria de capturas leídas.
- **`ue-qa-specialist`** — rechazar la entrega que no la trae.
- **`capture-component-evidence.mjs`** — quitar el `slice(0, 30)`.

MOC: [[Cecabank]]
