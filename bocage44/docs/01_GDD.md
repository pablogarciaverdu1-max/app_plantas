# Documento de diseño del juego

## Resumen

- **Género:** shooter en primera persona, realista, un jugador.
- **Ambientación:** Normandía, madrugada del 6 de junio de 1944.
- **Jugador:** paracaidista aliado que ha caído lejos de su zona y solo.
- **Alcance de la primera versión:** una misión de 20 a 30 minutos.
- **Sensación buscada:** tensión, vulnerabilidad y poca información. El jugador avanza despacio, escucha y elige cuándo disparar.

## Pilares

1. **Letal.** Uno o dos impactos de fusil matan. Esto vale para todos.
2. **Poca interfaz.** Lo que el jugador sabe, lo sabe por lo que ve y oye.
3. **Armas con peso.** Retroceso, balanceo, recarga lenta y balística real.
4. **Enemigos que se comportan como soldados.** Se cubren, se avisan, suprimen y flanquean.

## La misión: "El cruce de Saint-Aubert"

Saint-Aubert es un pueblo ficticio. Mapa de unos 400 × 400 m de bocage normando: campos pequeños cerrados por setos altos sobre taludes de tierra, caminos hundidos, una granja, una huerta y un cruce de carreteras con cuatro casas de piedra.

Empieza a las 04:30, de noche y con niebla baja. Amanece durante la misión: al llegar al cruce ya hay luz gris.

| # | Objetivo | Qué pasa | Cómo se cumple |
|---|---|---|---|
| 1 | Reagruparse | Solo en un campo, con el paracaídas enredado en un seto. A 120 m, una granja con dos compañeros escondidos. Una patrulla de 3 soldados recorre el camino. | Llegar al granero. Se puede evitar o eliminar a la patrulla. |
| 2 | Cruzar el bocage | Con los dos compañeros, atravesar tres campos. Hay un puesto de escucha con 2 soldados. | Llegar al camino hundido. |
| 3 | Silenciar la ametralladora | Una MG 42 en un nido de sacos cubre el camino. De frente es imposible. | Flanquear por la huerta y eliminar a los 3 servidores. |
| 4 | Destruir los cañones | Dos obuses de 105 mm bajo redes de camuflaje, con 6 soldados alrededor. | Colocar una carga en cada cañón y alejarse 15 m. |
| 5 | Mantener el cruce | Contraataque de 10 a 12 soldados en dos oleadas, desde el norte y el este. | Resistir 3 minutos hasta que llegan refuerzos. |

Fin de la misión: plano fijo del cruce con luz de amanecer y texto breve.

**Puntos de control:** al cumplir cada objetivo.
**Derrota:** muere el jugador. Se vuelve al último punto de control.

## El jugador

- **Movimiento:** caminar 1,6 m/s, trotar 3,5 m/s, esprintar 5,5 m/s con resistencia limitada (unos 12 s). Agachado y cuerpo a tierra. Inclinarse a izquierda y derecha. Saltar setos bajos y muros de hasta 1,2 m.
- **Salud:** 100 puntos, sin regeneración. Un impacto de fusil en el torso quita de 60 a 100. Las heridas sangran y hay que vendarse (4 s, vendas limitadas).
- **Supresión:** las balas que pasan cerca desenfocan la vista y aumentan el balanceo del arma.
- **Carga:** un arma principal, una pistola, 2 granadas, 2 vendas y las cargas de demolición.

## Armas

Valores exactos en `data/weapons.json`.

| Arma | Bando | Notas de juego |
|---|---|---|
| M1 Garand | Jugador | Semiautomático, 8 balas. Al vaciarse expulsa el peine con su sonido metálico. Arma inicial. |
| M1A1 Thompson | Jugador | Subfusil, 30 balas. Lo lleva un compañero; se puede recoger. |
| M1911A1 | Jugador | Pistola, 7 balas. |
| Granada Mk 2 | Jugador | Fragmentación, mecha de 4 a 5 s. |
| Karabiner 98k | Enemigo | Cerrojo, 5 balas. Arma común. Se puede recoger. |
| MP 40 | Enemigo | Subfusil, 32 balas. Suboficiales. Se puede recoger. |
| MG 42 | Enemigo | Ametralladora fija, cadencia altísima. Solo en el nido. |

Se apunta con las miras de hierro del arma. Disparar desde la cadera es impreciso.

## Enemigos

Infantería regular alemana, de 2 a 6 soldados por grupo.

- **Percepción:** vista en cono (peor de noche y con niebla) y oído (pasos, disparos, cuerpos al caer).
- **Estados:** patrulla → sospecha → búsqueda → combate. En combate: cubrirse, disparar, suprimir, flanquear, retirarse.
- **Coordinación:** si uno ve al jugador, grita y avisa al grupo. Uno suprime mientras otro se mueve.
- **Moral:** bajo fuego intenso o con muchas bajas, se agachan o retroceden.
- **Voces:** en alemán, frases cortas de mando.

## Compañeros

Dos paracaidistas que siguen al jugador desde el objetivo 2. Se cubren solos, disparan a lo que ven y no pueden morir de forma definitiva en esta versión (caen heridos y se levantan al terminar el combate). No reciben órdenes.

## Interfaz

- Sin retícula, sin minimapa, sin barra de vida, sin contador de munición fijo.
- **Munición:** una tecla hace que el personaje compruebe el cargador y aparece un texto breve ("casi lleno", "menos de la mitad").
- **Herida:** viñeta oscura en los bordes y respiración pesada.
- **Objetivo:** una línea de texto al cambiar y al abrir el mapa.
- **Mapa:** un mapa de papel que el personaje sostiene. No marca la posición del jugador.
- **Menús:** principal, pausa, opciones (gráficos, sonido, controles, sensibilidad).

## Controles (teclado y ratón)

| Acción | Tecla |
|---|---|
| Moverse | W A S D |
| Esprintar | Mayús |
| Agacharse / tumbarse | C / Z |
| Inclinarse | Q / E |
| Saltar o trepar | Espacio |
| Disparar / apuntar | Ratón izq. / der. |
| Recargar / comprobar munición | R / mantener R |
| Cambiar arma | 1, 2, rueda |
| Granada | G |
| Vendarse | V |
| Interactuar | F |
| Mapa | M |
| Pausa | Esc |

## Fuera de alcance en esta versión

Multijugador, vehículos conducibles, más misiones, mando, órdenes a compañeros, progresión o desbloqueos.
