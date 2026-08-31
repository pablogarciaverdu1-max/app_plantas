import 'dotenv/config';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Anthropic from '@anthropic-ai/sdk';
import express from 'express';

import { generarReceta } from './src/chef.js';
import { getContextoDia } from './src/prompt.js';

const aqui = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(aqui, 'public')));

app.get('/api/contexto', (_req, res) => {
  res.json(getContextoDia(process.env.TZ_USUARIO));
});

app.post('/api/receta', async (req, res) => {
  const { momento, platosRecientes, notas } = req.body ?? {};

  if (momento && momento !== 'comida' && momento !== 'cena') {
    return res.status(400).json({ error: 'momento debe ser "comida" o "cena".' });
  }

  try {
    const { receta, contexto, uso } = await generarReceta({
      momento,
      platosRecientes: Array.isArray(platosRecientes) ? platosRecientes.map(String) : [],
      notas: typeof notas === 'string' ? notas.slice(0, 300) : '',
      timeZone: process.env.TZ_USUARIO,
    });

    console.log(`[receta] ${contexto.diaSemana}/${contexto.momento} -> ${receta.nombre}`, uso);
    res.json({ receta, contexto });
  } catch (error) {
    // Errores tipados del SDK: distinguimos lo reintentable de lo que no lo es.
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('[receta] API key inválida o ausente');
      return res.status(500).json({ error: 'La API key de Anthropic no es válida. Revisa tu .env' });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'Demasiadas peticiones seguidas. Prueba en unos segundos.' });
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return res.status(503).json({ error: 'No se pudo conectar con la IA. Revisa tu conexión.' });
    }

    console.error('[receta] error inesperado:', error);
    res.status(500).json({ error: 'No se pudo generar la receta. Inténtalo de nuevo.' });
  }
});

const PUERTO = Number(process.env.PORT) || 3000;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠️  Falta ANTHROPIC_API_KEY. Copia .env.example a .env y añade tu key.');
}

app.listen(PUERTO, () => {
  console.log(`🍳 Chef IA escuchando en http://localhost:${PUERTO}`);
});
