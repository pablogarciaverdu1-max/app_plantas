# Especificación técnica

## Proyecto

- Node.js 20 o superior. TypeScript en modo estricto.
- Dependencias: `three`, `three-mesh-bvh`. Desarrollo: `vite`, `vite-plugin-singlefile`, `vitest`, `@playwright/test`, `typescript`.
- Sin motores de física ni de navegación externos: colisiones con BVH y navegación propia (ver IA).
- Git para control de versiones. `node_modules` y `dist` fuera del repositorio.

## Entrega en un solo archivo

- `npm run build` genera `dist/index.html` con todo dentro: JavaScript, CSS, modelos, texturas y sonidos incrustados en base64.
- Debe funcionar abierto con doble clic (`file://`), sin servidor y sin red. Por eso: nada de `fetch` a archivos externos, nada de CDN, nada de workers o WASM cargados desde archivo aparte.
- Los recursos se importan en el código (`import url from './x.glb?inline'`) y se cargan desde su data URL.
- Presupuesto de peso: 40 MB como máximo. Informa del tamaño en cada compilación.
- El juego empieza con una pantalla "Haz clic para jugar": el navegador exige un clic para capturar el ratón y activar el sonido.

## Carpetas

```
src/
  core/      GameLoop, GameServices, EventBus, SaveSystem, Settings, Input
  player/    PlayerController, Stance, Lean, Stamina, Interactor, ViewModel
  weapons/   Weapon, WeaponData, Ballistics, ProjectilePool, Recoil, Sway, Grenade, DemoCharge
  damage/    Health, Hitbox, Wound, SurfaceMaterial, Penetration
  ai/        Soldier, Perception, StateMachine, states/, Squad, CoverPoints, Suppression, NavGrid
  mission/   MissionDirector, Objective, Checkpoint, Trigger, TimeOfDay
  world/     LevelBuilder, Terrain, Hedgerows, Buildings, Vegetation, Sky, Collision
  render/    Renderer, PostFx, Materials, ProceduralTextures, Particles
  audio/     AudioDirector, Gunshot, Footsteps, Occlusion, Synth
  ui/        Hud, AmmoCheck, MapView, Menus, Localization
  assets/    modelos .glb, texturas, sonidos
data/        JSON de armas y, más adelante, de enemigos y superficies
tests/unit/  tests/e2e/
docs/
```

## Arquitectura

- **Bucle de juego:** simulación a paso fijo de 60 Hz con acumulador; el dibujado interpola. La lógica nunca depende de los fotogramas por segundo.
- **Datos separados del código.** Armas, enemigos y superficies se leen de `data/*.json`.
- **Comunicación por eventos.** `EventBus` tipado (`ShotFired`, `SoldierKilled`, `ObjectiveCompleted`, `PlayerWounded`).
- **Lógica pura aparte del dibujado.** Balística, daño, transiciones de la IA y misión son módulos sin dependencia de Three.js ni del DOM, para probarlos con Vitest.
- **Modo de pruebas:** con `?test=1` en la URL el juego expone `window.__game` (estado, teletransporte, avance de tiempo) para los tests de Playwright.

## Sistemas

### Jugador
- Cápsula contra la geometría del nivel con `three-mesh-bvh`. Velocidades del GDD. Aceleración e inercia.
- Posturas: de pie (1,75 m), agachado (1,1 m), tumbado (0,4 m), con transición suave.
- Inclinación de ±20° con desplazamiento lateral de 0,35 m.
- Balanceo de cámara al caminar y respirar.
- Trepar obstáculos de hasta 1,2 m.
- Ratón con Pointer Lock API. Sensibilidad ajustable.

### Armas y balística
- Cada bala se simula por pasos en la simulación fija: posición, velocidad, gravedad (9,81 m/s²) y resistencia del aire con el coeficiente balístico del JSON.
- En cada paso, raycast entre la posición anterior y la nueva contra el BVH del nivel y las hitboxes.
- Las balas salen del cañón, no del centro de la cámara.
- **Penetración:** cada superficie define el grosor que detiene cada calibre. Madera y setos se atraviesan con pérdida de energía; piedra y tierra no.
- **Rebotes:** posibles con ángulo menor de 15° en piedra y metal.
- **Retroceso:** impulso en cámara y arma, vertical y lateral aleatorio. No se recupera solo del todo.
- **Balanceo del arma:** depende de postura, cansancio, heridas y supresión. Mantener la respiración lo reduce 3 s.
- **Recarga:** por fases animadas e interrumpible. El Garand expulsa el peine.
- El arma en primera persona se dibuja en una escena aparte, encima, con su propio campo de visión.
- Proyectiles agrupados en un `ProjectilePool`.

### Daño
- Hitboxes por zona: cabeza ×4, torso ×1, brazos ×0,5, piernas ×0,6.
- Daño = daño base × zona × energía restante. Casco: 20 % de desviar un impacto oblicuo de pistola o subfusil.
- Hemorragia: de 1 a 3 puntos por segundo hasta vendarse.
- Impacto en pierna reduce la velocidad; en brazo aumenta el balanceo.
- Muerte con animación de caída según la dirección del impacto.

