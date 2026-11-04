# Rubik Paso a Paso

Curso interactivo y gratuito para aprender a resolver el cubo de Rubik, con un cubo 3D en el que giras las capas y ejercicios que desbloquean cada lección.

**Cursos incluidos**

| Curso | Contenido |
|---|---|
| **2×2** | Piezas, notación, primera capa, orientar y colocar la última capa. |
| **3×3** | Desde los centros y la notación hasta resolver el cubo completo por capas. |
| **4×4** | Reducción: centros, emparejar aristas, resolver como un 3×3 y las dos paridades. Se abre al terminar el 3×3. |
| **Avanzado** | F2L, OLL y PLL en dos pasos. Se abre al terminar el 3×3. |

Cada lección tiene objetivo, repaso, pregunta relámpago, explicación, prueba libre y ejercicios. Hay mini-exámenes sin pistas, práctica con cubos mezclados al azar, línea de tiempo para reproducir movimientos y un ajuste para ver qué hace cada notación al tocarla.

## Usarla

Es una sola página, sin dependencias ni compilación: **`index.html`** lleva dentro Three.js y las fuentes.

```bash
# abrirla directamente
xdg-open index.html            # o doble clic en el archivo

# o servirla en local (necesario para instalarla como app)
python3 -m http.server 8000    # y abre http://localhost:8000
```

## Publicarla (GitHub Pages)

1. En el repositorio: **Settings → Pages**.
2. **Source:** *Deploy from a branch* → rama `main`, carpeta `/ (root)`.
3. En un minuto estará en `https://<tu-usuario>.github.io/learnrubikcube/`.

Desde esa dirección (https) se puede **instalar como app** en el móvil o el escritorio y funciona **sin conexión**: el service worker guarda los archivos la primera vez.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La app completa (HTML, CSS y JS). |
| `manifest.webmanifest` | Datos para instalarla como app. |
| `sw.js` | Service worker: caché para usarla sin conexión. |
| `icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | Iconos. |

## Progreso

El progreso se guarda en el navegador (`localStorage`). Para llevártelo a otro dispositivo: **Ajustes → Progreso → Mostrar mi progreso**, copia el texto y pégalo allí en **Cargar desde el cuadro**.

## Cómo se comprobó

Cada ejercicio de resolver se genera con un simulador del cubo que aplica los movimientos de verdad: parte de un estado que no cumple el objetivo y comprueba que la solución propuesta lo cumple. Los algoritmos de cada lección (Sune, A-perm, paridades del 4×4, etc.) se verificaron en ese simulador antes de incluirlos.
