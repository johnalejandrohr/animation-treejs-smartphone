# KYVEN K1 — The Smartphone of 2035

[English](../README.md) · **Español**

Experiencia web interactiva en 3D que recorre un smartphone conceptual del año 2035, desde su exterior hasta un único átomo de silicio, renderizada en tiempo real en el navegador con [three.js](https://threejs.org/).

> KYVEN K1 es una marca ficticia. El proyecto no usa marcas ni nombres comerciales reales.

## El recorrido

La narrativa avanza con el scroll a través de cinco niveles de escala, al estilo *powers of ten*:

| Nivel | Mundo | Qué se ve |
|---|---|---|
| 01 | **Exterior** | El teléfono en un estudio fotográfico, con vista despiezada de sus capas |
| 02 | **Internal** | Placa lógica, SoC, memoria, batería, refrigeración líquida, sensores, antenas y cámara |
| 03 | **Processor** | El interior del die KV1: floorplan y seis capas de interconexión de cobre con pulsos de datos |
| 04 | **Transistor** | Un transistor *gate-all-around* con tres nanosheets de silicio |
| 05 | **Atom** | La red cristalina del silicio y un átomo estilizado (14 protones, capas 2·8·4) |

Al final, el átomo se disuelve en partículas de datos que se recomponen en circuitos, el chip, la placa y de nuevo el teléfono.

## Modos

- **Story** (por defecto): el scroll controla la línea de tiempo de la historia.
- **Auto demo**: reproduce el recorrido completo de forma automática.
- **Explore**: rotación libre, zoom, despiece y selección de componentes para ver sus especificaciones.

## Controles

| Acción | Entrada |
|---|---|
| Avanzar / retroceder | Scroll, `↓` / `↑`, `PageDown` / `PageUp`, `Espacio` / `Shift+Espacio` |
| Ir al inicio / al final | `Home` / `End` |
| Auto demo | `D` |
| Modo explorar | `E` |
| Despiezar (en explorar) | `X` |
| Ocultar la interfaz | `H` |
| Salir / cerrar | `Esc` |
| Rotar | Arrastrar |
| Zoom | Pellizcar o `Ctrl` + rueda |

## Ejecutar en local

No hay dependencias ni paso de compilación: three.js se carga desde jsDelivr mediante un *import map*. Basta con servir la carpeta con cualquier servidor estático:

```bash
# Python
python3 -m http.server 8000

# o Node
npx serve .
```

Y abrir <http://localhost:8000>. Requiere un navegador con soporte para WebGL 2 y conexión a internet (para three.js y las fuentes de Google Fonts).

## Despliegue

El sitio está preparado para [Vercel](https://vercel.com/) como sitio estático (`framework: null`). `vercel.json` activa `cleanUrls` y añade las cabeceras `X-Content-Type-Options` y `Referrer-Policy`; `.vercelignore` excluye archivos locales.

```bash
vercel        # preview
vercel --prod # producción
```

**Caché:** los scripts y la hoja de estilos se cargan con un parámetro `?v=N` en `index.html`. Tras cambiar código o textos, incrementa ese número para que los navegadores no muestren versiones antiguas.

## Estructura

```
index.html          HUD, import map y orden de carga de los scripts
css/style.css       Estilos de la interfaz
js/
  nx.js             Namespace NX, registro de módulos y utilidades matemáticas
  app.js            Arranque, bucle de render y modos story / explore / demo
  director.js       Línea de tiempo de la historia y poses de cámara del teléfono
  journey.js        Trayectorias de cámara entre mundos y transiciones de escala
  stage.js          Orquestación por fotograma: mundos, cámaras, fundidos, etiquetas
  input.js          Scroll, arrastre con inercia, zoom, picking y atajos de teclado
  ui.js             HUD: niveles, escala, subtítulos, panel de componente, etiquetas 3D
  post.js           Post-procesado: fundido entre mundos, bloom y grading fílmico
  shaders.js        Fragmentos GLSL compartidos, uniforms globales y materiales
  textures.js       Texturas procedurales en canvas (sin assets externos)
  env.js            Entornos de iluminación procedurales (PMREM), polvo y haces
  traces.js         Enrutador de pistas Manhattan/45° y pulsos de datos
  phone*.js         Geometría, materiales, componentes internos y efectos del teléfono
  world-phone.js    Mundo 0 — el teléfono en el estudio
  world-chip.js     Mundo 1 — el interior del die
  world-transistor.js  Mundo 2 — el transistor GAA
  world-atom.js     Mundo 3 — cristal y átomo de silicio
  world-data.js     Mundo 4 — el regreso: partículas de datos hasta el teléfono
```

### Arquitectura

- Cada archivo es un *classic script* que registra una fábrica con `NX.def(nombre, fábrica)`. Cuando three.js termina de cargar, `NX.init(THREE, addons)` ejecuta las fábricas en orden y cada módulo queda disponible como `NX.<nombre>`. Por eso el orden de los `<script>` en `index.html` importa.
- Todo lo visual es una función pura del tiempo de la historia `T ∈ [0, 1]` (más la animación ambiental), de modo que el scroll, la auto demo y el viaje por el SoC comparten el mismo código.
- Cada mundo vive en su propia escena y se enlaza con el anterior mediante una matriz de incrustación, lo que permite fundir dos renders alineados durante las transiciones.
- Todas las texturas y reflejos se generan proceduralmente: el proyecto no incluye imágenes, modelos ni HDRs.
- En móviles o equipos con ≤ 4 núcleos se usa un perfil de calidad reducido (sin sombras, menos partículas, menor resolución y MSAA).
