// Preparación de las fotos del iPhone antes de mandarlas a Pl@ntNet.
// Una foto del iPhone 12 son ~12 MP y 3-4 MB: enviarla entera es lento y caro,
// y para identificar la especie no hace falta más de ~1400 px de lado largo.

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

  return { blob, tipoMime: 'image/jpeg' };
}
