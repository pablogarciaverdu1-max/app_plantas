// Verdín — lógica de la interfaz.
import * as db from './db.js';
import { identificar } from './plantnet.js';
import { cuidadosDe } from './cuidados.js';
import { fichaWikipedia } from './wiki.js';
import { prepararFoto } from './imagen.js';
import { estadoRiego, textoRiego, pendientesDeRiego, frecuenciaActual } from './riego.js';

const $ = (sel) => document.querySelector(sel);
const vistas = {
  inicio: $('#v-inicio'),
  cargando: $('#v-cargando'),
  ficha: $('#v-ficha'),
  ajustes: $('#v-ajustes'),
  error: $('#v-error'),
};

let ajustes = db.getAjustes();
let vistaActual = 'inicio';
let plantaAbierta = null;
let identificando = false;
const urlsCreadas = new Set();

// ---------- Utilidades ----------

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const lista = (arr) => (Array.isArray(arr) ? arr : []);

function fecha(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function mayus(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Nombre que se muestra: el común si lo hay, si no el científico. */
function nombreVisible(especie, cuidados) {
  return mayus(especie.comunes?.[0] || cuidados?.nombre || especie.cientifico);
}

let temporizadorBrindis;
function brindis(texto) {
  const el = $('#brindis');
  el.textContent = texto;
  el.classList.add('visible');
  clearTimeout(temporizadorBrindis);
  temporizadorBrindis = setTimeout(() => el.classList.remove('visible'), 2800);
}

async function urlFoto(id) {
  const url = await db.getPhotoURL(id);
  if (url) urlsCreadas.add(url);
  return url;
}

function limpiarURLs() {
  for (const u of urlsCreadas) URL.revokeObjectURL(u);
  urlsCreadas.clear();
}

// ---------- Navegación ----------

function mostrar(nombre, { titulo, atras } = {}) {
  vistaActual = nombre;
  for (const [clave, el] of Object.entries(vistas)) el.hidden = clave !== nombre;

  $('#titulo-barra').textContent = titulo || 'Verdín';
  $('#btn-atras').hidden = !atras;
  $('#hueco-izq').hidden = !!atras;
  $('#btn-ajustes').hidden = nombre === 'ajustes';
  $('#barra').classList.toggle('con-borde', nombre !== 'inicio');

  for (const b of document.querySelectorAll('.pestanas button')) {
    b.classList.toggle('activa', b.dataset.ir === nombre);
  }
  window.scrollTo(0, 0);
}

async function irAInicio() {
  plantaAbierta = null;
  // Pintamos antes de mostrar: si no, asoma un instante el estado vacío
  // mientras se leen las plantas de IndexedDB.
  await pintarInicio();
  mostrar('inicio');
}

// ---------- Pantalla de inicio ----------

async function pintarInicio() {
  const plantas = await db.allPlants();

  const pendientes = pendientesDeRiego(plantas);
  $('#s-avisos').hidden = pendientes.length === 0;
  if (pendientes.length) {
    const filas = pendientes.map(({ planta, info }) => `
      <div class="aviso ${info.estado === 'atrasado' ? 'urgente' : ''}">
        <span class="gota">💧</span>
        <span class="txt">
          <b>${esc(planta.nombre)}</b>
          <span>${esc(textoRiego(info))}</span>
        </span>
        <button class="regar" data-regar="${esc(planta.id)}">Regada</button>
      </div>`);
    $('#lista-avisos').innerHTML = filas.join('');
  }

  const rejilla = $('#rejilla-inicio');
  $('#titulo-plantas').textContent = plantas.length ? `Mis plantas · ${plantas.length}` : 'Mis plantas';
  $('#vacio-inicio').hidden = plantas.length > 0;
  rejilla.hidden = plantas.length === 0;

  if (plantas.length) {
    const tarjetas = await Promise.all(
      plantas.map(async (p) => {
        const url = await urlFoto(p.fotoId);
        const info = estadoRiego(p);
        return `
          <button class="planta-card" data-abrir="${esc(p.id)}">
            ${url ? `<img class="foto" src="${esc(url)}" alt="${esc(p.nombre)}" loading="lazy">` : '<div class="foto"></div>'}
            <span class="info">
              <b>${esc(p.nombre)}</b>
              <i>${esc(p.especie.cientifico)}</i>
              <span class="pastilla">${esc(info ? textoRiego(info) : 'Sin calendario')}</span>
            </span>
          </button>`;
      })
    );
    rejilla.innerHTML = tarjetas.join('');
  }
}

// ---------- Ficha de la planta ----------

function bloqueCuidados(c) {
  return `
    <div class="datos">
      <div class="tarjeta dato">
        <div class="et">💧 Riego</div>
        <div class="va">Cada ${c.riego.verano} d. en verano</div>
        <div class="su">Cada ${c.riego.invierno} días en invierno · ${esc(c.riego.cantidad)}</div>
      </div>
      <div class="tarjeta dato">
        <div class="et">☀️ Luz</div>
        <div class="va">${esc(c.luz.exposicion)}</div>
        <div class="su">${esc(c.luz.horas)}</div>
      </div>
      <div class="tarjeta dato">
        <div class="et">🌡️ Temperatura</div>
        <div class="va">${esc(c.ambiente.tempIdeal)}</div>
        <div class="su">Mín. ${esc(c.ambiente.tempMin)} · máx. ${esc(c.ambiente.tempMax)}</div>
      </div>
      <div class="tarjeta dato">
        <div class="et">💨 Humedad</div>
        <div class="va">${esc(c.ambiente.humedad)}</div>
        <div class="su">${esc(c.ambiente.sitio)}</div>
      </div>
      <div class="tarjeta dato ancho">
        <div class="et">📍 Dónde ponerla</div>
        <div class="va">${esc(c.luz.ubicacion)}</div>
        <div class="su">Evita: ${esc(c.luz.evitar)}</div>
      </div>
    </div>

    <details class="plegable tarjeta">
      <summary>Cómo regarla bien</summary>
      <div class="cuerpo"><dl>
        <div><dt>Método</dt><dd>${esc(c.riego.metodo)}</dd></div>
        <div><dt>Cómo saber si toca</dt><dd>${esc(c.riego.comoSaber)}</dd></div>
        <div><dt>Agua</dt><dd>${esc(c.riego.agua)}</dd></div>
      </dl></div>
    </details>

    <details class="plegable tarjeta">
      <summary>Tierra, maceta y abono</summary>
      <div class="cuerpo"><dl>
        <div><dt>Sustrato</dt><dd>${esc(c.sustrato.tipo)}</dd></div>
        <div><dt>Maceta</dt><dd>${esc(c.sustrato.maceta)}</dd></div>
        <div><dt>Abono</dt><dd>${esc(c.sustrato.abono)}</dd></div>
        <div><dt>Trasplante</dt><dd>${esc(c.sustrato.trasplante)}</dd></div>
      </dl></div>
    </details>

    <details class="plegable tarjeta">
      <summary>Poda, plagas y esquejes</summary>
      <div class="cuerpo"><dl>
        <div><dt>Poda</dt><dd>${esc(c.extras.poda)}</dd></div>
        <div><dt>Plagas frecuentes</dt><dd><ul>${lista(c.extras.plagas).map((p) => `<li>${esc(p)}</li>`).join('')}</ul></dd></div>
        <div><dt>Reproducción</dt><dd>${esc(c.extras.propagacion)}</dd></div>
        <div><dt>Mascotas</dt><dd>${esc(c.toxica)}</dd></div>
      </dl></div>
    </details>

    ${lista(c.extras.consejos).length ? `
    <details class="plegable tarjeta" open>
      <summary>Consejos</summary>
      <div class="cuerpo"><ul>${lista(c.extras.consejos).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    </details>` : ''}`;
}

function bloqueSinCuidados(especie) {
  return `
    <div class="tarjeta aviso-info">
      <b>No tengo ficha de cuidados de esta especie</b>
      <p>Mi base de datos cubre las plantas de interior y balcón más habituales, y
      <i>${esc(especie.cientifico)}</i> no está entre ellas. Te dejo abajo lo que
      cuenta Wikipedia sobre ella.</p>
    </div>`;
}

async function pintarFicha(planta) {
  plantaAbierta = planta;
  const e = planta.especie;
  const c = planta.cuidados;
  const w = planta.wiki;
  const info = estadoRiego(planta);
  const url = await urlFoto(planta.fotoId);
  const refs = lista(e.referencias);

  vistas.ficha.innerHTML = `
    <div class="ficha-foto">
      ${url ? `<img src="${esc(url)}" alt="${esc(planta.nombre)}">` : ''}
      <span class="etiqueta">Tu foto · ${esc(fecha(planta.creada))}</span>
    </div>

    <div class="titulo-planta">
      <h2>${esc(planta.nombre)}</h2>
      <div class="cientifico">${esc(e.cientifico)}</div>
      <div class="meta">
        ${e.familia ? `<span class="chip">${esc(e.familia)}</span>` : ''}
        ${c ? `<span class="chip">Cuidado ${esc(c.dificultad.toLowerCase())}</span>` : ''}
        <span class="chip">Certeza ${e.certeza}%</span>
      </div>
      ${e.comunes.length > 1 ? `<p class="otros-nombres">También: ${esc(e.comunes.slice(1, 4).join(', '))}</p>` : ''}
    </div>

    ${w?.extracto ? `<p class="resumen">${esc(w.extracto)}</p>` : ''}

    ${e.certeza < 60 && lista(planta.alternativas).length ? `
      <details class="plegable tarjeta">
        <summary>La certeza es baja: podría ser otra</summary>
        <div class="cuerpo"><ul>${lista(planta.alternativas).map((a) =>
          `<li><b>${esc(a.cientifico)}</b> · ${a.certeza}%${a.comunes[0] ? ` · ${esc(a.comunes[0])}` : ''}</li>`
        ).join('')}</ul></div>
      </details>` : ''}

    ${c ? bloqueCuidados(c) : bloqueSinCuidados(e)}

    ${info ? `
      <div class="tarjeta dato ancho" style="margin-top:10px">
        <div class="et">🗓️ Próximo riego</div>
        <div class="va">${esc(textoRiego(info))}</div>
        <div class="su">${esc(info.proxima.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }))}</div>
      </div>` : ''}

    ${refs.length ? `
      <div class="seccion">
        <h3>Fotos de referencia</h3>
        <div class="galeria">
          ${refs.map((r) => `
            <figure>
              <img src="${esc(r.url)}" alt="${esc(e.cientifico)}" loading="lazy">
              <figcaption>${esc(r.organo || '')}${r.autor ? ` · ${esc(r.autor)}` : ''}</figcaption>
            </figure>`).join('')}
        </div>
        <p class="creditos">Fotos de Pl@ntNet y su comunidad.</p>
      </div>` : ''}

    ${w ? `
      <a class="boton-secundario" href="${esc(w.enlace)}" target="_blank" rel="noopener" style="margin-top:16px">
        Leer más en Wikipedia
      </a>` : ''}

    <div class="acciones-ficha">
      ${c ? '<button class="boton-secundario" id="btn-regada">💧 La he regado</button>' : ''}
      <button class="boton-secundario btn-peligro" id="btn-borrar-planta">Eliminar</button>
    </div>
  `;

  mostrar('ficha', { titulo: planta.nombre, atras: true });
}

/** Muestra el fallo a pantalla completa: algunos mensajes son instrucciones. */
function mostrarError(err) {
  $('#error-texto').textContent = err.message;
  $('#error-dominio').textContent = err.dominio || '';
  $('#error-dominio').hidden = !err.dominio;
  $('#error-nota').textContent = err.nota || '';
  $('#error-nota').hidden = !err.nota;
  const enlace = $('#error-enlace');
  if (err.ayuda) {
    enlace.href = err.ayuda;
    enlace.hidden = false;
  } else {
    enlace.hidden = true;
  }
  mostrar('error', { titulo: 'Error', atras: true });
}

// ---------- Identificación ----------

async function procesarFoto(file) {
  if (identificando) return;
  if (!ajustes.plantnetKey) {
    brindis('Primero pon tu clave de Pl@ntNet en Ajustes');
    abrirAjustes();
    return;
  }

  let foto;
  try {
    foto = await prepararFoto(file);
  } catch (err) {
    brindis(err.message);
    return;
  }

  const previaURL = URL.createObjectURL(foto.blob);
  urlsCreadas.add(previaURL);
  $('#previa-cargando').src = previaURL;
  $('#previa-cargando').hidden = false;
  mostrar('cargando', { titulo: 'Identificando' });

  identificando = true;
  try {
    const { mejor, alternativas } = await identificar({ apiKey: ajustes.plantnetKey, blob: foto.blob });

    // Los cuidados salen de la base local; la descripción, de Wikipedia.
    const cuidados = cuidadosDe(mejor.cientifico, mejor.genero);
    const wiki = await fichaWikipedia(mejor.cientifico, mejor.comunes[0]);

    const id = crypto.randomUUID();
    const fotoId = `f-${id}`;
    await db.savePhoto(fotoId, foto.blob);

    const planta = {
      id,
      fotoId,
      nombre: nombreVisible(mejor, cuidados),
      especie: mejor,
      alternativas,
      cuidados,
      wiki,
      creada: new Date().toISOString(),
      ultimoRiego: null,
    };
    await db.savePlant(planta);
    await pintarFicha(planta);
    brindis(cuidados ? `Guardada: ${planta.nombre}` : `${planta.nombre}, sin ficha de cuidados`);
  } catch (err) {
    console.error(err);
    mostrarError(err);
  } finally {
    identificando = false;
  }
}

// ---------- Acciones ----------

async function marcarRegada(id) {
  const planta = await db.getPlant(id);
  if (!planta) return;
  planta.ultimoRiego = new Date().toISOString();
  await db.savePlant(planta);

  const dias = frecuenciaActual(planta);
  brindis(dias ? `Anotado. Siguiente riego en ${dias} días` : 'Riego anotado');

  if (vistaActual === 'ficha' && plantaAbierta?.id === id) await pintarFicha(planta);
  else await pintarInicio();
}

function pedirFoto(origen = 'camara') {
  if (identificando) {
    brindis('Espera a que termine la identificación');
    return;
  }
  $(origen === 'camara' ? '#entrada-camara' : '#entrada-galeria').click();
}

function abrirAjustes() {
  ajustes = db.getAjustes();
  $('#in-key').value = ajustes.plantnetKey;
  // Pl@ntNet exige autorizar el dominio desde el que se llama, así que se lo
  // enseñamos ya escrito en vez de que tenga que adivinarlo.
  $('#dominio-actual').textContent = location.origin || '(abierta como archivo local)';
  mostrar('ajustes', { titulo: 'Ajustes', atras: true });
}

// ---------- Eventos ----------

$('#btn-camara').addEventListener('click', () => pedirFoto('camara'));
$('#btn-galeria').addEventListener('click', () => pedirFoto('galeria'));
$('#btn-ajustes').addEventListener('click', abrirAjustes);
$('#btn-atras').addEventListener('click', irAInicio);
$('#btn-error-volver').addEventListener('click', irAInicio);

for (const entrada of [$('#entrada-camara'), $('#entrada-galeria')]) {
  entrada.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir la misma foto
    if (file) procesarFoto(file);
  });
}

