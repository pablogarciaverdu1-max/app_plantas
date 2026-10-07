# Bocage 44 — instrucciones para Claude Code

Shooter en primera persona, realista, ambientado en Normandía en junio de 1944. Un jugador, una misión. Se juega en el navegador. Título provisional.

## Resultado final

Un único archivo `dist/index.html` que el usuario abre con doble clic y juega, sin instalar nada y sin conexión. Todo el código, los modelos, las texturas y los sonidos van dentro de ese archivo.

## Lee antes de escribir código

1. `docs/01_GDD.md`: qué es el juego y cómo se juega la misión.
2. `docs/03_TECH_SPEC.md`: arquitectura, carpetas y reglas de código.
3. `docs/05_ROADMAP.md`: en qué fase estamos y qué significa "terminado".
4. `docs/02_ART_BIBLE.md` y `docs/04_ASSETS.md` cuando toques algo visual o sonoro.
5. `data/weapons.json`: valores de las armas. Es la fuente de verdad; no los escribas a mano en el código.

## Stack

- TypeScript, Three.js (WebGL 2), Vite. Empaquetado en un solo archivo con `vite-plugin-singlefile`.
- Colisiones y raycasts con `three-mesh-bvh`. Sonido con Web Audio API.
- Tests con Vitest (lógica) y Playwright (el juego en un navegador real).
- Objetivo: 60 fps a 1080p en Chrome y Edge de escritorio, en un portátil con gráfica integrada reciente.

## Cómo trabajar

- Trabaja una fase del roadmap cada vez. No empieces la siguiente hasta cumplir los criterios de la actual.
- Mira tu propio trabajo: después de cada cambio visual, abre el juego con Playwright, haz capturas y compáralas con la biblia de arte antes de decir que está hecho.
- Después de cada cambio: `npm run check` (tipos, tests y compilación). Ver `docs/03_TECH_SPEC.md`, sección Verificación.
- Al terminar cada fase, ejecuta `npm run build` y dile al usuario que abra `dist/index.html` y qué tiene que probar, en pasos numerados y cortos. El usuario no es programador.
- Cada recurso externo que entre al proyecto se apunta en `docs/04_ASSETS.md` con su origen y licencia. Sin licencia clara, no entra.
- Vigila el peso: `dist/index.html` no debe pasar de 40 MB.

## Reglas de realismo (no negociables)

- Balas simuladas con velocidad, caída y tiempo de vuelo. Nada de impacto instantáneo.
- Sin retícula en pantalla, sin minimapa, sin marcadores sobre enemigos, sin regeneración de vida.
- Pocas balas matan, al jugador y a los enemigos.
- El sonido viaja a 343 m/s: un disparo lejano se oye después de verse.
- Armas, uniformes y equipo corresponden a junio de 1944.
- Nada de estética de bloques ni low-poly a propósito. Dentro de lo que permite el navegador, todo debe parecer real: proporciones correctas, materiales PBR, luz física, niebla.

## Contenido

- Tono sobrio. La guerra no se celebra.
- No se usan esvásticas ni símbolos de las SS. Los enemigos son infantería regular alemana; para vehículos y equipo se usa la cruz Balkenkreuz.
- El pueblo, las unidades concretas y los personajes son ficticios.

## Convenciones

- Código, nombres de archivos y comentarios en inglés. Textos visibles para el jugador en español, en una tabla de localización.
- Una clase o módulo por archivo. Sin estado global salvo `GameServices`.
- Commits pequeños, uno por unidad de trabajo, con mensaje que diga qué cambia y por qué.
