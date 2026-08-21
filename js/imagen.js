// Preparación de las fotos del iPhone antes de mandarlas a Claude.
// Una foto del iPhone 12 son ~12 MP y 3-4 MB: enviarla entera es lento y caro,
// y la API no gana nada por encima de ~1568 px de lado largo.

const LADO_MAX = 1400;
const CALIDAD = 0.85;

async function aBitmap(file) {
  // createImageBitmap con from-image aplica la orientación EXIF (fotos hechas
  // en vertical con el móvil), que si no saldrían giradas.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* Safari antiguo: seguimos por la vía del <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'sync';
    await new Promise((ok, ko) => {
      img.onload = ok;
      img.onerror = () => ko(new Error('No se ha podido abrir la imagen.'));
      img.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/**
 * Reduce la foto y devuelve { blob, base64, tipoMime } listos para guardar y enviar.
 */
export async function prepararFoto(file) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Ese archivo no es una imagen.');
  }
  const bitmap = await aBitmap(file);
  const ancho = bitmap.width || bitmap.naturalWidth;
  const alto = bitmap.height || bitmap.naturalHeight;
  if (!ancho || !alto) throw new Error('No se ha podido leer la imagen.');

  const escala = Math.min(1, LADO_MAX / Math.max(ancho, alto));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(ancho * escala);
  canvas.height = Math.round(alto * escala);

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if (bitmap.close) bitmap.close();

  const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', CALIDAD));
  if (!blob) throw new Error('No se ha podido procesar la imagen.');

  const base64 = await new Promise((ok, ko) => {
    const lector = new FileReader();
    lector.onload = () => ok(String(lector.result).split(',')[1]);
    lector.onerror = () => ko(new Error('No se ha podido codificar la imagen.'));
    lector.readAsDataURL(blob);
  });

  return { blob, base64, tipoMime: 'image/jpeg' };
}

/**
 * Busca una foto de referencia de la especie en Wikipedia (nombre científico).
 * Es opcional: si falla, la ficha se muestra igual sin ella.
 */
export async function fotoDeReferencia(nombreCientifico) {
  if (!nombreCientifico) return null;
  for (const idioma of ['es', 'en']) {
    try {
      const url =
        `https://${idioma}.wikipedia.org/w/api.php?action=query&format=json&origin=*` +
        `&prop=pageimages&piprop=original|thumbnail&pithumbsize=900&redirects=1` +
        `&titles=${encodeURIComponent(nombreCientifico)}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const datos = await res.json();
      const paginas = datos?.query?.pages || {};
      for (const clave of Object.keys(paginas)) {
        const p = paginas[clave];
        const src = p?.original?.source || p?.thumbnail?.source;
        if (src) {
          return { src, titulo: p.title, idioma, enlace: `https://${idioma}.wikipedia.org/wiki/${encodeURIComponent(p.title)}` };
        }
      }
    } catch {
      /* Sin conexión o Wikipedia caída: no es crítico */
    }
  }
  return null;
}
