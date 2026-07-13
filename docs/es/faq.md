---
title: FAQ
description: Por qué no usar resume-cli directamente, códigos de salida, y errores comunes.
---

# FAQ

## ¿Por qué no usar directamente resume-cli / resumed / hackmyresume?

Esas herramientas (y `rendercv`) validan y renderizan un único JSON Resume, pero ninguna chequea
**paridad multi-idioma**: que un `resume.en.json` y un `resume.es.json` se mantengan realmente
sincronizados estructural y semánticamente a medida que ambos se editan con el tiempo. Ese vacío
es lo que llena `jsonresume-parity`. `jsonresume-lint` separó los chequeos por archivo (fechas,
URLs, cronología, placeholders) que no requieren un segundo idioma para comparar, y
`jsonresume-tailor` generaliza el problema común de "mantener un currículum base, generar copias
específicas de rol a mano" en una herramienta reutilizable. `jsonresume-execute` no reemplaza a
ninguna. Es una capa de orquestación liviana que detecta e invoca a cualquiera de estas (y a
`resume-cli` mismo, para renderizar) que esté instalada. Ninguna de estas herramientas depende de
las otras; usa la que resuelva tu problema real.

## ¿Qué significan los códigos de salida?

Cada CLI de este repo (`jrl`, `jrp`, `jrt`, `jrx`) sigue la misma convención:

| Código | Significado |
| --- | --- |
| `0` | Limpio: sin errores (los warnings solos nunca hacen fallar una corrida) |
| `1` | Falla de findings/validación: al menos un finding de severidad error |
| `2` | Mal uso: argumentos incorrectos, un archivo faltante, o (para `jrx`) una herramienta requerida que no está instalada |

`jrx check`/`jrx all` agregan los códigos de salida de varias herramientas. El código general es
el peor entre los pasos que realmente corrieron (un paso saltado, como el `audit` ATS sin
`--theme`, no cuenta).

## ¿Por qué la regla `schema` de `jrl` está apagada por defecto?

El schema oficial de JSON Resume restringe varios objetos a un conjunto fijo de propiedades
conocidas. Documentos con campos de extensión personalizados (los propios ejemplos de este repo
usan un `meta.tailor` y `meta.language` no estándar, por ejemplo) pueden fallar la validación
estricta de schema aunque sean perfectamente válidos para su propio propósito. `schema` viene
apagada (`off`) por defecto justamente por eso; actívala explícitamente (`--rule schema=error` o
vía config, consulta [`/reference/config`](/es/reference/config), en inglés) si no extiendes el
schema con campos personalizados.

## ¿Cómo se ve cuando a `jrx` le falta una herramienta?

`jrx` nunca empaqueta ni depende de las herramientas que orquesta. Resuelve cada una desde
`node_modules/.bin` o `PATH` en tiempo de ejecución. Si un comando necesita una que no está
instalada, reporta exactamente qué paquete falta y cómo instalarlo, en vez de fallar en silencio o
a mitad de camino:

```
jsonresume-execute: jsonresume-tailor not found (needed for "Role-tailored resume variants"). Install it with:
  pnpm add -D jsonresume-tailor
```

Esto sale con código `2` (mal uso), igual que cualquier otra invocación incorrecta. Ejecuta `jrx
doctor` en cualquier momento para ver el panorama completo de qué está instalado y qué falta antes
de correr un comando real.
