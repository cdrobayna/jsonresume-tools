---
title: Primeros pasos
description: Instala solo lo que necesitas y ejecuta tu primer chequeo.
---

# Primeros pasos

Cada herramienta de este repo es independiente e instalable por separado — instala solo la que
necesitas, ignora el resto. Si no estás seguro/a de cuál es, consulta
[¿qué herramienta necesito?](/es/guide/which-tool).

## Instala solo lo que necesitas

```bash
npm install --save-dev jsonresume-lint      # jrl — chequeos de calidad por archivo
npm install --save-dev jsonresume-parity    # jrp — paridad multi-idioma
npm install --save-dev jsonresume-tailor    # jrt — variantes por rol
npm install --save-dev jsonresume-execute   # jrx — orquesta las tres anteriores
```

`jsonresume-execute` (`jrx`) es la única excepción a "independiente, sin dependencias entre
sí": es una capa de orquestación liviana que *detecta* las otras herramientas (y `resume-cli`) en
tiempo de ejecución y las invoca. No las empaqueta ni depende de ellas, y ellas no tienen ningún
conocimiento de `jrx` — sáltatela si solo necesitas una herramienta a la vez. Si la instalas,
ejecuta `jrx doctor` para ver qué herramientas ya puede encontrar y `jrx setup` para instalar el
resto:

```bash
npx jrx doctor
```

```
✓ jsonresume-lint (0.1.1) — path — node_modules/.bin/jsonresume-lint
✓ jsonresume-parity (0.1.1) — path — node_modules/.bin/jsonresume-parity
✓ jsonresume-tailor (0.1.1) — path — node_modules/.bin/jsonresume-tailor
✗ resume-cli — not found (Official JSON Resume CLI (validate/export/audit))
    install: pnpm add -D resume-cli

✗ Chromium/Chrome — not found (needed by `resume export`/`resume audit`)
    install: your OS package manager, or set PUPPETEER_EXECUTABLE_PATH

1 tool(s) missing. Run "jrx setup" to install them.
```

## Tu primer resume.json

Si todavía no tienes uno, empieza desde el [schema de JSON Resume](https://jsonresume.org) — un
archivo mínimo se ve así:

```json
{
  "basics": {
    "name": "Tu Nombre",
    "email": "tu@ejemplo.com",
    "summary": "Un resumen breve de lo que haces."
  },
  "work": [
    {
      "name": "Empresa",
      "position": "Tu Puesto",
      "startDate": "2023-01",
      "highlights": ["Qué entregaste o de qué te encargaste."]
    }
  ]
}
```

## Ejecuta tu primer chequeo

```bash
npx jsonresume-lint resume.json
```

Un currículum limpio imprime un resumen sin errores ni warnings:

```
resume.json
Summary: 0 error(s), 0 warning(s)
```

Los códigos de salida siguen la misma convención en todas las herramientas de este repo: `0`
limpio, `1` hay findings/falla de validación, `2` mal uso (argumentos incorrectos, archivo
faltante, o — para `jrx` — una herramienta requerida que falta). Los warnings solos nunca hacen
fallar la corrida.

## Próximos pasos

- ¿Mantienes un currículum en más de un idioma? Consulta
  [¿qué herramienta necesito?](/es/guide/which-tool) para `jsonresume-parity`.
- ¿Quieres variantes por rol (backend, platform, ...) desde un único master, entre idiomas, en un
  solo comando? Recorre el [tutorial de flujo completo](/es/guide/full-workflow).
