import 'dotenv/config';

import { creaApp } from './src/app.js';

const PUERTO = Number(process.env.PORT) || 3000;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠️  Falta ANTHROPIC_API_KEY. Copia .env.example a .env y añade tu key.');
}
if (!process.env.APP_TOKEN) {
  console.warn('⚠️  Sin APP_TOKEN: la API está abierta. Vale para tu red local, no para internet.');
}

creaApp().listen(PUERTO, () => {
  console.log(`🍳 Chef IA escuchando en http://localhost:${PUERTO}`);
});
