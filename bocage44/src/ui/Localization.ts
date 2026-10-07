/** Player-facing strings. Spanish is the default and only locale for now. */
const es = {
  title: 'Bocage 44',
  subtitle: 'Normandía, 6 de junio de 1944',
  clickToPlay: 'Haz clic para empezar',
  phaseNote: 'Fase 0 · escena de prueba',
  controlsHint: 'Ratón: mirar · Esc: soltar el ratón',
};

export type TextKey = keyof typeof es;

export function t(key: TextKey): string {
  return es[key];
}