document.querySelector('.pestanas').addEventListener('click', (e) => {
  const boton = e.target.closest('button[data-ir]');
  if (!boton) return;
  const destino = boton.dataset.ir;
  if (destino === 'camara') pedirFoto('camara');
  else if (destino === 'ajustes') abrirAjustes();
  else irAInicio();
});

vistas.inicio.addEventListener('click', async (e) => {
  const regar = e.target.closest('[data-regar]');
  if (regar) return marcarRegada(regar.dataset.regar);

  const abrir = e.target.closest('[data-abrir]');
  if (abrir) {
    const planta = await db.getPlant(abrir.dataset.abrir);
    if (planta) await pintarFicha(planta);
  }
});

vistas.ficha.addEventListener('click', async (e) => {
  if (e.target.closest('#btn-regada')) return marcarRegada(plantaAbierta.id);

  if (e.target.closest('#btn-borrar-planta')) {
    if (!confirm(`¿Eliminar ${plantaAbierta.nombre}?`)) return;
    await db.deletePlant(plantaAbierta.id);
    brindis('Planta eliminada');
    await irAInicio();
  }
});

$('#btn-guardar-ajustes').addEventListener('click', async () => {
  ajustes = db.setAjustes({ plantnetKey: $('#in-key').value.trim() });
  brindis('Ajustes guardados');
  await irAInicio();
});

$('#btn-borrar-todo').addEventListener('click', async () => {
  if (!confirm('Se borrarán todas tus plantas y fotos de este iPhone. ¿Seguro?')) return;
  limpiarURLs();
  await db.wipeAll();
  ajustes = db.getAjustes();
  brindis('Todo borrado');
  await irAInicio();
});

// ---------- Arranque ----------

async function arrancar() {
  ajustes = db.getAjustes();
  await irAInicio();

  if (!ajustes.plantnetKey) {
    const plantas = await db.allPlants();
    if (!plantas.length) brindis('Añade tu clave gratuita de Pl@ntNet en Ajustes');
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* Sin service worker la app sigue funcionando, sólo pierde el modo offline */
    });
  }
}

window.addEventListener('pagehide', limpiarURLs);

arrancar().catch((err) => {
  console.error(err);
  vistas.inicio.insertAdjacentHTML(
    'afterbegin',
    `<div class="error-caja">No se ha podido iniciar la app: ${esc(err.message)}</div>`
  );
});
