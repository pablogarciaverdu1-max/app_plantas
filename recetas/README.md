# 🍳 Chef IA — Recetas personalizadas

App móvil de recomendaciones gastronómicas. Un botón, un plato principal pensado
para tu día (entre semana vs. fin de semana) y tu entrenamiento.

Vive en `recetas/` dentro de este repo; **no toca la app de plantas** de la raíz.

---

## Arquitectura

```
┌──────────────────────────┐        ┌──────────────────────────┐
│  public/index.html       │        │  server.js (Express)     │
│  Web app móvil (PWA)     │ ─────► │  POST /api/receta        │
│  · botón "Dame una idea" │  JSON  │  GET  /api/contexto      │
│  · historial localStorage│ ◄───── │                          │
└──────────────────────────┘        │  src/prompt.js  (prompt) │
                                    │  src/chef.js    (Claude) │
                                    └───────────┬──────────────┘
                                                │  ANTHROPIC_API_KEY
                                                ▼
                                        API de Anthropic
                                        (claude-opus-5)
```

**Por qué así:**

- **La API key vive solo en el servidor.** Si el móvil llamara a Anthropic
  directamente, cualquiera podría abrir el inspector y robar la key (y gastarla).
  Este es el motivo principal de que haya backend y no solo un HTML suelto.
- **Web app en vez de React Native / Flutter.** Se instala en el móvil desde el
  navegador ("Añadir a pantalla de inicio"), no necesita Xcode ni Android Studio
  ni tiendas de apps. Para un MVP es el camino más corto. Si más adelante quieres
  app nativa, **el backend no cambia**: React Native llamaría al mismo
  `POST /api/receta`.
- **Salida estructurada (JSON).** La IA devuelve `{nombre, porQueEncajaHoy,
  ingredientes[], pasos[]}` en vez de texto suelto, así que la app pinta la ficha
  sin parsear markdown y no se rompe si la IA cambia de estilo.

---

## Puesta en marcha

```bash
cd recetas
npm install
cp .env.example .env      # y pega tu key de https://console.anthropic.com
npm start                 # http://localhost:3000
```

Para abrirlo en el móvil dentro de tu wifi: mira tu IP local (`ipconfig getifaddr en0`
en Mac, `hostname -I` en Linux) y entra desde el móvil a `http://TU_IP:3000`.
En Safari/Chrome → *Compartir* → *Añadir a pantalla de inicio* y queda como una app.

---

## Los archivos, uno a uno

| Archivo | Qué hace |
|---|---|
| `package.json` | Dependencias (`@anthropic-ai/sdk`, `express`, `zod`, `dotenv`) y el script `npm start`. |
| `.env` | Tu `ANTHROPIC_API_KEY`. **Está en `.gitignore`: nunca se sube.** |
| `.env.example` | Plantilla del anterior, esta sí se sube. |
| `src/prompt.js` | El System Prompt (perfil, reglas de negocio, formato) y el cálculo del contexto: qué día es y si toca comida o cena. |
| `src/chef.js` | La llamada a Claude: esquema de salida + `messages.parse()`. |
| `server.js` | Servidor Express: sirve el frontend y expone la API. Traduce errores del SDK a mensajes que la app puede enseñar. |
| `public/index.html` | Toda la interfaz (HTML + CSS + JS en un archivo, igual que la app de plantas). |
| `public/manifest.json` | Metadatos de PWA para que se instale con icono y a pantalla completa. |

### `src/prompt.js`

El System Prompt es **exactamente** el que definiste, más un bloque corto de
instrucciones de formato para que respete el esquema JSON.

Detalle importante: **en el System Prompt no hay nada variable**. Ni la fecha, ni
el día, ni el historial. Todo eso va en el mensaje del usuario que construye
`buildUserMessage()`. Motivo: el prompt caching de Anthropic funciona por
coincidencia de prefijo — si metes `new Date()` dentro del system, el prefijo
cambia en cada petición, la caché nunca acierta y pagas el prompt entero cada vez.

`getContextoDia()` decide dos cosas en zona horaria `Europe/Madrid`:
- **día de la semana** → alimenta tu regla L-V equilibrado / S-D más calórico;
- **momento** → antes de las 17:00 propone comida, después cena (el usuario puede
  cambiarlo con el selector de la app).

### `src/chef.js`

```js
const response = await client.messages.parse({
  model: 'claude-opus-5',
  max_tokens: 4000,
  system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
  thinking: { type: 'adaptive' },
  output_config: { effort: 'medium', format: zodOutputFormat(RecetaSchema) },
  messages: [{ role: 'user', content: texto }],
});
```

- `cache_control` cachea el System Prompt: a partir de la segunda petición esos
  tokens se cobran a ~0,1x.
- `output_config.format` obliga a la estructura. `response.parsed_output` llega ya
  validado contra el esquema Zod.
- `effort: 'medium'` — sugerir un plato no requiere razonamiento profundo y sale
  más barato. Súbelo a `'high'` si quieres recetas más elaboradas.

### `server.js`

Dos endpoints:

- `GET /api/contexto` → `{diaSemana, esFinDeSemana, momentoSugerido}`. La app lo
  pide al abrir para preseleccionar comida/cena y pintar la cabecera.
- `POST /api/receta` → recibe `{momento, notas, platosRecientes}` y devuelve
  `{receta, contexto}`.

Los errores se capturan por clase del SDK (`AuthenticationError`, `RateLimitError`,
`APIConnectionError`) en vez de con un `catch` genérico, para que la app pueda decir
"revisa tu key" en vez de "algo falló".

### `public/index.html`

- Botón grande **"✨ Dame una idea para comer hoy"**.
- Selector comida/cena y un campo opcional de preferencia ("pescado", "con arroz").
- **Anti-repetición**: guarda las últimas 20 recetas en `localStorage` y envía los
  10 nombres más recientes en cada petición, para que la IA no te proponga lo mismo
  tres veces por semana.
- Historial navegable, "🔄 Otra idea" y compartir (`navigator.share`, con copia al
  portapapeles como alternativa).

---

## Siguientes pasos posibles

1. **Streaming** — que la receta aparezca escribiéndose en lugar de esperar. Cambia
   `messages.parse` por `messages.stream`.
2. **Lista de la compra** — sumar los ingredientes de varias recetas.
3. **Despliegue** — Railway, Render o Fly.io. Sube el repo, define `ANTHROPIC_API_KEY`
   como variable de entorno y ya tienes la app accesible desde cualquier sitio.
4. **App nativa** — React Native (Expo) consumiendo esta misma API.

> **Aviso**: la API no lleva autenticación. Está pensada para uso local o personal.
> Antes de exponerla en internet, añade al menos un token de acceso y un límite de
> peticiones, o cualquiera podría gastar tu saldo de API.
