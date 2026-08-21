# 🌿 Verdín

App web para el iPhone: le haces una foto a una planta y te dice qué variedad es,
**cómo está de salud según esa foto concreta** y cómo cuidarla.

Se instala en la pantalla de inicio como una app normal, usa la cámara del móvil
y se conecta directamente a tu cuenta de Claude.

## Qué te da con una foto

- **Identificación** — nombre común, nombre científico, familia y un porcentaje de
  certeza. Si la foto no da para más, te lista las especies alternativas.
- **Estado de salud** — puntuación de 0 a 100 y un diagnóstico de lo que se ve
  *en tu foto*: dónde empieza una mancha, qué hoja está decaída. No síntomas
  genéricos de la especie.
- **Qué hacer** — acciones ordenadas por urgencia (ahora / esta semana / mantenimiento).
- **Riego** — cada cuántos días en verano y en invierno, cantidad, método, tipo de
  agua, y una prueba casera para saber si toca regar. Con eso la app te calcula el
  calendario y te avisa en la pantalla de inicio.
- **Sol** — exposición, horas y dónde ponerla en casa según la orientación.
- **El resto** — temperatura, humedad, sustrato, maceta, abono, trasplante, poda,
  plagas, esquejes, toxicidad para perros y gatos, y calendario por estaciones.
- **Foto de referencia** de la especie, sacada de Wikipedia.

Puedes volver a fotografiar una planta guardada para **revisar su salud**: compara
con la revisión anterior, te dice si ha mejorado o empeorado y guarda el historial.

## Instalación en el iPhone

La app son ficheros estáticos, así que vale cualquier hosting. Con GitHub Pages:

1. En este repositorio, ve a **Settings → Pages** y publica la rama
   (`Deploy from a branch`, carpeta `/root`).
2. Abre la URL que te da GitHub **en Safari** desde el iPhone.
3. Pulsa el botón de compartir → **Añadir a pantalla de inicio**.

Tiene que ser Safari: es el único navegador de iOS que instala apps en la pantalla
de inicio. Y tiene que ser HTTPS (GitHub Pages ya lo es) o la cámara no funciona.

## Configuración

Abre **Ajustes** dentro de la app y rellena:

- **API key de Anthropic** — la creas en
  [console.anthropic.com](https://console.anthropic.com/settings/keys). Se guarda
  sólo en tu iPhone (`localStorage`) y sólo viaja a la API de Claude.
- **Dónde vives** y **cómo es tu casa** — opcionales pero muy recomendables:
  con la orientación de tus ventanas y el sol que entra, los consejos de riego y
  ubicación dejan de ser genéricos.

### Sobre el coste

Cada análisis es una llamada a la API de Anthropic y se cobra a tu cuenta según
las [tarifas de la API](https://www.anthropic.com/pricing#api). Una foto ronda las
1.500-2.500 fichas de entrada. La app reduce cada foto a 1400 px antes de enviarla,
que es lo que el modelo aprovecha: mandarla a 12 MP costaría más sin mejorar nada.

Ojo: esto es la **API**, que se factura aparte de tu suscripción a Claude.

## Privacidad

Todo se queda en el iPhone. Las fotos y las fichas van a IndexedDB, los ajustes a
`localStorage`. No hay servidor propio ni analítica: los únicos sitios a los que la
app habla son la API de Claude (tus fotos, para analizarlas) y Wikipedia (sólo el
nombre científico, para traer la foto de referencia).

"Borrar todos los datos" en Ajustes lo deja todo limpio.

## Cómo está montado

Sin framework ni paso de compilación: HTML, CSS y módulos ES nativos.

```
index.html              Estructura y pantallas
css/app.css             Estilos (modo claro y oscuro, safe-areas del iPhone)
js/app.js               Interfaz y navegación
js/claude.js            Llamadas a la API y esquemas de respuesta
js/db.js                IndexedDB (fotos y fichas) y ajustes
js/imagen.js            Reducción de fotos y foto de referencia de Wikipedia
js/riego.js             Calendario de riego y avisos
vendor/anthropic.js     SDK oficial de Anthropic, empaquetado
sw.js                   Service worker (la app abre sin conexión)
```

Un par de decisiones que conviene conocer si tocas el código:

- **El SDK va empaquetado en `vendor/`**, no desde un CDN, para que la app siga
  funcionando sin conexión y no dependa de que un tercero esté levantado.
- **`dangerouslyAllowBrowser: true`** es imprescindible: hace que el SDK mande la
  cabecera `anthropic-dangerous-direct-browser-access` sin la cual el navegador
  bloquea la llamada por CORS. Es aceptable aquí porque la key es tuya y nunca sale
  de tu móvil; en una app con varios usuarios habría que poner un backend por medio.
- **Las respuestas usan salida estructurada** (`output_config.format`), así que
  llegan siempre como el mismo JSON y no hay que parsear texto libre.
- **Las fotos van a IndexedDB, no a `localStorage`**, que tiene un tope de ~5 MB y
  se llenaría con tres fotos.

### Regenerar el SDK empaquetado

```bash
npm install @anthropic-ai/sdk esbuild
echo 'export { default } from "@anthropic-ai/sdk";' > entry.js
npx esbuild entry.js --bundle --format=esm --platform=browser --target=safari15 \
  --alias:node:fs=./node-stub.js --alias:node:path=./node-stub.js \
  --outfile=vendor/anthropic.js --minify
```

Los *alias* sustituyen dos importaciones de Node que el SDK sólo usa al leer
credenciales de disco, cosa que en el navegador nunca ocurre porque la key se pasa
explícitamente.

Al actualizar cualquier fichero, sube el número de versión de `CACHE` en `sw.js`
para que los iPhones que ya tengan la app instalada se traigan la versión nueva.
