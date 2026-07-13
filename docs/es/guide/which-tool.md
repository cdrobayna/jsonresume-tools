---
title: ¿Qué herramienta necesito?
description: "Guía de decisión: tengo un currículum, quiero X."
---

# ¿Qué herramienta necesito?

¿Todavía no tienes un JSON Resume? Consulta
[empieza con un ejemplo](/es/guide/start-with-an-example) en su lugar.

Tienes un JSON Resume. ¿Qué estás tratando de hacer con él?

| Quiero...                                                                            | Usa                                                  |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Detectar fechas rotas, URLs/email inválidos, placeholders sin borrar en **un** archivo | [`jrl`](/es/reference/lint) (jsonresume-lint)           |
| Mantener `resume.en.json` y `resume.es.json` sincronizados entre sí                    | [`jrp`](/es/reference/parity) (jsonresume-parity)       |
| Generar una variante backend/platform/lo-que-sea desde **un** único currículum base    | [`jrt`](/es/reference/tailor) (jsonresume-tailor)       |
| Hacer todo lo anterior para cada rol **y** cada idioma, en un solo comando             | [`jrx`](/es/reference/execute) (jsonresume-execute)     |

## En más detalle

### `jrl` (jsonresume-lint)

Chequeos por archivo que no dependen de comparar nada más: formato de fecha ISO, cronología
inversa, URLs/email válidos, marcadores `TODO`/`FIXME` sin borrar, y validación estricta de
schema opcional. Úsalo en cada JSON Resume que tengas, incluso si mantienes un solo archivo en un
solo idioma.

### `jrp` (jsonresume-parity)

Paridad estructural y de contenido entre variantes de idioma del *mismo* currículum: misma forma,
campos no traducibles idénticos (fechas, URLs, emails, keywords), y heurísticas de calidad de
traducción (ratios de longitud sospechosos, strings que parecen sin traducir). Solo relevante una
vez que mantienes más de un idioma del mismo currículum.

### `jrt` (jsonresume-tailor)

Genera variantes por rol desde un único currículum base anotado: etiqueta entradas de
`work`/`skills`/etc. bajo `meta.tailor`, declara una variante por rol objetivo, y
`jrt build <variant>` emite un currículum filtrado y canónico, sin rastro de `tailor` en él.
Úsalo cuando te canses de mantener a mano copias separadas de `resume.backend.json` /
`resume.devops.json`.

### `jrx` (jsonresume-execute)

Una capa de orquestación sobre las tres herramientas anteriores (más `resume-cli`). Una vez que
estás personalizando un currículum para varios roles **y** manteniéndolo en varios idiomas, `jrx
build` genera la matriz completa `{role}.{lang}.json` en un solo comando en vez de un `jrt build`
por idioma, y `jrx check` corre todos los validadores contra los currículums base y la matriz en
una sola pasada. Consulta el [tutorial de flujo completo](/es/guide/full-workflow) para un
ejemplo completo, de punta a punta.
