# 🌿 Verdín

App web para el iPhone: le haces una foto a una planta y te dice qué especie es,
te habla de ella y te da su ficha de cuidados.

Se instala en la pantalla de inicio como una app normal y **no cuesta dinero**:
no hay ninguna API de pago por medio.

## Qué te da con una foto

- **La especie** — nombre común en español, nombre científico, familia y un
  porcentaje de certeza. Si la certeza es baja, te lista las otras candidatas.
- **De qué va la planta** — la descripción de Wikipedia, con enlace al artículo.
- **Ficha de cuidados** — riego (cada cuántos días en verano y en invierno, método,
  cantidad, tipo de agua y una prueba casera para saber si toca), luz, dónde
  ponerla en casa, temperatura, humedad, sustrato, maceta, abono, trasplante,
  poda, plagas, esquejes y toxicidad para perros y gatos.
- **Fotos de referencia** de la especie, de la comunidad de Pl@ntNet.
- **Recordatorios de riego** — con la frecuencia de la ficha calcula cuándo toca
  regar cada planta y te avisa en la pantalla de inicio.

Todo lo que fotografíes se guarda en tu biblioteca, dentro del móvil.

## De dónde salen los datos (y por qué es gratis)

| Qué | De dónde | Coste |
|---|---|---|
| Identificar la especie | [Pl@ntNet](https://my.plantnet.org/) | Gratis, 500 al día |
| Descripción y enlace | Wikipedia | Gratis, sin clave |
| Fichas de cuidados | Base de datos dentro de la app | Gratis, funciona sin conexión |

La ficha de cuidados no necesita internet ni ninguna API: va escrita dentro de la
app. Está organizada por **género**, no por especie, porque casi todos los consejos
de cuidado se comparten dentro de un mismo género — todos los *Ficus* se riegan
parecido. Eso multiplica la cobertura sin multiplicar el trabajo.

Cubre las plantas de interior y de balcón más habituales. Si fotografías algo que
no está, la app te lo dice claramente y te deja igualmente el nombre y lo que
cuenta Wikipedia, en lugar de inventarse unos cuidados.

## Instalación en el iPhone

1. En este repositorio, ve a **Settings → Pages** y publica la rama
   (`Deploy from a branch`, carpeta `/root`).
2. Abre la URL que te dé GitHub **en Safari** desde el iPhone.
3. Pulsa el botón de compartir → **Añadir a pantalla de inicio**.

Tiene que ser Safari: es el único navegador de iOS que instala apps en la pantalla
de inicio. Y tiene que ser HTTPS, cosa que GitHub Pages ya te da.

## La clave de Pl@ntNet

Es gratuita y no piden tarjeta. Una vez:

1. Regístrate en [my.plantnet.org](https://my.plantnet.org/).
2. Copia tu clave de API.
3. **Importante:** en la configuración de la clave, marca *«expose my API key»* y
   añade el dominio de tu app en *«Authorized domains»* (algo como
   `tuusuario.github.io`). Sin esto el navegador bloquea las peticiones por CORS.
   La app te enseña el dominio exacto en su pantalla de Ajustes.
4. Pega la clave en **Ajustes** dentro de la app.

## Privacidad

Todo se queda en el iPhone: las fotos y las fichas en IndexedDB, la clave en
`localStorage`. No hay servidor propio ni analítica. Tus fotos solo salen del
móvil para ir a Pl@ntNet a identificar la especie.

«Borrar todos los datos», en Ajustes, lo deja todo limpio.

## Cómo está montado

Sin framework ni paso de compilación: HTML, CSS y módulos ES nativos.

```
index.html              Estructura y pantallas
css/app.css             Estilos (modo claro y oscuro, safe-areas del iPhone)
js/app.js               Interfaz y navegación
js/plantnet.js          Identificación de especies
js/cuidados.js          Base de datos de cuidados
js/wiki.js              Descripción desde Wikipedia
js/db.js                IndexedDB (fotos y fichas) y ajustes
js/imagen.js            Reducción de las fotos antes de enviarlas
js/riego.js             Calendario de riego y avisos
sw.js                   Service worker (la app abre sin conexión)
```

Un par de decisiones que conviene conocer si tocas el código:

- **Las fotos van a IndexedDB, no a `localStorage`**, que tiene un tope de ~5 MB y
  se llenaría con tres fotos del iPhone.
- **Las fotos se reducen a 1400 px** antes de subirlas: una foto del iPhone 12 son
  12 MP y no aportan nada para identificar la especie.
- **La base de cuidados usa arquetipos** (`tropical`, `suculenta`, `helecho`,
  `mediterranea`…) y cada género solo sobrescribe lo que le diferencia. Para añadir
  una planta nueva suelen bastar tres líneas.

Al actualizar cualquier fichero, sube el número de versión de `CACHE` en `sw.js`
para que los iPhones que ya tengan la app instalada se traigan la versión nueva.

### Añadir una planta a la base de cuidados

En `js/cuidados.js`, dentro de `PLANTAS`:

```js
Nombre_del_genero: {
  arq: 'tropical',                    // el arquetipo del que hereda
  nombre: 'Nombre común',
  riego: { verano: 7, invierno: 14 }, // solo lo que difiere del arquetipo
  toxica: 'Tóxica para perros y gatos.',
},
```
