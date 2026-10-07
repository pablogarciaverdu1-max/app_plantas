# Biblia de arte

## Dirección

Realismo fotográfico sobrio. La referencia es la fotografía documental en color de 1944 y el cine bélico de luz natural: colores apagados, cielo cubierto, mucha humedad. Nada estilizado, nada de bloques ni de low-poly. El juego corre en el navegador, así que el realismo se consigue con luz, niebla, materiales y proporciones correctas más que con cantidad de detalle.

Tres reglas:

1. **Todo está usado.** Ningún material está limpio: barro en las botas, óxido en los bordes, pintura saltada, tela desgastada.
2. **El color es escaso.** La escena vive entre verdes oscuros, marrones y grises. Los únicos colores vivos son el fuego, las trazadoras y la sangre.
3. **La luz cuenta la hora.** La misión pasa de noche azulada a amanecer gris. La luz nunca es dramática sin motivo.

## Paleta

| Uso | Nombre | Hex |
|---|---|---|
| Sombras y noche | Negro azulado | `#12161A` |
| Barro y tierra mojada | Barro | `#4A3B2A` |
| Setos y vegetación | Verde seto | `#3F4A2A` |
| Uniforme y equipo aliado | Verde oliva | `#5B5A3C` |
| Uniforme alemán | Feldgrau | `#4D5D53` |
| Piedra de las casas | Piedra normanda | `#A69B86` |
| Cielo cubierto y niebla | Gris niebla | `#8E979C` |
| Trazadoras y fuego | Ámbar | `#FFB347` |
| Sangre | Rojo oscuro | `#6E1410` |
| Texto de interfaz | Papel | `#E6DFCC` |

Los valores de albedo de los materiales deben ser físicamente correctos: nada por debajo de 30 ni por encima de 240 en sRGB.

## Iluminación y posprocesado

- Cielo procedural con nubes, cobertura alta. Un solo sol o luna direccional con sombras.
- Niebla por altura. Densa al inicio (visibilidad de unos 60 m), más ligera al final (unos 200 m).
- Ciclo de luz guiado por la misión: 04:30 al empezar, 06:15 al terminar.
- Exposición con adaptación lenta, para que salir de un granero a la luz deslumbre un instante.
- Tonemapping ACES. Saturación global −15 %. Contraste +10 %.
- Grano de película suave. Viñeta suave. Sin aberración cromática. Bloom bajo, solo para fuego y fogonazos.
- Fuentes de luz de la época: lámparas de queroseno, fuego, fogonazos, bengalas. No hay luz eléctrica en el mapa.

## Materiales y texturas

Flujo PBR metal/rugosidad: color, normal, rugosidad y oclusión. Como todo va dentro de un solo archivo HTML, las texturas son pequeñas y se apoyan en repetición, mezcla y detalle procedural.

| Tipo | Resolución |
|---|---|
| Arma en primera persona y manos | 2048 |
| Personajes | 1024 |
| Edificios y props | 1024, con materiales repetibles |
| Terreno | 1024 por capa, 4 a 6 capas, más textura de detalle cercana |

Capas de terreno: hierba alta mojada, hierba pisada, barro, barro con charcos, tierra de camino con rodadas, grava.

Superficies clave y cómo deben leerse:

- **Barro:** oscuro, con brillo de agua en los huecos. Charcos con reflejo.
- **Setos:** masa densa de espino y avellano sobre talud de tierra y raíces. Varias mallas con viento.
- **Piedra normanda:** caliza clara con juntas de mortero, musgo abajo, manchas de humedad.
- **Madera:** tablones grises de granero, sin barniz. Cajas de munición con texto de plantilla.
- **Acero de arma:** pavonado oscuro, gastado a metal claro en bordes y zonas de agarre.
- **Tela:** lona y sarga con trama visible, bordes deshilachados, manchas de barro y sudor.
- **Cuero:** correajes cuarteados, oscuros por el uso.

## Personajes

- **Paracaidista aliado:** uniforme de salto M1942 caqui verdoso, casco M1 con red, correaje con bolsas, botas de salto altas. Cara tiznada.
- **Soldado alemán:** guerrera M43 en feldgrau, casco M40 sin emblemas, correaje de cuero negro en Y, cartucheras, botas bajas con polainas.
- De 8 000 a 15 000 triángulos por personaje, con 2 niveles de detalle. Proporciones y siluetas reales; nada de figuras simplificadas.
- Animación de captura de movimiento. Las manos del jugador y el arma son un modelo aparte, de alta calidad.

## Efectos

- **Fogonazo:** breve, irregular, distinto en cada disparo. Ilumina el entorno un fotograma.
- **Impactos:** distintos por material. Tierra: salpicadura oscura. Piedra: polvo claro y esquirlas. Madera: astillas. Agua: columna fina.
- **Trazadoras:** solo la MG 42, una de cada cinco balas.
- **Humo y polvo:** permanecen y los mueve el viento.
- **Explosiones:** tierra y humo oscuro, poca llama. Sin bolas de fuego de cine.
- **Sangre:** discreta. Bruma breve en el impacto y mancha en la ropa. Sin desmembramiento.

## Sonido

- Disparos grabados de las armas reales, con tres capas: cercano, medio y lejano.
- Chasquido supersónico de la bala al pasar cerca, seguido del estampido con retraso según la distancia.
- Ambiente: viento en los setos, pájaros al amanecer, artillería lejana, aviones altos.
- Pasos distintos por superficie. El equipo del jugador suena al moverse.
- Sin música durante el juego. Música solo en el menú y al terminar la misión.

## Interfaz

- Tipografía: **Stardos Stencil** para títulos y **Courier Prime** para textos (ambas de Google Fonts, licencia abierta).
- Color de texto `#E6DFCC` con sombra suave. Sin recuadros, sin iconos brillantes.
- Menús sobre fondo de mapa militar en papel, con fotos pegadas con clips.
