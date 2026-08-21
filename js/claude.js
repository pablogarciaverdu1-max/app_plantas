// Capa de acceso a la API de Claude, usando el SDK oficial de Anthropic
// empaquetado en vendor/anthropic.js (sin CDN, funciona offline tras la 1ª carga).
import Anthropic from '../vendor/anthropic.js';

export const MODELO = 'claude-opus-5';

// El esquema fuerza a que la respuesta sea SIEMPRE este JSON exacto.
// Así no hace falta parsear texto ni limpiar bloques de markdown.
const ficha = {
  type: 'object',
  additionalProperties: false,
  required: ['identificacion', 'salud', 'riego', 'luz', 'ambiente', 'sustrato', 'cuidados', 'resumen'],
  properties: {
    identificacion: {
      type: 'object',
      additionalProperties: false,
      required: ['nombre_comun', 'nombre_cientifico', 'familia', 'confianza', 'alternativas', 'descripcion', 'dificultad', 'toxica_mascotas'],
      properties: {
        nombre_comun: { type: 'string' },
        nombre_cientifico: { type: 'string', description: 'Género y especie en latín, p. ej. "Monstera deliciosa"' },
        familia: { type: 'string' },
        confianza: { type: 'integer', minimum: 0, maximum: 100, description: 'Seguridad en la identificación' },
        alternativas: { type: 'array', items: { type: 'string' }, description: 'Otras especies que podría ser, si hay duda' },
        descripcion: { type: 'string' },
        dificultad: { type: 'string', enum: ['Fácil', 'Media', 'Difícil'] },
        toxica_mascotas: { type: 'string', description: 'Toxicidad para perros y gatos' },
      },
    },
    salud: {
      type: 'object',
      additionalProperties: false,
      required: ['estado', 'puntuacion', 'diagnostico', 'sintomas', 'causas', 'acciones'],
      properties: {
        estado: { type: 'string', enum: ['Excelente', 'Buena', 'Regular', 'Mala', 'Crítica'] },
        puntuacion: { type: 'integer', minimum: 0, maximum: 100 },
        diagnostico: { type: 'string', description: 'Qué se ve en ESTA foto concreta' },
        sintomas: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['sintoma', 'gravedad', 'donde'],
            properties: {
              sintoma: { type: 'string' },
              gravedad: { type: 'string', enum: ['leve', 'moderada', 'grave'] },
              donde: { type: 'string', description: 'En qué parte de la planta se aprecia' },
            },
          },
        },
        causas: { type: 'array', items: { type: 'string' } },
        acciones: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['accion', 'urgencia'],
            properties: {
              accion: { type: 'string' },
              urgencia: { type: 'string', enum: ['ahora', 'esta semana', 'mantenimiento'] },
            },
          },
        },
      },
    },
    riego: {
      type: 'object',
      additionalProperties: false,
      required: ['metodo', 'frecuencia_dias_verano', 'frecuencia_dias_invierno', 'cantidad', 'como_saber', 'senales_exceso', 'senales_falta', 'agua'],
      properties: {
        metodo: { type: 'string', description: 'Cómo regarla: por arriba, por inmersión, pulverizado...' },
        frecuencia_dias_verano: { type: 'integer', minimum: 1, maximum: 120 },
        frecuencia_dias_invierno: { type: 'integer', minimum: 1, maximum: 120 },
        cantidad: { type: 'string' },
        como_saber: { type: 'string', description: 'Prueba práctica para saber si toca regar' },
        senales_exceso: { type: 'array', items: { type: 'string' } },
        senales_falta: { type: 'array', items: { type: 'string' } },
        agua: { type: 'string', description: 'Tipo de agua y temperatura' },
      },
    },
    luz: {
      type: 'object',
      additionalProperties: false,
      required: ['exposicion', 'horas', 'ubicacion_ideal', 'evitar'],
      properties: {
        exposicion: { type: 'string', description: 'Sol directo, indirecto brillante, semisombra o sombra' },
        horas: { type: 'string' },
        ubicacion_ideal: { type: 'string', description: 'Dónde ponerla en casa, orientación de ventana' },
        evitar: { type: 'string' },
      },
    },
    ambiente: {
      type: 'object',
      additionalProperties: false,
      required: ['temp_ideal', 'temp_minima', 'temp_maxima', 'humedad', 'interior_exterior'],
      properties: {
        temp_ideal: { type: 'string' },
        temp_minima: { type: 'string' },
        temp_maxima: { type: 'string' },
        humedad: { type: 'string' },
        interior_exterior: { type: 'string' },
      },
    },
    sustrato: {
      type: 'object',
      additionalProperties: false,
      required: ['tipo', 'maceta', 'drenaje', 'abono', 'trasplante'],
      properties: {
        tipo: { type: 'string' },
        maceta: { type: 'string' },
        drenaje: { type: 'string' },
        abono: { type: 'string' },
        trasplante: { type: 'string' },
      },
    },
    cuidados: {
      type: 'object',
      additionalProperties: false,
      required: ['poda', 'plagas_comunes', 'propagacion', 'consejos', 'calendario'],
      properties: {
        poda: { type: 'string' },
        plagas_comunes: { type: 'array', items: { type: 'string' } },
        propagacion: { type: 'string' },
        consejos: { type: 'array', items: { type: 'string' } },
        calendario: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['estacion', 'tarea'],
            properties: {
              estacion: { type: 'string' },
              tarea: { type: 'string' },
            },
          },
        },
      },
    },
    resumen: { type: 'string', description: 'Dos o tres frases con lo esencial' },
  },
};

