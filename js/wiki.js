// Descripción y foto de la especie desde Wikipedia. Sin clave y sin coste.

const IDIOMAS = ['es', 'en'];

/**
 * Devuelve { extracto, titulo, foto, enlace, idioma } o null.
 * Prueba primero el nombre científico y luego, si hay, el nombre común.
 */
export async function fichaWikipedia(nombreCientifico, nombreComun = '') {
  const candidatos = [nombreCientifico, nombreComun].filter(Boolean);
  for (const idioma of IDIOMAS) {
    for (const termino of candidatos) {
      const ficha = await resumen(idioma, termino);
      if (ficha) return ficha;
    }
  }
  return null;
}

async function resumen(idioma, termino) {
  try {
    // El endpoint REST sigue las redirecciones, así que "Potos" acaba en el
    // artículo correcto aunque el título exacto sea otro.
    const url = `https://${idioma}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(termino)}?redirect=true`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const d = await res.json();
    if (!d || d.type === 'disambiguation' || !d.extract) return null;

    return {
      extracto: d.extract,
      titulo: d.title,
      foto: d.originalimage?.source || d.thumbnail?.source || '',
      enlace: d.content_urls?.desktop?.page || `https://${idioma}.wikipedia.org/wiki/${encodeURIComponent(d.title)}`,
      idioma,
    };
  } catch {
    // Sin conexión o Wikipedia caída: la ficha se muestra igual sin esto.
    return null;
  }
}
