// Identificación de especies con la API de Pl@ntNet.
// Gratuita hasta 500 identificaciones al día. Se llama directamente desde el
// navegador; para eso hay que autorizar el dominio en my.plantnet.org.

const API = 'https://my-api.plantnet.org/v2/identify';

/**
 * Identifica la planta de una foto.
 * Devuelve { mejor, alternativas } donde cada entrada es
 * { cientifico, genero, familia, comunes[], certeza, referencias[] }.
 */
export async function identificar({ apiKey, blob, proyecto = 'all' }) {
  if (!apiKey) throw new Error('Falta la clave de Pl@ntNet. Ponla en Ajustes.');

  const formulario = new FormData();
  formulario.append('images', blob, 'planta.jpg');
  // 'auto' deja que Pl@ntNet decida si mira una hoja, una flor o la corteza.
  formulario.append('organs', 'auto');

  const url = `${API}/${encodeURIComponent(proyecto)}` +
    `?api-key=${encodeURIComponent(apiKey)}&lang=es&include-related-images=true`;

  let respuesta;
  try {
    respuesta = await fetch(url, { method: 'POST', body: formulario });
  } catch {
    // fetch solo rechaza por dos motivos: no hay red, o el navegador ha
    // bloqueado la petición por CORS. Distinguirlos importa, porque el segundo
    // caso tiene una causa concreta y una solución concreta.
    if (navigator.onLine === false) {
      throw new Error('Sin conexión. Comprueba tu red y vuelve a intentarlo.');
    }
    const err = new Error(
      'El navegador ha bloqueado la petición a Pl@ntNet, y eso casi siempre significa que falta autorizar este dominio.\n\n' +
      'Entra en my.plantnet.org, abre la configuración de tu clave, marca «expose my API key» y añade este dominio en «Authorized domains»:'
    );
    err.dominio = location.hostname;
    err.nota = 'Va sin «https://» y sin barra al final. Cuando lo guardes, recarga la app.';
    err.ayuda = 'https://my.plantnet.org/';
    throw err;
  }

  if (!respuesta.ok) throw new Error(await mensajeDeError(respuesta));

  const datos = await respuesta.json();
  const resultados = Array.isArray(datos.results) ? datos.results : [];
  if (!resultados.length) {
    throw new Error('No he reconocido ninguna planta en esta foto. Prueba a acercarte a una hoja o a una flor.');
  }

  const normalizados = resultados.slice(0, 5).map(normalizar);
  return { mejor: normalizados[0], alternativas: normalizados.slice(1) };
}

function normalizar(resultado) {
  const especie = resultado.species || {};
  return {
    cientifico: especie.scientificNameWithoutAuthor || especie.scientificName || 'Desconocida',
    genero: especie.genus?.scientificNameWithoutAuthor || '',
    familia: especie.family?.scientificNameWithoutAuthor || '',
    comunes: Array.isArray(especie.commonNames) ? especie.commonNames.filter(Boolean) : [],
    certeza: Math.round((resultado.score || 0) * 100),
    referencias: extraerImagenes(resultado.images),
  };
}

// Fotos de referencia que devuelve la propia Pl@ntNet, con su autoría.
function extraerImagenes(imagenes) {
  if (!Array.isArray(imagenes)) return [];
  return imagenes
    .map((img) => ({
      url: img?.url?.m || img?.url?.o || img?.url?.s || '',
      organo: img?.organ || '',
      autor: img?.author || '',
      licencia: img?.license || '',
    }))
    .filter((img) => img.url)
    .slice(0, 6);
}

async function mensajeDeError(respuesta) {
  if (respuesta.status === 401 || respuesta.status === 403) {
    return 'Clave de Pl@ntNet inválida, o el dominio de la app no está autorizado en my.plantnet.org.';
  }
  if (respuesta.status === 404) {
    return 'Pl@ntNet no ha encontrado coincidencias para esta foto.';
  }
  if (respuesta.status === 429) {
    return 'Has agotado las 500 identificaciones gratuitas de hoy. Vuelve a probar mañana.';
  }
  if (respuesta.status >= 500) return 'Pl@ntNet está dando problemas. Reinténtalo en un minuto.';
  try {
    const cuerpo = await respuesta.json();
    if (cuerpo?.message) return `Pl@ntNet: ${cuerpo.message}`;
  } catch {
    /* la respuesta no era JSON */
  }
  return `Pl@ntNet ha respondido con un error (${respuesta.status}).`;
}
