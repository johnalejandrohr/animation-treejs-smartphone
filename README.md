# KYVEN K1 — The Smartphone of 2035

**English** · [Español](es/README.md)

An interactive 3D web experience that explores a concept smartphone from 2035, from its exterior all the way down to a single silicon atom, rendered live in the browser with [three.js](https://threejs.org/).

> KYVEN K1 is a fictional brand. The project uses no real brands or trade names.

## The journey

The story advances as you scroll through five levels of scale, in the style of *powers of ten*:

| Level | World | What you see |
|---|---|---|
| 01 | **Exterior** | The phone in a photo studio, with an exploded view of its layers |
| 02 | **Internal** | Logic board, SoC, memory, battery, liquid cooling, sensors, antennas and camera |
| 03 | **Processor** | Inside the KV1 die: floorplan and six copper interconnect layers carrying data pulses |
| 04 | **Transistor** | A gate-all-around transistor with three silicon nanosheets |
| 05 | **Atom** | The silicon crystal lattice and a stylised atom (14 protons, 2·8·4 shells) |

At the end, the atom dissolves into data particles that reassemble into circuits, the chip, the board and finally the phone again.

## Modes

- **Story** (default): scrolling drives the story timeline.
- **Auto demo**: plays the whole journey automatically.
- **Explore**: free rotation, zoom, disassembly and component selection to view their specs.

## Controls

| Action | Input |
|---|---|
| Forward / back | Scroll, `↓` / `↑`, `PageDown` / `PageUp`, `Space` / `Shift+Space` |
| Jump to start / end | `Home` / `End` |
| Auto demo | `D` |
| Explore mode | `E` |
| Disassemble (in explore) | `X` |
| Hide the UI | `H` |
| Exit / close | `Esc` |
| Rotate | Drag |
| Zoom | Pinch or `Ctrl` + wheel |

## Running locally

There are no dependencies and no build step: three.js is loaded from jsDelivr through an *import map*. Just serve the folder with any static server:

```bash
# Python
python3 -m http.server 8000

# or Node
npx serve .
```

Then open <http://localhost:8000>. Requires a browser with WebGL 2 support and an internet connection (for three.js and Google Fonts).

## Deployment

The site is set up for [Vercel](https://vercel.com/) as a static site (`framework: null`). `vercel.json` enables `cleanUrls` and adds the `X-Content-Type-Options` and `Referrer-Policy` headers; `.vercelignore` excludes local files.

```bash
vercel        # preview
vercel --prod # production
```

**Caching:** scripts and the stylesheet are loaded with a `?v=N` query in `index.html`. After changing code or copy, bump that number so browsers don't show stale versions.

## Structure

```
index.html          HUD, import map and script load order
css/style.css       UI styles
js/
  nx.js             NX namespace, module registry and math utilities
  app.js            Boot, render loop and story / explore / demo modes
  director.js       Story timeline and phone camera poses
  journey.js        Camera paths between worlds and scale transitions
  stage.js          Per-frame orchestration: worlds, cameras, cross-fades, labels
  input.js          Scroll, drag with inertia, zoom, picking and keyboard shortcuts
  ui.js             HUD: levels, scale readout, captions, component panel, 3D labels
  post.js           Post-processing: world cross-fade, bloom and filmic grade
  shaders.js        Shared GLSL chunks, global uniforms and materials
  textures.js       Procedural canvas textures (no external assets)
  env.js            Procedural lighting environments (PMREM), dust and light shafts
  traces.js         Manhattan/45° trace router and data pulses
  phone*.js         Phone geometry, materials, internal components and effects
  world-phone.js    World 0 — the phone in the studio
  world-chip.js     World 1 — inside the die
  world-transistor.js  World 2 — the GAA transistor
  world-atom.js     World 3 — silicon crystal and atom
  world-data.js     World 4 — the return: data particles back to the phone
```

### Architecture

- Each file is a *classic script* that registers a factory with `NX.def(name, factory)`. Once three.js has loaded, `NX.init(THREE, addons)` runs the factories in order and each module becomes available as `NX.<name>`. That's why the order of the `<script>` tags in `index.html` matters.
- Everything visual is a pure function of the story time `T ∈ [0, 1]` (plus ambient animation), so scrolling, the auto demo and the SoC journey share the same code path.
- Each world lives in its own scene and is linked to its parent through an embedding matrix, so two aligned renders can cross-fade during transitions.
- All textures and reflections are generated procedurally: the project ships no images, models or HDRs.
- On mobile or machines with ≤ 4 cores a reduced quality tier is used (no shadows, fewer particles, lower resolution and MSAA).
