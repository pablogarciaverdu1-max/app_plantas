import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Anthropic from '@anthropic-ai/sdk';
import express from 'express';

import { generarReceta } from './chef.js';
import { getContextoDia } from './prompt.js';
import { creaLimitador, requiereToken } from './seguridad.js';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Construye la app de Express.
 *
 * `generador` es inyectable para que los tests puedan ejercitar las rutas sin
 * gastar dinero llamando de verdad a la API.
 */
export function creaApp({ generador = generarReceta, limitador = creaLimitador() } = {}) {
  const app = express();

  // Detrás de Railway/Render/Fly llegamos por un proxy: sin esto, req.ip sería
  // la del proxy y el limitador trataría a todo el mundo como un único usuario.
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '32kb' }));
  app.use(express.static(path.join(raiz, 'public')));

  app.get('/api/contexto', (_req, res) => {
    res.json({
      ...getContextoDia(process.env.TZ_USUARIO),
      necesitaToken: Boolean(process.env.APP_TOKEN),
    });
  });

  app.post('/api/receta', requiereToken, limitador, async (req, res) => {
    const { momento, platosRecientes, notas } = req.body ?? {};

    if (momento && momento !== 'comida' && momento !== 'cena') {
      return res.status(400).json({ error: 'momento debe ser "comida" o "cena".' });
    }

    try {
      const { receta, contexto, uso } = await generador({
        momento,
        platosRecientes: Array.isArray(platosRecientes) ? platosRecientes.slice(0, 15).map(String) : [],
        notas: typeof notas === 'string' ? notas.slice(0, 300) : '',
        timeZone: process.env.TZ_USUARIO,
      });

      console.log(`[receta] ${contexto.diaSemana}/${contexto.momento} -> ${receta.nombre}`, uso ?? '');
      res.json({ receta, contexto });
    } catch (error) {
      // Errores tipados del SDK: distinguimos lo reintentable de lo que no lo es.
      if (error instanceof Anthropic.AuthenticationError) {
        console.error('[receta] API key inválida o ausente');
        return res.status(500).json({ error: 'La API key de Anthropic no es válida. Revisa tu .env' });
      }
      if (error instanceof Anthropic.RateLimitError) {
        return res.status(429).json({ error: 'La IA está saturada ahora mismo. Prueba en unos segundos.' });
      }
      if (error instanceof Anthropic.APIConnectionError) {
        return res.status(503).json({ error: 'No se pudo conectar con la IA. Revisa tu conexión.' });
      }

      console.error('[receta] error inesperado:', error);
      res.status(500).json({ error: 'No se pudo generar la receta. Inténtalo de nuevo.' });
    }
  });

  return app;
}
