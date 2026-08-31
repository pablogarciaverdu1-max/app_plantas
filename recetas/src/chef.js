import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

import { SYSTEM_PROMPT, buildUserMessage } from './prompt.js';

// La key se resuelve desde ANTHROPIC_API_KEY. Nunca la escribas aqui.
const client = new Anthropic();

const MODELO = process.env.ANTHROPIC_MODEL || 'claude-opus-5';

/**
 * Esquema de salida. Al forzarlo, la app recibe campos ya separados y pinta la
 * ficha del plato sin tener que parsear markdown.
 */
export const RecetaSchema = z.object({
  nombre: z.string().describe('Nombre del plato'),
  porQueEncajaHoy: z.string().describe('Una sola frase explicando por qué encaja hoy'),
  ingredientes: z.array(z.string()).describe('Ingredientes con cantidad para 1 persona'),
  pasos: z.array(z.string()).describe('Instrucciones en orden, sin numerar'),
});

/**
 * Pide una receta a Claude.
 * @returns {Promise<{receta: z.infer<typeof RecetaSchema>, contexto: object, uso: object}>}
 */
export async function generarReceta(opts = {}) {
  const { texto, contexto } = buildUserMessage(opts);

  const response = await client.messages.parse({
    model: MODELO,
    max_tokens: 4000,
    // El system prompt es identico en cada peticion -> se sirve desde cache.
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    // Sugerir un plato no necesita razonamiento profundo: 'medium' da buena
    // calidad a menor coste. Sube a 'high' si quieres recetas mas elaboradas.
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'medium',
      format: zodOutputFormat(RecetaSchema),
    },
    messages: [{ role: 'user', content: texto }],
  });

  if (!response.parsed_output) {
    throw new Error('La IA no devolvió una receta con el formato esperado.');
  }

  return {
    receta: response.parsed_output,
    contexto,
    uso: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheRead: response.usage.cache_read_input_tokens,
      cacheWrite: response.usage.cache_creation_input_tokens,
    },
  };
}
