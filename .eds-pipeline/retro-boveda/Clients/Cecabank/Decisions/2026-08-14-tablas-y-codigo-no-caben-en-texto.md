---
tags: [decision, gate, cecabank, xwalk]
fecha: 2026-08-14
gate: 2
---
# Una tabla no cabe en el componente de texto; el código multilínea tampoco en un campo de texto

## Qué propuso el agente

Autorizar la tabla comparativa de la documentación con el **componente de texto nativo**, que
es rich text, sin crear ningún bloque. Y el código de ejemplo en el campo `code` del bloque
`code-block`, declarado como `text`.

## Qué decidió el humano

Ninguna de las dos. Se creó el bloque `table`, y el campo `code` pasó a `richtext` con el
código dentro de un `<pre>`.

## Motivo

Ambas se comprobaron escribiendo el mismo contenido en los dos sitios y leyendo el JCR:

**Tablas.** `core/franklin/components/text/v1/text` **sanea el richtext al guardar**. La
tabla no se pierde en la entrega: llega ya aplanada al nodo.

| Dónde se escribe | Qué queda guardado |
|---|---|
| Nodo `text/v1/text` | `<p>Método Descripción Ventajas…</p>` — aplanado |
| Richtext de un **bloque** | `<table><thead>…` — íntegro |

El saneador respeta `h3`–`h6`, `p`, `ul`, `ol`, `li`, `strong`, `em`, `u`, `a` y `br`. Se come
`<table>` y también `<code>` inline.

**Código.** Un campo `text` plano **pierde los saltos de línea en la entrega**: un `curl` de
quince líneas llegaba en una sola. En `richtext` dentro de un `<pre>` se conserva entero.

## Consecuencia

- Regla: **todo lo que necesite estructura HTML propia va en el richtext de un bloque**, no
  en el componente de texto. Aplica a tablas y a cualquier marcado que el saneador no liste.
- `<code>` inline no sobrevive: se convierte a `<strong>`, que es como el propio portal marca
  los parámetros en el resto del contenido. Degradación aceptada y documentada.
- Efecto lateral que conviene recordar: la entrega convierte `:palabra:` en un icono de EDS.
  En documentación técnica eso destroza coordenadas tipo `com.cecabank.tpv:tpvsdk:4.1.0` — se
  comía el token central. Se neutraliza envolviendo el token para partir el nodo de texto.

MOC: [[Cecabank]]
