import crypto from 'node:crypto';

/**
 * Comparación en tiempo constante.
 *
 * Un `a === b` normal corta en el primer carácter distinto, así que el tiempo de
 * respuesta filtra cuántos caracteres ha acertado quien lo intenta, y el token se
 * puede adivinar letra a letra. timingSafeEqual siempre tarda lo mismo.
 */
function igualdadSegura(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  // timingSafeEqual exige la misma longitud, y esa comparación previa sí filtra
  // el tamaño del token. Es información inocua comparada con el contenido.
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Middleware de acceso.
 *
 * Si APP_TOKEN no está definido, la API queda abierta: es el modo cómodo para
 * usarla en tu red local. En cuanto la despliegues en internet, define APP_TOKEN
 * y solo tú podrás gastar tu saldo de API.
 */
export function requiereToken(req, res, next) {
  const esperado = process.env.APP_TOKEN;
  if (!esperado) return next();

  const recibido = req.get('X-App-Token') || '';
  if (!igualdadSegura(recibido, esperado)) {
    return res.status(401).json({ error: 'Token de acceso inválido.', necesitaToken: true });
  }
  next();
}

/**
 * Limitador de peticiones por IP, en memoria y sin dependencias.
 *
 * Protege el saldo de API: sin esto, un bucle en el navegador (o alguien que
 * encuentre la URL) puede lanzar cientos de generaciones seguidas.
 *
 * Al ser en memoria, se reinicia con el servidor y no se comparte entre varias
 * instancias. Para un despliegue de un solo proceso, que es este caso, sobra.
 */
export function creaLimitador({ maxPeticiones = 20, ventanaMs = 60 * 60 * 1000 } = {}) {
  const registro = new Map();

  return function limitador(req, res, next) {
    const ahora = Date.now();
    const ip = req.ip || 'desconocida';

    // Limpieza oportunista: sin esto el Map crece sin control con IPs viejas.
    for (const [clave, marcas] of registro) {
      const vivas = marcas.filter((t) => ahora - t < ventanaMs);
      if (vivas.length) registro.set(clave, vivas);
      else registro.delete(clave);
    }

    const marcas = registro.get(ip) ?? [];
    if (marcas.length >= maxPeticiones) {
      const esperaMs = ventanaMs - (ahora - marcas[0]);
      res.set('Retry-After', String(Math.ceil(esperaMs / 1000)));
      return res.status(429).json({
        error: `Límite alcanzado (${maxPeticiones} recetas por hora). Prueba en ${Math.ceil(esperaMs / 60000)} min.`,
      });
    }

    marcas.push(ahora);
    registro.set(ip, marcas);
    next();
  };
}