// Revisión de seguimiento: sólo salud, para comparar con la foto anterior.
const revision = {
  type: 'object',
  additionalProperties: false,
  required: ['salud', 'evolucion'],
  properties: {
    salud: ficha.properties.salud,
    evolucion: { type: 'string', description: 'Cómo ha cambiado respecto a la revisión anterior' },
  },
};

function cliente(apiKey) {
  if (!apiKey) throw new Error('Falta la API key. Ponla en Ajustes.');
  return new Anthropic({
    apiKey,
    // Necesario para llamar a la API desde el navegador: hace que el SDK envíe
    // la cabecera anthropic-dangerous-direct-browser-access y pase el CORS.
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
  });
}

function contexto(ajustes) {
  const trozos = [];
  if (ajustes.ubicacion) trozos.push(`Ubicación: ${ajustes.ubicacion}.`);
  if (ajustes.notas) trozos.push(`Condiciones del sitio: ${ajustes.notas}`);
  trozos.push(`Fecha de hoy: ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.`);
  return trozos.join(' ');
}

const SISTEMA = `Eres un botánico y fitopatólogo que ayuda a cuidar plantas a partir de fotos.

Trabajas sobre lo que realmente se ve en la imagen. Al valorar la salud describe los signos concretos de esa planta en esa foto (el tono exacto de una hoja, dónde empieza una mancha, si el tallo se comba) en lugar de síntomas genéricos de la especie. Si la foto no permite juzgar algo, dilo en vez de suponerlo.

Ajusta la confianza de la identificación a lo que la imagen sostiene: muchas plantas de interior sólo se distinguen por detalles que una foto puede no mostrar. Cuando dudes entre especies parecidas, indica la más probable y lista las otras.

Los cuidados que des tienen que ser accionables para alguien sin conocimientos: cantidades, plazos y pruebas caseras concretas, adaptados a la ubicación y las condiciones que te indique el usuario. Escribe en español de España.`;

function extraerJSON(respuesta) {
  if (respuesta.stop_reason === 'refusal') {
    throw new Error('Claude ha rechazado analizar esta imagen. Prueba con otra foto.');
  }
  if (respuesta.parsed_output) return respuesta.parsed_output;
  const texto = (respuesta.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  if (!texto.trim()) throw new Error('Claude ha devuelto una respuesta vacía.');
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error('No se ha podido leer la respuesta de Claude.');
  }
}

function bloqueImagen(base64, tipo) {
  return { type: 'image', source: { type: 'base64', media_type: tipo, data: base64 } };
}

/** Identifica la planta y evalúa su estado de salud en una sola llamada. */
export async function analizarPlanta({ apiKey, base64, tipoMime, ajustes }) {
  const respuesta = await cliente(apiKey).messages.create({
    model: MODELO,
    max_tokens: 8000,
    system: SISTEMA,
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: ficha },
    },
    messages: [
      {
        role: 'user',
        content: [
          bloqueImagen(base64, tipoMime),
          {
            type: 'text',
            text: `Identifica esta planta y dime cómo está de salud a partir de la foto, además de cómo cuidarla.\n\n${contexto(ajustes)}`,
          },
        ],
      },
    ],
  });
  return extraerJSON(respuesta);
}

/** Revisión posterior de una planta ya guardada, comparando con la anterior. */
export async function revisarSalud({ apiKey, base64, tipoMime, planta, ajustes }) {
  const anterior = planta.ficha?.salud;
  const previo = anterior
    ? `En la última revisión (${new Date(planta.ultimaRevision || planta.creada).toLocaleDateString('es-ES')}) el estado era "${anterior.estado}" (${anterior.puntuacion}/100): ${anterior.diagnostico}`
    : 'No hay revisión anterior con la que comparar.';

  const respuesta = await cliente(apiKey).messages.create({
    model: MODELO,
    max_tokens: 4000,
    system: SISTEMA,
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: revision },
    },
    messages: [
      {
        role: 'user',
        content: [
          bloqueImagen(base64, tipoMime),
          {
            type: 'text',
            text: `Nueva foto de mi ${planta.ficha.identificacion.nombre_comun} (${planta.ficha.identificacion.nombre_cientifico}). Dime cómo está ahora y si ha mejorado o empeorado.\n\n${previo}\n\n${contexto(ajustes)}`,
          },
        ],
      },
    ],
  });
  return extraerJSON(respuesta);
}

/** Mensaje de error legible a partir de un fallo del SDK. */
export function mensajeError(err) {
  const status = err?.status;
  if (status === 401) return 'API key inválida. Revísala en Ajustes.';
  if (status === 400 && /credit|balance/i.test(err?.message || '')) return 'Tu cuenta de Anthropic no tiene saldo.';
  if (status === 429) return 'Demasiadas peticiones seguidas. Espera un momento y reinténtalo.';
  if (status >= 500) return 'La API de Claude está dando problemas. Reinténtalo en un minuto.';
  if (/fetch|network|Connection/i.test(err?.message || '')) return 'Sin conexión. Comprueba tu red.';
  return err?.message || 'Ha ocurrido un error inesperado.';
}
