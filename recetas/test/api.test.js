import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

import { creaApp } from '../src/app.js';
import { creaLimitador } from '../src/seguridad.js';

const RECETA_FALSA = {
  receta: {
    nombre: 'Salteado de ternera con arroz basmati',
    porQueEncajaHoy: 'Recupera bien tras el WOD de hoy.',
    ingredientes: ['180 g de ternera', '80 g de arroz basmati'],
    pasos: ['Sella la ternera.', 'Cuece el arroz.'],
  },
  contexto: { diaSemana: 'martes', esFinDeSemana: false, momento: 'cena' },
};

/** Arranca la app en un puerto libre y devuelve helpers para llamarla. */
async function levanta(opciones = {}) {
  const servidor = creaApp(opciones).listen(0);
  await new Promise((listo) => servidor.once('listening', listo));
  const base = `http://127.0.0.1:${servidor.address().port}`;

  return {
    base,
    pide: (ruta, init) => fetch(base + ruta, init),
    receta: (cuerpo = {}, cabeceras = {}) =>
      fetch(base + '/api/receta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...cabeceras },
        body: JSON.stringify(cuerpo),
      }),
    cierra: () => new Promise((listo) => servidor.close(listo)),
  };
}

describe('API', () => {
  let srv;
  const generador = async () => RECETA_FALSA;

  before(async () => { srv = await levanta({ generador }); });
  after(async () => { await srv.cierra(); });
  beforeEach(() => { delete process.env.APP_TOKEN; });

  it('sirve el frontend', async () => {
    const res = await srv.pide('/');
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Dame una idea para comer hoy/);
  });

  it('GET /api/contexto devuelve el contexto del día', async () => {
    const datos = await (await srv.pide('/api/contexto')).json();
    assert.ok(['comida', 'cena'].includes(datos.momentoSugerido));
    assert.equal(typeof datos.esFinDeSemana, 'boolean');
  });

  it('POST /api/receta devuelve una receta completa', async () => {
    const res = await srv.receta({ momento: 'cena' });
    assert.equal(res.status, 200);

    const { receta } = await res.json();
    assert.equal(receta.nombre, RECETA_FALSA.receta.nombre);
    assert.ok(Array.isArray(receta.ingredientes) && receta.ingredientes.length);
    assert.ok(Array.isArray(receta.pasos) && receta.pasos.length);
  });

  it('rechaza un momento que no sea comida o cena', async () => {
    const res = await srv.receta({ momento: 'desayuno' });
    assert.equal(res.status, 400);
  });

  it('sobrevive a un cuerpo vacío', async () => {
    const res = await fetch(srv.base + '/api/receta', { method: 'POST' });
    assert.equal(res.status, 200);
  });
});

describe('errores de la IA', () => {
  it('devuelve 500 con mensaje útil si el generador falla', async () => {
    const srv = await levanta({ generador: async () => { throw new Error('boom'); } });
    const res = await srv.receta({});

    assert.equal(res.status, 500);
    assert.match((await res.json()).error, /No se pudo generar/);
    // El detalle interno no debe filtrarse al cliente.
    assert.doesNotMatch((await srv.receta({})).headers.get('content-type'), /html/);
    await srv.cierra();
  });
});

describe('token de acceso', () => {
  let srv;
  before(async () => { srv = await levanta({ generador: async () => RECETA_FALSA }); });
  after(async () => { delete process.env.APP_TOKEN; await srv.cierra(); });

  it('deja pasar a todo el mundo si no hay APP_TOKEN', async () => {
    delete process.env.APP_TOKEN;
    assert.equal((await srv.receta({})).status, 200);
  });

  it('rechaza sin token cuando APP_TOKEN está definido', async () => {
    process.env.APP_TOKEN = 'secreto-largo-123';
    const res = await srv.receta({});
    assert.equal(res.status, 401);
    assert.equal((await res.json()).necesitaToken, true);
  });

  it('rechaza un token incorrecto', async () => {
    process.env.APP_TOKEN = 'secreto-largo-123';
    assert.equal((await srv.receta({}, { 'X-App-Token': 'otro-token-distin' })).status, 401);
  });

  it('acepta el token correcto', async () => {
    process.env.APP_TOKEN = 'secreto-largo-123';
    assert.equal((await srv.receta({}, { 'X-App-Token': 'secreto-largo-123' })).status, 200);
  });

  it('anuncia en /api/contexto si hace falta token', async () => {
    process.env.APP_TOKEN = 'secreto-largo-123';
    assert.equal((await (await srv.pide('/api/contexto')).json()).necesitaToken, true);
  });
});

describe('límite de peticiones', () => {
  it('corta al superar el máximo y avisa cuándo reintentar', async () => {
    const srv = await levanta({
      generador: async () => RECETA_FALSA,
      limitador: creaLimitador({ maxPeticiones: 3, ventanaMs: 60_000 }),
    });

    for (let i = 0; i < 3; i++) {
      assert.equal((await srv.receta({})).status, 200, `la petición ${i + 1} debería pasar`);
    }

    const cortada = await srv.receta({});
    assert.equal(cortada.status, 429);
    assert.ok(Number(cortada.headers.get('Retry-After')) > 0);
    assert.match((await cortada.json()).error, /Límite alcanzado/);

    await srv.cierra();
  });
});
