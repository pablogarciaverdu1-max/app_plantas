/** Player-facing strings. Spanish is the default and only locale for now. */
const es = {
  title: 'Bocage 44',
  subtitle: 'Normandía, 6 de junio de 1944',
  clickToPlay: 'Haz clic para empezar',
  phaseNote: 'Prueba de combate · enemigos al norte',
  controlsHint:
    'WASD mover · Mayús esprintar (apuntando: aguantar la respiración) · X andar/trotar · C agacharse · Z tumbarse · Q/E inclinarse · Espacio saltar/trepar · clic izq. disparar · clic der. apuntar · R recargar (mantener: comprobar cargador) · 1/2 arma · V vendarse · T/Y hora · Esc pausa',
  ammoFull: 'Cargador lleno.',
  ammoNearlyFull: 'Casi lleno.',
  ammoOverHalf: 'Más de la mitad.',
  ammoUnderHalf: 'Menos de la mitad.',
  ammoNearlyEmpty: 'Casi vacío.',
  ammoEmpty: 'Vacío.',
  noAmmo: 'No queda munición para esta arma.',
  bandaging: 'Vendándote…',
  bandageDone: 'Herida vendada.',
  notBleeding: 'No sangras.',
  noBandages: 'No te quedan vendas.',
  dead: 'Has caído',
  retry: 'Haz clic para volver a intentarlo',
  waveIncoming: 'Se oyen voces al norte.',
};

export type TextKey = keyof typeof es;

export function t(key: TextKey): string {
  return es[key];
}
