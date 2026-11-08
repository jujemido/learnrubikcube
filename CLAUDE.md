# CLAUDE.md — Rubik Paso a Paso

App web para aprender a resolver el cubo de Rubik (2×2, 3×3, 4×4, Avanzado y Training). Un solo `index.html` sin dependencias, desplegado en Netlify al hacer push a `main`. Tests en `tests/` (`npm test`).

## Reglas fijas del dueño

1. **Nunca se pide nada que aún no se haya enseñado.** Ningún ejercicio, pregunta, mini-examen ni examen final puede exigir una letra, un símbolo, un algoritmo, una técnica o un concepto que no se explique en esa lección o en una anterior. Esto vale aunque se creen lecciones nuevas. El test `tests/curriculum.test.js` lo comprueba; si añades una lección o un algoritmo, registra en sus tablas dónde se enseña. Si el test falla, se arregla el contenido, no el test.
2. **Todo lo que el dueño señale en una lección se revisa en TODAS las demás.** Lo normal es que mencione un caso en una lección concreta, pero se busca el mismo problema en las lecciones anteriores y posteriores, y en los otros cursos (2×2, 3×3, 4×4, Avanzado, Training, exámenes). Se corrige todo a la vez y se resume qué otras lecciones tenían lo mismo. Si es un patrón que se puede detectar solo, se añade un test.
3. **Flujo de trabajo:** desplegar primero (merge/push a `main`, subir la versión de caché en `sw.js`), luego pasar los tests, y si algo falla, corregir y volver a desplegar.
4. No crear PRs salvo petición. No borrar ramas remotas salvo petición.
5. Los atajos (botones «Atajos») se mantienen. El resaltado gris es el normal; color completo y marco magenta solo en «Algoritmo completo» y en los finales. El selector «Repetir» sigue oculto tras `SHOW_MACRO_REPEAT`.
6. **El tutorial del visor se mantiene al día.** La primera lección de cada curso (`U3`, `U2`, `U4`, `UA`, opcionales) enseña cómo usar el visor: mover, deshacer/rehacer/reiniciar, pista, ojo, ayuda «?», modo completo, atajos, línea de tiempo y ajustes. Cada vez que se añada, quite o cambie un botón o gesto del visor, hay que actualizar ese tutorial; `tests/logic.test.js` falla si hay un control del visor que el tutorial no explica.
7. El botón de pista (bombilla y «Pista») solo se muestra si el ejercicio tiene pista. Al acertar, «¡Bien!» y «Siguiente» quedan pegados abajo, siempre a la vista.
8. Idioma: español, claro y breve.

## Cómo está organizado el código (`index.html`)

Un solo archivo, con el script dividido en bloques. Al añadir algo, se reutiliza la pieza que ya existe en vez de copiar HTML:

- **Marcas `LOGIC-START … LOGIC-END` y `DATA-START … DATA-END`**: la lógica del cubo y los cursos (datos). Los tests cortan ese trozo y lo ejecutan sin navegador.
- **`ICONS` / `icon(nombre)` / `data-icon`**: todos los iconos salen de un único mapa. Un botón nuevo con icono se escribe `<span data-icon="nombre">` en el HTML o `icon('nombre')` en el script, y su dibujo se añade a `ICONS`.
- **`UI`**: componentes de HTML del panel (`UI.btn`, `UI.primary`, `UI.row`, `UI.actions`, `UI.fb`, `UI.note`, `UI.opts`, `UI.sticky`, `UI.meta`, `UI.eyebrow`). No se escribe `<button class="btn …">` a mano en las plantillas.
- **`RENDER`**: un renderizador por tipo de paso (`intro`, `recap`, `quick`, `learn`, `try`, `exercise`, `done`). `EXBODY` tiene el cuerpo de cada tipo de ejercicio (`do`, `solve`, `write`, `choice`) y `exActions` sus botones. `renderPanel` solo elige cuál usar.
- **`ACTIONS`**: una función por botón del panel (`data-act`). Un botón nuevo = su `data-act` + su entrada aquí.
- **Tarjetas**: `goalNote` (objetivo + leyenda) y `seqCard` (atajos + «Tu secuencia») usan la clase `.card`; la leyenda usa `.legrow`.

