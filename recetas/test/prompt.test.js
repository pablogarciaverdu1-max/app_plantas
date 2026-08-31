import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildUserMessage, getContextoDia } from '../src/prompt.js';

const TZ = 'Europe/Madrid';

describe('getContextoDia', () => {
  it('distingue entre semana de fin de semana', () => {
    // 2026-09-02 es miércoles; 2026-09-05, sábado.
    assert.equal(getContextoDia(TZ, new Date('2026-09-02T10:00:00Z')).esFinDeSemana, false);
    assert.equal(getContextoDia(TZ, new Date('2026-09-05T10:00:00Z')).esFinDeSemana, true);
    assert.equal(getContextoDia(TZ, new Date('2026-09-06T10:00:00Z')).esFinDeSemana, true);
  });

  it('propone comida antes de las 17:00 y cena después', () => {
    // En septiembre Madrid va en UTC+2.
    assert.equal(getContextoDia(TZ, new Date('2026-09-02T11:00:00Z')).momentoSugerido, 'comida'); // 13:00
    assert.equal(getContextoDia(TZ, new Date('2026-09-02T19:00:00Z')).momentoSugerido, 'cena');   // 21:00
  });

  it('usa la hora local, no UTC', () => {
    // 23:30 UTC de un viernes ya es sábado 01:30 en Madrid.
    const ctx = getContextoDia(TZ, new Date('2026-09-04T23:30:00Z'));
    assert.equal(ctx.diaSemana, 'sábado');
    assert.equal(ctx.esFinDeSemana, true);
  });
});

describe('buildUserMessage', () => {
  it('incluye día y momento', () => {
    const { texto } = buildUserMessage({ momento: 'cena', timeZone: TZ });
    assert.match(texto, /Momento: cena/);
    assert.match(texto, /Día: \w+/);
  });

  it('lista los platos recientes para no repetirlos', () => {
    const { texto } = buildUserMessage({ platosRecientes: ['Poke de salmón'], timeZone: TZ });
    assert.match(texto, /NO los repitas/);
    assert.match(texto, /- Poke de salmón/);
  });

  it('omite el bloque de recientes cuando no hay historial', () => {
    const { texto } = buildUserMessage({ timeZone: TZ });
    assert.doesNotMatch(texto, /recientemente/);
  });

  it('corta el historial a 15 platos para no inflar el prompt', () => {
    const muchos = Array.from({ length: 40 }, (_, i) => `Plato ${i}`);
    const { texto } = buildUserMessage({ platosRecientes: muchos, timeZone: TZ });
    assert.equal(texto.match(/^- Plato /gm).length, 15);
  });

  it('respeta el momento pedido por encima del sugerido', () => {
    const { contexto } = buildUserMessage({ momento: 'comida', timeZone: TZ });
    assert.equal(contexto.momento, 'comida');
  });
});