### IA
- Máquina de estados jerárquica: `Patrol`, `Suspicious`, `Search`, `Combat` (`TakeCover`, `Engage`, `Suppress`, `Flank`, `Retreat`), `Suppressed`, `Dead`.
- **Percepción:** cono de visión de 110°, alcance modulado por luz, niebla, postura y movimiento del jugador. La detección se acumula. Oído por eventos de sonido con radio.
- **Navegación:** rejilla de 0,5 m generada desde la geometría del nivel al cargar, con A* y suavizado de ruta. Los setos bajos son celdas de salto.
- **Cobertura:** puntos generados al cargar junto a obstáculos, validados por raycast contra la amenaza.
- **Escuadra:** reparte papeles (uno suprime, otro flanquea) y comparte la última posición conocida del jugador.
- **Puntería:** error angular que crece con la distancia, el movimiento del blanco y la supresión propia.
- **Supresión:** las balas cercanas llenan un medidor; al superar el umbral, el soldado se agacha y deja de asomarse.
- Presupuesto: 16 soldados activos como máximo. Percepción repartida entre fotogramas (4 soldados por fotograma).

### Mundo
- `LevelBuilder` construye el mapa de 400 × 400 m desde código y datos, con las medidas del GDD.
- Terreno con mapa de alturas y mezcla de capas por textura de pesos.
- Setos, hierba y árboles con `InstancedMesh` y movimiento de viento en el shader.

### Dibujado
- `WebGLRenderer` con salida sRGB, tonemapping ACES, luces físicas y sombras PCF suaves de una sola luz direccional con cascadas (2 niveles).
- Materiales `MeshStandardMaterial` con mapas de color, normal, rugosidad y oclusión.
- Cielo procedural nublado y mapa de entorno generado desde él con `PMREMGenerator`.
- Niebla exponencial por altura.
- Posprocesado con `EffectComposer`: corrección de color, grano, viñeta, bloom bajo, antialiasing SMAA.
- Partículas en GPU para fogonazos, impactos, humo y polvo.

### Misión
- `MissionDirector` ejecuta una lista ordenada de objetivos, cada uno con condición de inicio, condición de éxito y eventos.
- `TimeOfDay` interpola sol, cielo, niebla y exposición según el progreso de la misión.
- Puntos de control guardados en `localStorage`, con respaldo en memoria si el navegador lo bloquea al abrir desde archivo.

### Audio
- Web Audio API con `PannerNode` en modo HRTF para posicionar.
- Cada disparo: capa cercana, media y lejana, mezcladas por distancia.
- Retraso del sonido = distancia / 343 s.
- Chasquido supersónico si una bala pasa a menos de 3 m del oyente a más de 343 m/s.
- Oclusión por raycast con filtro de graves. Reverberación por convolución en interiores.
- Sonidos en OGG mono incrustados. Lo que no se encuentre con licencia válida se sintetiza en `Synth` (ruido filtrado y envolventes).

### Interfaz
- HTML y CSS sobre el lienzo del juego. Textos desde tabla de localización (`es` por defecto).
- Opciones guardadas en `localStorage`.

## Rendimiento

- 60 fps a 1080p en calidad media con gráfica integrada reciente.
- Menos de 300 llamadas de dibujado y menos de 1,5 millones de triángulos en pantalla.
- Niveles de detalle para personajes, árboles y edificios. Descarte por distancia para hierba.
- Tres niveles de calidad en opciones (bajo, medio, alto) que cambian resolución interna, sombras, densidad de hierba y posprocesado.
- Texturas de 1024 como norma y de 2048 solo para el arma en primera persona.

## Verificación

```
npm run check     # tsc --noEmit + vitest run + vite build
npm run e2e       # Playwright: abre dist/index.html desde file:// en Chromium
npm run shots     # Playwright: capturas de cada objetivo en tests/e2e/shots/
```

Tests unitarios mínimos:

- **Balística:** una bala de Garand cae entre 15 y 25 cm a 200 m; tarda entre 0,24 y 0,28 s en llegar.
- **Penetración:** un tablón de 3 cm no detiene un calibre de fusil; un muro de piedra de 40 cm sí.
- **Daño:** un impacto de fusil en la cabeza sin casco mata; uno en la pierna no.
- **IA:** con el jugador visible y cerca, `Patrol` pasa a `Combat` en menos de 2 s; con el medidor de supresión lleno pasa a `Suppressed`.
- **Navegación:** existe ruta entre todos los puntos clave de la misión.
- **Misión:** completar los cinco objetivos en orden dispara el final; no se pueden saltar.
- **Guardado:** guardar y cargar un punto de control deja el mismo estado.

Tests en navegador mínimos:

- `dist/index.html` abre desde `file://` sin errores en consola y sin peticiones de red.
- Tras el clic inicial se captura el ratón y el jugador se mueve con W.
- 60 s de juego automático mantienen una media de más de 50 fps en el modo sin cabeza.
- Capturas de cada objetivo, que Claude Code revisa contra la biblia de arte.

Lo que solo puede juzgar una persona jugando (sensación del arma, dificultad) se le pide al usuario con una lista concreta de qué mirar.
