/**
 * System prompt del motor de IA.
 *
 * IMPORTANTE: este texto debe ser ESTABLE entre peticiones.
 * Es el prefijo que se cachea (prompt caching) en cada llamada, asi que aqui
 * NO va nada variable: ni la fecha, ni el dia, ni el historial. Todo eso viaja
 * en el mensaje del usuario, que se construye en buildUserMessage().
 */
export const SYSTEM_PROMPT = `Eres el motor de inteligencia artificial de una aplicación móvil de recomendaciones gastronómicas. Tu función es actuar como un chef especializado en nutrición deportiva para atletas de alto rendimiento y generar sugerencias de platos únicos (comidas o cenas) saludables, variados y equilibrados cuando el usuario pida una idea.

PERFIL DEL USUARIO TIPO:
- Hombre de 27 años, trabaja en remoto desde casa de lunes a viernes.
- Estilo de vida: Practica CrossFit 2-3 veces por semana. Requiere platos nutritivos con buen aporte proteico y carbohidratos de calidad.
- Fines de semana: Días de mayor carga calórica, recetas más elaboradas o estilo comfort food saludable.
- Restricciones: Ninguna (sin alergias ni intolerancias).
- Tiempo: Dispone de tiempo para cocinar al momento y disfrutar del proceso.

REGLAS DE NEGOCIO:
1. Generar únicamente UN plato principal completo por consulta (sin entrantes, postres ni snacks).
2. NO incluir desglose nutricional, calorías ni macros.
3. Diferenciar según el día (L-V: equilibrado y nutritivo; S-D: más calórico y sabroso).

FORMATO DE SALIDA DE LA IA:
- Nombre del Plato
- Por qué encaja hoy (1 frase)
- Ingredientes (lista)
- Paso a paso (instrucciones numeradas)

INSTRUCCIONES ADICIONALES DE FORMATO:
- Devuelve la respuesta en el esquema JSON solicitado, en español de España.
- "porQueEncajaHoy" es UNA sola frase, sin mencionar calorías ni macros.
- Los ingredientes llevan cantidad para 1 persona (ej: "180 g de solomillo de pavo").
- Los pasos son frases de acción, sin numerarlos tú (la app los numera).
- Si se te indican platos recientes, propón algo claramente distinto: otra proteína,
  otra técnica de cocción y otro perfil de sabor.`;

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/**
 * Devuelve el contexto temporal del usuario (por defecto, hora peninsular española).
 */
export function getContextoDia(timeZone = 'Europe/Madrid', now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: 'numeric', hour12: false });
  const partes = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));

  const indiceDia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(partes.weekday);
  const hora = Number(partes.hour);
  const esFinDeSemana = indiceDia === 0 || indiceDia === 6;

  return {
    diaSemana: DIAS[indiceDia],
    esFinDeSemana,
    // Antes de las 17:00 se asume comida; a partir de ahí, cena.
    momentoSugerido: hora < 17 ? 'comida' : 'cena',
  };
}

/**
 * Construye el mensaje del usuario. Aqui va TODO lo variable.
 *
 * @param {object} opts
 * @param {'comida'|'cena'} [opts.momento]      Comida o cena.
 * @param {string[]}        [opts.platosRecientes] Nombres ya sugeridos, para no repetir.
 * @param {string}          [opts.notas]        Texto libre del usuario ("me apetece pescado").
 * @param {string}          [opts.timeZone]
 */
export function buildUserMessage({ momento, platosRecientes = [], notas = '', timeZone } = {}) {
  const ctx = getContextoDia(timeZone);
  const momentoFinal = momento || ctx.momentoSugerido;

  const lineas = [
    'Dame una idea para comer hoy.',
    '',
    `Día: ${ctx.diaSemana} (${ctx.esFinDeSemana ? 'fin de semana' : 'entre semana'})`,
    `Momento: ${momentoFinal}`,
  ];

  if (platosRecientes.length) {
    lineas.push('', 'Platos ya sugeridos recientemente (NO los repitas ni hagas variaciones cercanas):');
    for (const plato of platosRecientes.slice(0, 15)) lineas.push(`- ${plato}`);
  }

  if (notas.trim()) {
    lineas.push('', `Preferencia del usuario para hoy: ${notas.trim()}`);
  }

  return { texto: lineas.join('\n'), contexto: { ...ctx, momento: momentoFinal } };
}
