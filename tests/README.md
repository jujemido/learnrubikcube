# Pruebas

Red de seguridad para cambiar la app sin romper nada. Se ejecutan contra **`index.html`** tal cual está en el repositorio; no hace falta compilar nada.

## Ejecutarlas

```bash
cd tests
npm install                 # una vez: instala Playwright
npx playwright install chromium   # una vez: descarga el navegador

npm test                    # todo (≈ 2 min)
npm run test:logic          # solo el contenido de los cursos (segundos, sin navegador)
npm run test:ui             # solo la interfaz
npm run test:offline        # solo la versión instalable / sin conexión
```

Salen con código distinto de 0 si algo falla, así que valen para un paso de CI.

Para probar otro archivo (por ejemplo una versión en desarrollo):

```bash
RUBIK_HTML=/ruta/a/otro.html npm test
```

## Qué comprueban

| Archivo | Qué cubre |
|---|---|
| `logic.test.js` | Los 4 cursos sin navegador: todos los movimientos son válidos, cada ejercicio de «resolver» parte de un cubo sin resolver, su solución cumple el objetivo y **resalta lo que falta** (`hl: 'g:objetivo'`), las páginas de «Aprende» tienen texto y movimientos válidos, una capa del medio o un giro del cubo no vale como solución de la flor, las preguntas de elegir tienen respuesta entre sus opciones y los mini-exámenes tienen 10 ejercicios. |
| `ui.test.js` | Gestos (girar capa, 90° y 180°, mantener pulsado, dos dedos, **clic derecho y teclas X/Y/Z en el ordenador**, límites del zoom), lecciones nuevas (M, E y S; x, y y z con práctica real), objetivo y leyenda del resaltado en los ejercicios, pistas coherentes con la botonera visible, páginas de F2L, 2×2 y 4×4, deshacer y rehacer, secuencia fusionada (`R R` → `R2`), ejercicios con medios giros, botonera, retomar lecciones y mini-exámenes, rayitas de pasos, pregunta relámpago sin saltar, pantalla de lección completada, ajustes (sonido, velocidad, exportar e importar) y que no haya errores de JavaScript. |
| `offline.test.js` | Manifiesto e iconos, color de la barra de estado en claro y oscuro, service worker, y que la app abre **sin conexión** y sin pedir nada a internet. |

## Cómo funcionan

`lib.js` abre una **copia temporal** de `index.html` con un pequeño gancho (`window.__T`) justo antes de arrancar la app. Así las pruebas pueden mirar el estado interno (paso actual, historial de movimientos…) sin tocar `index.html`.

Cada caso de `ui.test.js` arranca la app desde cero con el progreso justo que necesita (`openLesson`), así que no dependen unos de otros.

## Al añadir una función

1. Añade un caso en `ui.test.js` (o en `logic.test.js` si es contenido).
2. Comprueba que **falla** sin tu cambio: una prueba que nunca falla no protege nada.
3. Si necesitas ver más estado interno, añade una función al gancho de `lib.js`.

## Límites

Simulan ratón y dedos con eventos, pero **no sustituyen probar en un móvil real**: el tacto, la vibración, el sonido y los tiempos «a mano» (como los 0,18 s de mantener pulsado) solo se notan en un dispositivo.
