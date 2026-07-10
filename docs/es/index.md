---
layout: home

hero:
  name: jsonresume-tools
  text: Herramientas independientes para JSON Resume
  tagline: Mantén un currículum en paridad entre idiomas, personalízalo por rol desde un único master, y orquesta todo — incluyendo el propio resume-cli — con una sola CLI.
  actions:
    - theme: brand
      text: Ver el flujo completo
      link: /es/guide/full-workflow
    - theme: alt
      text: Ver en GitHub
      link: https://github.com/cdrobayna/jsonresume-tools

features:
  - title: Parity
    details: El vacío que ningún otro proyecto del ecosistema JSON Resume cubre — paridad estructural y de contenido entre variantes de idioma de un currículum, para que resume.en.json y resume.es.json nunca se desincronicen en silencio.
    link: /es/reference/parity
  - title: Tailor
    details: Genera variantes de currículum por rol (backend, platform, ...) desde un único master anotado — se acabaron las copias resume.backend.json mantenidas a mano.
    link: /es/reference/tailor
  - title: Lint
    details: Chequeos de calidad por archivo — fechas, URLs, cronología, placeholders sin borrar. Útil en cualquier JSON Resume individual.
    link: /es/reference/lint
  - title: Execute
    details: La CLI unificada que orquesta las tres herramientas anteriores — arma la matriz completa de rol x idioma, la valida, y maneja resume-cli por ti (lo detecta, te dice qué falta, exporta a PDF/HTML) en un solo comando.
    link: /es/reference/execute
---

## ¿Qué es JSON Resume?

[JSON Resume](https://jsonresume.org) es un schema abierto y comunitario para representar un
currículum como un único archivo JSON en vez de un formato de documento propietario. Una vez que
un currículum tiene la forma de JSON Resume, cualquier herramienta compatible puede leerlo: los
temas oficiales lo renderizan a HTML/PDF, y
[`resume-cli`](https://github.com/jsonresume/jsonresume.org) (la CLI oficial) lo valida, exporta y
sirve de fábrica.

Las cuatro herramientas de este sitio se conectan por encima, para los flujos que las
herramientas oficiales no cubren: mantener un currículum sincronizado entre idiomas,
personalizarlo por rol desde un único master, y orquestar todo eso — más `resume-cli` — a medida
que crece el número de masters y variantes.

¿Todavía no tienes un JSON Resume? Consulta la
[referencia del schema](https://jsonresume.org/schema.json) para escribir uno a mano, o ve
directo a [primeros pasos](/es/guide/getting-started).

## Míralo en acción

Una entrada, anotada una sola vez en el master:

```json
{
  "name": "Solstice Retail",
  "position": "Ingeniera de Backend y Plataforma",
  "highlights": [
    "Construí el servicio de checkout que absorbió el pico de tráfico del Black Friday.",
    "Introduje despliegues blue-green, eliminando el tiempo de inactividad del checkout durante releases.",
    "Escribí los manuales de guardia que el equipo de infraestructura todavía usa hoy."
  ],
  "meta": {
    "tailor": {
      "tags": ["backend", "platform"],
      "highlightTags": { "backend": [0, 1], "platform": [1, 2] }
    }
  }
}
```

Un `jrx build --out-dir dist` después, esta misma entrada sobrevive en ambos outputs
tailored — con un par distinto de highlights en cada uno:

**`backend.es.json`**
- Construí el servicio de checkout que absorbió el pico de tráfico del Black Friday.
- Introduje despliegues blue-green, eliminando el tiempo de inactividad del checkout durante releases.

**`platform.es.json`**
- Introduje despliegues blue-green, eliminando el tiempo de inactividad del checkout durante releases.
- Escribí los manuales de guardia que el equipo de infraestructura todavía usa hoy.

Cada otra sección (`work`, `skills`, `education`, ...) recibe el mismo filtrado por tags, y
`jsonresume-parity` chequea que todo esto se mantenga sincronizado con la traducción al inglés en
todo momento. Nada de lo anterior es un mockup — es output real de `docs/examples/` en este repo.
Consulta el [tutorial de flujo completo](/es/guide/full-workflow) para ejecutarlo tú mismo.

## Origen

Esta colección empezó como un validador de propósito único mantenido en un repo personal de CV
bilingüe (EN/ES). Ninguna herramienta existente en el ecosistema JSON Resume (resumed,
hackmyresume, resume-cli, rendercv) chequea paridad multi-idioma — `jsonresume-parity` llena ese
vacío. `jsonresume-lint` separó los chequeos por archivo que no dependen de comparar dos idiomas.
`jsonresume-tailor` generaliza un script ad hoc de ese mismo repo de CV en una herramienta
reutilizable para generar variantes de currículum por rol. `jsonresume-execute` une las tres para
los flujos que necesitan más de una a la vez.
