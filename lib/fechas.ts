// Las fechas de entrega se manejan como texto "AAAA-MM-DD" (sin hora),
// y "hoy" siempre es hoy en Madrid, esté donde esté el cliente o el servidor.

const ZONA = "Europe/Madrid";

export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function hoyEnMadrid(ahora: Date = new Date()): string {
  // en-CA formatea como AAAA-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(ahora);
}

export function claveFecha(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function esFechaValida(clave: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clave)) return false;
  const [a, m, d] = clave.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

/** Se puede entregar a partir de mañana (hora de Madrid). */
export function esFechaEntregable(clave: string, ahora: Date = new Date()): boolean {
  return esFechaValida(clave) && clave > hoyEnMadrid(ahora);
}

/** "jueves 8 de octubre" */
export function fechaLarga(clave: string): string {
  const [a, m, d] = clave.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return `${DIAS_SEMANA[f.getUTCDay()]} ${d} de ${MESES[m - 1]}`;
}
