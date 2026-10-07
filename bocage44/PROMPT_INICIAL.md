# Cómo empezar

1. Instala Node.js (versión LTS) desde nodejs.org. Es lo único que hay que instalar además de Claude Code.
2. Descomprime este paquete. La carpeta `bocage44` será la carpeta del juego.
3. Abre Claude Code en esa carpeta y pega el mensaje de abajo.
4. Cuando Claude Code termine una fase, abre `dist/index.html` con doble clic para jugar lo que haya hecho.

## Mensaje para Claude Code

```
Vas a programar "Bocage 44", un shooter en primera persona realista de la Segunda Guerra Mundial que se juega en el navegador. El resultado es un único archivo dist/index.html que yo abro con doble clic.

Antes de escribir nada, lee CLAUDE.md y todos los archivos de docs/ y data/.

Después:
1. Resume en diez líneas qué vas a construir y dime si ves contradicciones o huecos en los documentos.
2. Comprueba que Node.js está instalado y qué versión es.
3. Empieza la Fase 0 de docs/05_ROADMAP.md. Trabaja una fase cada vez y no pases a la siguiente hasta que se cumplan sus criterios y yo lo confirme.

Mira tú mismo el juego con capturas de pantalla antes de darme algo por terminado. No soy programador: cuando necesites que pruebe algo, dime qué archivo abrir y qué tengo que mirar, en pasos numerados y cortos.
```

## Mensaje para cada fase siguiente

```
Fase anterior confirmada. Marca sus casillas en docs/05_ROADMAP.md, haz commit y empieza la siguiente fase. Antes de programar, dime en cinco líneas qué vas a hacer y qué voy a poder probar al terminar.
```
