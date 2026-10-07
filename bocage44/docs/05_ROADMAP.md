# Plan de trabajo

Cada fase termina cuando se cumplen todos sus criterios. Al final de cada fase hay un `dist/index.html` que el usuario abre y prueba. Hasta la fase 6 el juego usa geometría simple a escala real: primero se consigue que se juegue bien, después se pone el arte.

Marca aquí el progreso.

## Fase 0 — Proyecto
- [x] Proyecto con Vite, TypeScript, Three.js, Vitest y Playwright. Git iniciado.
- [x] Estructura de carpetas de la especificación técnica.
- [x] `npm run build` genera un único `dist/index.html` que abre con doble clic y muestra una escena 3D con suelo, cielo y niebla.
- [x] `npm run check` y `npm run e2e` pasan.

**Terminado cuando:** el usuario abre `dist/index.html` con doble clic y ve la escena.

## Fase 1 — Jugador
- [ ] Movimiento, posturas, inclinación, esprint con resistencia, trepar, colisiones.
- [ ] Cámara en primera persona con balanceo y captura del ratón.
- [ ] Escena de pruebas con rampas, muros de 1,2 m y un túnel bajo.

**Terminado cuando:** el usuario recorre la escena de pruebas y confirma que el movimiento se siente pesado pero preciso.

## Fase 2 — Armas y balística
- [ ] Proyectiles simulados, penetración, rebotes.
- [ ] Garand completo: disparo, retroceso, balanceo, miras, recarga, comprobar munición.
- [ ] Resto de armas del jugador y granada.
- [ ] Campo de tiro con blancos a 25, 100 y 200 m y paneles de madera y piedra.

**Terminado cuando:** pasan los tests de balística y penetración, y a 200 m hay que apuntar por encima del blanco.

## Fase 3 — Daño
- [ ] Hitboxes por zona, hemorragia, vendas, efectos de herida.
- [ ] Muñeco enemigo inmóvil que recibe daño y cae.

**Terminado cuando:** pasan los tests de daño y el jugador puede morir, vendarse y ver los efectos de herida.

## Fase 4 — Enemigos
- [ ] Navegación, percepción, estados, cobertura, escuadras, supresión, puntería con error.
- [ ] Armas enemigas, incluida la MG 42 fija.
- [ ] Escena de pruebas con una escuadra de 4 en un campo con setos.

**Terminado cuando:** pasan los tests de IA y, jugando, la escuadra se cubre, avisa, suprime y flanquea sin quedarse atascada.

## Fase 5 — Misión en gris
- [ ] `LevelBuilder` genera el mapa de 400 × 400 m con las medidas del GDD.
- [ ] Los cinco objetivos, puntos de control, compañeros y ciclo de luz.
- [ ] Guardado y carga.

**Terminado cuando:** la misión se juega de principio a fin en 20 a 30 minutos y pasan los tests de misión y guardado.

## Fase 6 — Sonido
- [ ] Capas de disparo por distancia, retraso, chasquido supersónico, oclusión.
- [ ] Pasos, ambiente, voces.

**Terminado cuando:** con los ojos cerrados se distingue de dónde viene un disparo y a qué distancia aproximada.

## Fase 7 — Arte
- [ ] Recursos de `docs/04_ASSETS.md` incorporados, optimizados y registrados con su licencia.
- [ ] Terreno, setos, edificios, personajes y armas con sus materiales.
- [ ] Iluminación, niebla y posprocesado según la biblia de arte.
- [ ] Efectos de impacto, fogonazos, humo, explosiones.

**Terminado cuando:** Claude Code ha comparado una captura de cada objetivo con la biblia de arte, y el usuario las aprueba.

## Fase 8 — Interfaz y menús
- [ ] Pantalla de inicio, pausa, opciones, mapa de papel, textos de objetivo, pantalla final.

**Terminado cuando:** se puede empezar, pausar, cambiar opciones, morir, continuar y terminar la misión.

## Fase 9 — Pulido
- [ ] Rendimiento: 60 fps a 1080p en calidad media. Archivo final por debajo de 40 MB.
- [ ] Probado en Chrome, Edge y Firefox.
- [ ] Ajuste de dificultad con las notas del usuario.
- [ ] Pantalla de créditos con las atribuciones.

**Terminado cuando:** una persona que no ha visto el juego abre `dist/index.html` y completa la misión sin ayuda.
