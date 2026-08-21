// Cálculo del calendario de riego a partir de la frecuencia de la ficha de cuidados.

const DIA_MS = 86400000;

/** De abril a septiembre usamos la frecuencia de verano; el resto, la de invierno. */
export function esTemporadaCalida(fecha = new Date()) {
  const mes = fecha.getMonth(); // 0 = enero
  return mes >= 3 && mes <= 8;
}

export function frecuenciaActual(planta, fecha = new Date()) {
  const r = planta?.cuidados?.riego;
  if (!r) return null;
  const dias = esTemporadaCalida(fecha) ? r.verano : r.invierno;
  return Number.isFinite(dias) && dias > 0 ? dias : null;
}

function soloFecha(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Devuelve { dias, proxima, diasRestantes, estado } o null si no hay datos.
 * estado: 'hoy' | 'atrasado' | 'pronto' | 'ok'
 */
export function estadoRiego(planta, ahora = new Date()) {
  const dias = frecuenciaActual(planta, ahora);
  if (!dias) return null;

  const ultimo = planta.ultimoRiego || planta.creada;
  if (!ultimo) return null;

  const proxima = soloFecha(new Date(new Date(ultimo).getTime() + dias * DIA_MS));
  const diasRestantes = Math.round((proxima - soloFecha(ahora)) / DIA_MS);

  let estado = 'ok';
  if (diasRestantes < 0) estado = 'atrasado';
  else if (diasRestantes === 0) estado = 'hoy';
  else if (diasRestantes <= 2) estado = 'pronto';

  return { dias, proxima, diasRestantes, estado };
}

export function textoRiego(info) {
  if (!info) return 'Sin calendario';
  const { diasRestantes, estado } = info;
  if (estado === 'atrasado') {
    const n = Math.abs(diasRestantes);
    return n === 1 ? 'Con 1 día de retraso' : `Con ${n} días de retraso`;
  }
  if (estado === 'hoy') return 'Toca regar hoy';
  if (diasRestantes === 1) return 'Riego mañana';
  return `Riego en ${diasRestantes} días`;
}

/** Plantas que piden agua ya, las más urgentes primero. */
export function pendientesDeRiego(plantas, ahora = new Date()) {
  return plantas
    .map((p) => ({ planta: p, info: estadoRiego(p, ahora) }))
    .filter((x) => x.info && (x.info.estado === 'atrasado' || x.info.estado === 'hoy'))
    .sort((a, b) => a.info.diasRestantes - b.info.diasRestantes);
}
