# CLAUDE.md — Rubik Paso a Paso

App web para aprender a resolver el cubo de Rubik (2×2, 3×3, 4×4, Avanzado y Training). Un solo `index.html` sin dependencias, desplegado en Netlify al hacer push a `main`. Tests en `tests/` (`npm test`).

## Reglas fijas del dueño

1. **Nunca se pide nada que aún no se haya enseñado.** Ningún ejercicio, pregunta, mini-examen ni examen final puede exigir una letra, un símbolo, un algoritmo, una técnica o un concepto que no se explique en esa lección o en una anterior. Esto vale aunque se creen lecciones nuevas. El test `tests/curriculum.test.js` lo comprueba; si añades una lección o un algoritmo, registra en sus tablas dónde se enseña. Si el test falla, se arregla el contenido, no el test.
2. **Todo lo que el dueño señale en una lección se revisa en TODAS las demás.** Lo normal es que mencione un caso en una lección concreta, pero se busca el mismo problema en las lecciones anteriores y posteriores, y en los otros cursos (2×2, 3×3, 4×4, Avanzado, Training, exámenes). Se corrige todo a la vez y se resume qué otras lecciones tenían lo mismo. Si es un patrón que se puede detectar solo, se añade un test.
3. **Flujo de trabajo:** desplegar primero (merge/push a `main`, subir la versión de caché en `sw.js`), luego pasar los tests, y si algo falla, corregir y volver a desplegar.
4. No crear PRs salvo petición. No borrar ramas remotas salvo petición.
5. Los atajos (botones «Atajos») se mantienen. El resaltado gris es el normal; color completo y marco magenta solo en «Algoritmo completo» y en los finales. El selector «Repetir» sigue oculto tras `SHOW_MACRO_REPEAT`.
6. Idioma: español, claro y breve.
