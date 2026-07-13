---
layout: home

hero:
  name: jsonresume-tools
  text: Herramientas independientes para JSON Resume
  tagline: Tu currículum se mantiene sincronizado entre idiomas, se adapta a cada rol y se valida solo. Todo con una sola CLI.
  actions:
    - theme: brand
      text: Primeros pasos
      link: /es/guide/getting-started
    - theme: alt
      text: Míralo todo funcionando junto
      link: /es/guide/full-workflow

features:
  - title: En sintonía
    details: Compara tu currículum en cada idioma y avisa si una sección quedó desactualizada o sin traducir, antes de que lo notes.
    link: /es/reference/parity
  - title: A medida
    details: Etiqueta cada entrada una sola vez y genera tantas variantes por rol como necesites, sin mantener copias a mano.
    link: /es/reference/tailor
  - title: Sin errores
    details: "Chequeos de calidad por archivo: fechas, URLs, cronologías y placeholders. Útil en cualquier JSON Resume individual."
    link: /es/reference/lint
  - title: Todo en uno
    details: Un solo comando te lleva del currículum anotado al PDF listo para enviar, validado y exportado con resume-cli.
    link: /es/reference/execute
---

## ¿Qué es JSON Resume?

[JSON Resume](https://jsonresume.org) es un schema abierto, mantenido por la comunidad, para representar un
currículum como un único archivo JSON en lugar de un formato de documento propietario. Una vez que
un currículum tiene la forma de JSON Resume, cualquier herramienta compatible puede leerlo: los
temas oficiales lo renderizan a HTML/PDF, y
[`resume-cli`](https://github.com/jsonresume/jsonresume.org) (la CLI oficial) lo valida, exporta y
sirve de fábrica.

Las cuatro herramientas de este sitio se conectan entre sí para cubrir los flujos que las
herramientas oficiales no resuelven: mantener un currículum sincronizado entre idiomas,
personalizarlo por rol desde una sola fuente, y orquestar todo eso, incluido `resume-cli`, a
medida que crece el número de currículums base y variantes.

¿Todavía no tienes un JSON Resume? Consulta la
[referencia del schema](https://jsonresume.org/schema.json) para escribir uno a mano, o ve
directo a [primeros pasos](/es/guide/getting-started).

<!--
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
-->

## Por qué existe

Si alguna vez mantuviste un currículum en más de un idioma, o lo adaptaste para más de una
búsqueda laboral, seguramente reconoces el problema: cada copia extra es una oportunidad más de
que algo quede desactualizado, mal traducido, o simplemente roto.

Empecé a resolver esto con un script personal, después de ver que ningún proyecto del ecosistema
JSON Resume (resumed, hackmyresume, resume-cli, rendercv) lo cubría. Con el tiempo lo generalicé
en las cuatro herramientas de este repo.

Antes, mi flujo era manual de punta a punta: actualizaba el currículum en inglés, después
replicaba el cambio a mano en el de español, cuando me acordaba. Si estaba postulando a un rol de
backend y a otro de platform, mantenía copias separadas con distintos highlights, y corregía cada
una por su cuenta. Antes de exportar, repasaba fechas, URLs y placeholders a simple vista, y
corría cada paso en el orden correcto, cada vez.

Hoy ese mismo flujo cabe en un solo comando: anoto cada entrada una vez, con las etiquetas de
idioma y rol que necesito, y el resto se arma solo. No resuelve nada que no pudiera hacer a mano,
simplemente automatiza lo que ya hacía. Decidí publicarlo como código abierto por si le ahorra ese
mismo trabajo a alguien más manteniendo un currículum bilingüe o adaptado a distintos roles.
