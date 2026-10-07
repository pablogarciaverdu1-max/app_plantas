/** Player-facing strings. Spanish is the default and only locale for now. */
const es = {
  title: 'Bocage 44',
  subtitle: 'Normandía, 6 de junio de 1944',
  clickToPlay: 'Haz clic para empezar',
  phaseNote: 'Fase 1 · movimiento',
  controlsHint: 'WASD mover · Mayús esprintar · X andar/trotar · C agacharse · Z tumbarse · Q/E inclinarse · Espacio saltar/trepar · T/Y hora · Esc salir',
};

export type TextKey = keyof typeof es;

export function t(key: TextKey): string {
  return es[key];
}
