---
title: Empieza con un ejemplo
description: ¿Nuevo en JSON Resume? Clona un setup completo y funcionando, y arranca desde ahí.
---

# Empieza con un ejemplo

[JSON Resume](https://jsonresume.org) es un schema abierto y portable para representar un
currículum como un único archivo JSON en vez de un formato de documento propietario. Lo escribes
una vez, y cualquier herramienta compatible (temas oficiales, `resume-cli`, y las cuatro
herramientas de esta suite) puede leerlo. Si esto es nuevo para ti, la forma más rápida de
entenderlo no es leer una spec: es ver uno real.

[`jsonresume-tools-demo`](https://github.com/cdrobayna/jsonresume-tools-demo) es un ejemplo
público y completo: un único currículum base anotado, mantenido en dos idiomas, personalizado en
dos variantes por rol. Son cuatro archivos, generados y validados desde una única fuente, con CI
que verifica que se mantenga así en cada push. Está construido con las cuatro herramientas de
esta suite, conectadas tal como las usaría un setup real.

## Dos formas de usarlo

### Explóralo

```bash
git clone https://github.com/cdrobayna/jsonresume-tools-demo.git
cd jsonresume-tools-demo
```

Sigue el propio README del repo desde ahí: dos comandos te llevan de un clon recién hecho a una
matriz de currículums validada y personalizada por rol. Todavía no necesitas tener tu propio
JSON Resume.

### Arranca el tuyo

[Usa este template](https://github.com/new?template_name=jsonresume-tools-demo&template_owner=cdrobayna)
para crear tu propio repositorio a partir de él, y reemplaza los archivos de currículum y
variantes del ejemplo con tu propia información. Heredas la estructura del proyecto, el chequeo
de CI, y un setup funcionando. Nada que configurar desde cero.

## Siguiente paso

Cuando quieras entender *cómo* funcionan las anotaciones detrás del tailoring (etiquetar
entradas, declarar variantes, construir la matriz a mano), recorre el
[tutorial de flujo completo](/es/guide/full-workflow).
