# Recursos de arte y sonido

Claude Code escribe el código. Los modelos, texturas, animaciones y sonidos realistas vienen de bibliotecas gratuitas. Este archivo dice qué hace falta, dónde buscarlo y lleva el registro de lo que entra.

## Regla de licencias

Solo entran recursos con licencia que permita su uso en un juego: CC0, CC-BY (con atribución en los créditos) o una licencia equivalente que permita redistribuir el recurso dentro del juego. No entran CC-NC, "solo uso editorial" ni recursos extraídos de otros juegos. Comprueba la licencia en la página de cada recurso el día que lo descargues: las condiciones cambian.

## Dónde buscar

| Fuente | Qué ofrece | Licencia habitual |
|---|---|---|
| Poly Haven (polyhaven.com) | Texturas PBR, cielos HDRI, modelos de props y vegetación | CC0 |
| ambientCG (ambientcg.com) | Texturas PBR de suelo, piedra, madera, tela, metal | CC0 |
| Sketchfab (sketchfab.com) | Armas, uniformes, vehículos y edificios. Filtra por "Downloadable" y licencia CC0 o CC-BY | Varía por modelo |
| Quaternius y Kenney (quaternius.com, kenney.nl) | Solo como base de esqueletos y animaciones; su estilo visual es simplificado y no vale tal cual | CC0 |
| Mixamo (mixamo.com) | Animaciones de captura de movimiento para personajes | Gratis con cuenta de Adobe |
| Freesound (freesound.org) | Disparos, ambientes, pasos, voces | CC0 o CC-BY por sonido |
| Sonniss GDC Audio Bundle | Biblioteca profesional de efectos | Libre de derechos |
| Google Fonts | Stardos Stencil, Courier Prime | Open Font License |

Comprueba que la licencia permite redistribuir el archivo: en un juego HTML los recursos viajan dentro del propio archivo.

## Lista de lo que hace falta

### Imprescindible para la misión

**Personajes**
- [ ] Paracaidista aliado de 1944 (cuerpo completo, con esqueleto)
- [ ] Soldado de infantería alemán de 1944 (cuerpo completo, con esqueleto)
- [ ] Brazos y manos en primera persona

**Armas** (modelo con piezas móviles separadas: cerrojo, cargador, gatillo)
- [ ] M1 Garand y peine de 8 balas
- [ ] M1A1 Thompson
- [ ] M1911A1
- [ ] Granada Mk 2
- [ ] Karabiner 98k
- [ ] MP 40
- [ ] MG 42 con bípode o trípode
- [ ] Carga de demolición

**Entorno**
- [ ] Casa de piedra normanda (2 variantes), granero, muro de piedra modular
- [ ] Seto de bocage sobre talud (3 tramos), árboles (roble, manzano), hierba alta
- [ ] Obús de campaña de 105 mm con red de camuflaje
- [ ] Sacos terreros, cajas de munición, bidones, alambrada, carro agrícola, vallas y portones de madera
- [ ] Paracaídas enredado
- [ ] Texturas de terreno: hierba mojada, hierba pisada, barro, charcos, camino con rodadas, grava
- [ ] Cielo HDRI nublado de noche y de amanecer

**Animaciones**
- [ ] Locomoción de pie, agachado y tumbado; con fusil y con subfusil
- [ ] Apuntar, disparar, recargar por arma
- [ ] Cubrirse, asomarse, lanzar granada
- [ ] Reacciones a impacto y muertes
- [ ] Animaciones en primera persona por arma (sacar, disparar, recargar, comprobar munición)

**Sonido**
- [ ] Disparo de cada arma en tres distancias, más recarga y manipulación
- [ ] Chasquidos de bala al pasar, impactos por material
- [ ] Explosión de granada y de carga
- [ ] Pasos por superficie (hierba, barro, grava, madera, piedra)
- [ ] Ambiente de noche y de amanecer en campo, artillería lejana, aviones
- [ ] Voces en alemán (órdenes, alerta, dolor) y en inglés para los compañeros

### Lo más difícil de encontrar gratis

Las animaciones en primera persona por arma y las voces en alemán. Si no aparecen con licencia válida: animar las manos por código con poses clave (suficiente para la primera versión) y grabar las voces con un hablante nativo o dejarlas para más adelante.

## Especificaciones de importación

- Modelos en glTF binario (`.glb`), 1 unidad = 1 metro, eje Y arriba. Geometría comprimida con Meshopt.
- Texturas en WebP o JPEG de 1024 (2048 solo para el arma en primera persona). Reduce las descargadas antes de incorporarlas.
- Audio en OGG mono de 44,1 kHz; ambientes en estéreo y en bucle corto.
- Cada recurso en `src/assets/<categoría>/<nombre>/`.
- Presupuesto total de recursos: 30 MB. Si un recurso no cabe, se simplifica o se genera por código.
- Lo que se pueda generar bien por código (terreno, hierba, cielo, niebla, sacos, cajas, muros) se genera, y el presupuesto se reserva para armas, personajes y sonidos.

## Registro

Añade una fila por cada recurso que entre al proyecto.

| Recurso | Uso en el juego | Fuente (URL) | Autor | Licencia | Fecha | Modificaciones |
|---|---|---|---|---|---|---|
| | | | | | | |
