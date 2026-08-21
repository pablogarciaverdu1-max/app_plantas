// Verdín — lógica de la interfaz.
import * as db from './db.js';
import { analizarPlanta, revisarSalud, mensajeError } from './claude.js';
import { prepararFoto, fotoDeReferencia } from './imagen.js';
import { estadoRiego, textoRiego, pendientesDeRiego, frecuenciaActual } from './riego.js';

const $ = (sel) => document.querySelector(sel);
const vistas = {
  inicio: $('#v-inicio'),
  cargando: $('#v-cargando'),
  ficha: $('#v-ficha'),
  ajustes: $('#v-ajustes'),
};

let ajustes = db.getAjustes();
let vistaActual = 'inicio';
let plantaAbierta = null;
let modoFoto = 'nueva'; // 'nueva' | 'revision'
let analizando = false; // evita lanzar dos análisis a la vez: cada uno se cobra
const urlsCreadas = new Set();

// ---------- Utilidades ----------

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const lista = (arr) => (Array.isArray(arr) ? arr : []);

function fecha(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

// El color se saca del estado, no de la puntuación, para que la barra y la
// pastilla ("Regular", "Mala"…) no se contradigan nunca.
const COLOR_ESTADO = {
  Excelente: 'var(--bien)',
  Buena: 'var(--bien)',
  Regular: 'var(--regular)',
  Mala: 'var(--mal)',
  'Crítica': 'var(--critico)',
};
const colorSalud = (estado) => COLOR_ESTADO[estado] || 'var(--verde-claro)';

let temporizadorBrindis;
function brindis(texto) {
  const el = $('#brindis');
  el.textContent = texto;
  el.classList.add('visible');
  clearTimeout(temporizadorBrindis);
  temporizadorBrindis = setTimeout(() => el.classList.remove('visible'), 2600);
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

  // Avisos de riego
  const pendientes = pendientesDeRiego(plantas);
  const secAvisos = $('#s-avisos');
  secAvisos.hidden = pendientes.length === 0;
  if (pendientes.length) {
    const filas = await Promise.all(
      pendientes.map(async ({ planta, info }) => {
        const url = await urlFoto(planta.fotoId);
        return `
          <div class="aviso ${info.estado === 'atrasado' ? 'urgente' : ''}">
            <span class="gota">💧</span>
            <span class="txt">
              <b>${esc(planta.ficha.identificacion.nombre_comun)}</b>
              <span>${esc(textoRiego(info))}</span>
            </span>
            <button class="regar" data-regar="${esc(planta.id)}">Regada</button>
          </div>`;
      })
    );
    $('#lista-avisos').innerHTML = filas.join('');
  }

  // Rejilla de plantas
  const vacio = $('#vacio-inicio');
  const rejilla = $('#rejilla-inicio');
  $('#titulo-plantas').textContent = plantas.length ? `Mis plantas · ${plantas.length}` : 'Mis plantas';
  vacio.hidden = plantas.length > 0;
  rejilla.hidden = plantas.length === 0;

  if (plantas.length) {
    const tarjetas = await Promise.all(
      plantas.map(async (p) => {
        const url = await urlFoto(p.fotoId);
        const salud = p.ficha.salud;
        return `
          <button class="planta-card" data-abrir="${esc(p.id)}">
            ${url ? `<img class="foto" src="${esc(url)}" alt="${esc(p.ficha.identificacion.nombre_comun)}" loading="lazy">` : '<div class="foto"></div>'}
            <span class="info">
              <b>${esc(p.ficha.identificacion.nombre_comun)}</b>
              <i>${esc(p.ficha.identificacion.nombre_cientifico)}</i>
              <span class="pastilla s-${esc(salud.estado)}">${esc(salud.estado)}</span>
            </span>
          </button>`;
      })
    );
    rejilla.innerHTML = tarjetas.join('');
  }
}

// ---------- Ficha de la planta ----------

function bloqueSalud(salud, titulo = 'Estado de salud') {
  const sintomas = lista(salud.sintomas);
  const acciones = lista(salud.acciones);
  return `
    <div class="tarjeta salud">
      <div class="cab">
        <h3>${esc(titulo)}</h3>
        <span class="pastilla s-${esc(salud.estado)}">${esc(salud.estado)} · ${salud.puntuacion}/100</span>
      </div>
      <div class="barra-salud"><div style="width:${salud.puntuacion}%;background:${colorSalud(salud.estado)}"></div></div>
      <p class="diagnostico">${esc(salud.diagnostico)}</p>

      ${sintomas.length ? `<div class="sintomas">${sintomas.map((s) => `
        <div class="sintoma">
          <span class="punto ${esc(s.gravedad)}"></span>
          <span><b>${esc(s.sintoma)}</b> <span>· ${esc(s.donde)}</span></span>
        </div>`).join('')}</div>` : ''}

      ${acciones.length ? `<div class="acciones">${acciones.map((a) => `
        <div class="accion ${a.urgencia === 'ahora' ? 'ahora' : ''}" data-u="${esc(a.urgencia)}">
          <span><span class="cuando">${esc(a.urgencia)}</span>${esc(a.accion)}</span>
        </div>`).join('')}</div>` : ''}

      ${lista(salud.causas).length ? `
        <details class="plegable tarjeta" style="margin-top:14px">
          <summary>Posibles causas</summary>
          <div class="cuerpo"><ul>${lista(salud.causas).map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>
        </details>` : ''}
    </div>`;
}

async function pintarFicha(planta) {
  plantaAbierta = planta;
  const f = planta.ficha;
  const id = f.identificacion;
  const riego = f.riego;
  const info = estadoRiego(planta);
  const url = await urlFoto(planta.fotoId);

  const historial = await Promise.all(
    lista(planta.historial).slice().reverse().map(async (h) => ({ ...h, url: await urlFoto(h.fotoId) }))
  );

  vistas.ficha.innerHTML = `
    <div class="ficha-foto">
      ${url ? `<img src="${esc(url)}" alt="${esc(id.nombre_comun)}">` : ''}
      <span class="etiqueta">Tu foto · ${esc(fecha(planta.creada))}</span>
    </div>

    <div class="titulo-planta">
      <h2>${esc(id.nombre_comun)}</h2>
      <div class="cientifico">${esc(id.nombre_cientifico)}</div>
      <div class="meta">
        <span class="chip">${esc(id.familia)}</span>
        <span class="chip">Cuidado ${esc(id.dificultad.toLowerCase())}</span>
        <span class="chip">Certeza ${id.confianza}%</span>
      </div>
    </div>

    <p class="resumen">${esc(f.resumen)}</p>

    ${id.confianza < 70 && lista(id.alternativas).length ? `
      <details class="plegable tarjeta">
        <summary>También podría ser otra especie</summary>
        <div class="cuerpo"><ul>${lista(id.alternativas).map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>
      </details>` : ''}

    ${bloqueSalud(f.salud, 'Estado de salud en tu foto')}

    <div class="datos">
      <div class="tarjeta dato">
        <div class="et">💧 Riego</div>
        <div class="va">Cada ${riego.frecuencia_dias_verano} d. en verano</div>
        <div class="su">Cada ${riego.frecuencia_dias_invierno} días en invierno · ${esc(riego.cantidad)}</div>
      </div>
      <div class="tarjeta dato">
        <div class="et">☀️ Luz</div>
        <div class="va">${esc(f.luz.exposicion)}</div>
        <div class="su">${esc(f.luz.horas)}</div>
      </div>
      <div class="tarjeta dato">
        <div class="et">🌡️ Temperatura</div>
        <div class="va">${esc(f.ambiente.temp_ideal)}</div>
        <div class="su">Mín. ${esc(f.ambiente.temp_minima)} · máx. ${esc(f.ambiente.temp_maxima)}</div>
      </div>
      <div class="tarjeta dato">
        <div class="et">💨 Humedad</div>
        <div class="va">${esc(f.ambiente.humedad)}</div>
        <div class="su">${esc(f.ambiente.interior_exterior)}</div>
      </div>
      <div class="tarjeta dato ancho">
        <div class="et">📍 Dónde ponerla</div>
        <div class="va">${esc(f.luz.ubicacion_ideal)}</div>
        <div class="su">Evita: ${esc(f.luz.evitar)}</div>
      </div>
      ${info ? `
      <div class="tarjeta dato ancho">
        <div class="et">🗓️ Próximo riego</div>
        <div class="va">${esc(textoRiego(info))}</div>
        <div class="su">${esc(info.proxima.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }))}</div>
      </div>` : ''}
    </div>

    <details class="plegable tarjeta">
      <summary>Cómo regarla bien</summary>
      <div class="cuerpo"><dl>
        <div><dt>Método</dt><dd>${esc(riego.metodo)}</dd></div>
        <div><dt>Cómo saber si toca</dt><dd>${esc(riego.como_saber)}</dd></div>
        <div><dt>Agua</dt><dd>${esc(riego.agua)}</dd></div>
        <div><dt>Señales de que se pasa</dt><dd><ul>${lista(riego.senales_exceso).map((s) => `<li>${esc(s)}</li>`).join('')}</ul></dd></div>
        <div><dt>Señales de que falta</dt><dd><ul>${lista(riego.senales_falta).map((s) => `<li>${esc(s)}</li>`).join('')}</ul></dd></div>
      </dl></div>
    </details>

    <details class="plegable tarjeta">
      <summary>Tierra, maceta y abono</summary>
      <div class="cuerpo"><dl>
        <div><dt>Sustrato</dt><dd>${esc(f.sustrato.tipo)}</dd></div>
        <div><dt>Maceta</dt><dd>${esc(f.sustrato.maceta)}</dd></div>
        <div><dt>Drenaje</dt><dd>${esc(f.sustrato.drenaje)}</dd></div>
        <div><dt>Abono</dt><dd>${esc(f.sustrato.abono)}</dd></div>
        <div><dt>Trasplante</dt><dd>${esc(f.sustrato.trasplante)}</dd></div>
      </dl></div>
    </details>

    <details class="plegable tarjeta">
      <summary>Poda, plagas y esquejes</summary>
      <div class="cuerpo"><dl>
        <div><dt>Poda</dt><dd>${esc(f.cuidados.poda)}</dd></div>
        <div><dt>Plagas frecuentes</dt><dd><ul>${lista(f.cuidados.plagas_comunes).map((p) => `<li>${esc(p)}</li>`).join('')}</ul></dd></div>
        <div><dt>Reproducción</dt><dd>${esc(f.cuidados.propagacion)}</dd></div>
        <div><dt>Mascotas</dt><dd>${esc(id.toxica_mascotas)}</dd></div>
      </dl></div>
    </details>

    ${lista(f.cuidados.consejos).length ? `
    <details class="plegable tarjeta">
      <summary>Consejos</summary>
      <div class="cuerpo"><ul>${lista(f.cuidados.consejos).map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>
    </details>` : ''}

    ${lista(f.cuidados.calendario).length ? `
    <details class="plegable tarjeta">
      <summary>Calendario por estaciones</summary>
      <div class="cuerpo"><dl>${lista(f.cuidados.calendario).map((c) => `
        <div><dt>${esc(c.estacion)}</dt><dd>${esc(c.tarea)}</dd></div>`).join('')}</dl></div>
    </details>` : ''}

    <div class="referencia tarjeta" id="caja-referencia" hidden>
      <img id="img-referencia" alt="Foto de referencia de la especie">
      <div class="pie">
        <span>Foto de referencia de la especie</span>
        <a id="enlace-referencia" target="_blank" rel="noopener">Wikipedia</a>
      </div>
    </div>

    <details class="plegable tarjeta" ${historial.length ? 'open' : ''} ${historial.length ? '' : 'hidden'}>
      <summary>Revisiones anteriores · ${historial.length}</summary>
      <div class="cuerpo historial">
        ${historial.map((h) => `
          <div class="tarjeta revision">
            ${h.url ? `<img src="${esc(h.url)}" alt="">` : ''}
            <span class="txt">
              <b>${esc(fecha(h.fecha))} · </b><span class="pastilla s-${esc(h.salud.estado)}">${esc(h.salud.estado)}</span>
              <p>${esc(h.evolucion || h.salud.diagnostico)}</p>
            </span>
          </div>`).join('')}
      </div>
    </details>

    <div class="acciones-ficha">
      <button class="boton-secundario" id="btn-regada">💧 La he regado</button>
      <button class="boton-secundario" id="btn-revisar">📷 Revisar salud</button>
    </div>
    <div class="acciones-ficha">
      <button class="boton-secundario btn-peligro" id="btn-borrar-planta">Eliminar planta</button>
    </div>
  `;

  mostrar('ficha', { titulo: id.nombre_comun, atras: true });

  // La foto de referencia llega después; la ficha ya se ve mientras tanto.
  cargarReferencia(planta);
}

async function cargarReferencia(planta) {
  const nombre = planta.ficha.identificacion.nombre_cientifico;
  let ref = planta.referencia;
  if (ref === undefined) {
    ref = await fotoDeReferencia(nombre);
    planta.referencia = ref; // se cachea aunque sea null, para no repetir la búsqueda
    await db.savePlant(planta);
  }
  if (!ref || plantaAbierta?.id !== planta.id) return;

  const caja = $('#caja-referencia');
  if (!caja) return;
  const img = $('#img-referencia');
  img.onload = () => { caja.hidden = false; };
  img.onerror = () => { caja.hidden = true; };
  img.src = ref.src;
  $('#enlace-referencia').href = ref.enlace;
}

// ---------- Flujo de análisis ----------

function pantallaCarga({ titulo, texto, previaURL }) {
  $('#cargando-titulo').textContent = titulo;
  $('#cargando-texto').textContent = texto;
  const previa = $('#previa-cargando');
  if (previaURL) {
    previa.src = previaURL;
    previa.hidden = false;
  } else {
    previa.hidden = true;
  }
  mostrar('cargando', { titulo: 'Analizando' });
}

async function procesarFoto(file) {
  if (analizando) return; // ya hay un análisis en marcha
  if (!ajustes.apiKey) {
    brindis('Primero pon tu API key en Ajustes');
    abrirAjustes();
    return;
  }

  let foto;
  try {
    foto = await prepararFoto(file);
  } catch (err) {
    brindis(err.message);
    await irAInicio();
    return;
  }

  const previaURL = URL.createObjectURL(foto.blob);
  urlsCreadas.add(previaURL);

  const esRevision = modoFoto === 'revision' && plantaAbierta;
  pantallaCarga({
    titulo: esRevision ? 'Revisando la planta…' : 'Analizando la foto…',
    texto: esRevision
      ? 'Claude compara esta foto con la revisión anterior.'
      : 'Claude está mirando las hojas, el tallo y el sustrato.',
    previaURL,
  });

  analizando = true;
  try {
    if (esRevision) {
      await guardarRevision(plantaAbierta, foto);
    } else {
      await guardarPlantaNueva(foto);
    }
  } catch (err) {
    console.error(err);
    brindis(mensajeError(err));
    if (esRevision && plantaAbierta) await pintarFicha(plantaAbierta);
    else await irAInicio();
  } finally {
    analizando = false;
    modoFoto = 'nueva';
  }
}

async function guardarPlantaNueva(foto) {
  const ficha = await analizarPlanta({
    apiKey: ajustes.apiKey,
    base64: foto.base64,
    tipoMime: foto.tipoMime,
    ajustes,
  });

  const id = crypto.randomUUID();
  const fotoId = `f-${id}`;
  await db.savePhoto(fotoId, foto.blob);

  const ahora = new Date().toISOString();
  const planta = {
    id,
    fotoId,
    ficha,
    creada: ahora,
    ultimaRevision: ahora,
    ultimoRiego: null,
    historial: [],
  };
  await db.savePlant(planta);
  await pintarFicha(planta);
  brindis(`Guardada: ${ficha.identificacion.nombre_comun}`);
}

async function guardarRevision(planta, foto) {
  const resultado = await revisarSalud({
    apiKey: ajustes.apiKey,
    base64: foto.base64,
    tipoMime: foto.tipoMime,
    planta,
    ajustes,
  });

  // La revisión anterior pasa al historial y la nueva foto se convierte en la principal.
  const fotoId = `f-${crypto.randomUUID()}`;
  await db.savePhoto(fotoId, foto.blob);

  const historial = lista(planta.historial);
  historial.push({
    fecha: planta.ultimaRevision || planta.creada,
    fotoId: planta.fotoId,
    salud: planta.ficha.salud,
    evolucion: '',
  });

  planta.historial = historial.slice(-12); // no dejamos crecer el almacenamiento sin límite
  planta.fotoId = fotoId;
  planta.ficha = { ...planta.ficha, salud: resultado.salud };
  planta.ultimaEvolucion = resultado.evolucion;
  planta.ultimaRevision = new Date().toISOString();

  await db.savePlant(planta);
  await pintarFicha(planta);
  brindis(resultado.evolucion || `Ahora está ${resultado.salud.estado.toLowerCase()}`);
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

function pedirFoto(modo, origen = 'camara') {
  if (analizando) {
    brindis('Espera a que termine el análisis en curso');
    return;
  }
  modoFoto = modo;
  $(origen === 'camara' ? '#entrada-camara' : '#entrada-galeria').click();
}

function abrirAjustes() {
  ajustes = db.getAjustes();
  $('#in-key').value = ajustes.apiKey;
  $('#in-ubicacion').value = ajustes.ubicacion;
  $('#in-notas').value = ajustes.notas;
  mostrar('ajustes', { titulo: 'Ajustes', atras: true });
}

// ---------- Eventos ----------

$('#btn-camara').addEventListener('click', () => pedirFoto('nueva', 'camara'));
$('#btn-galeria').addEventListener('click', () => pedirFoto('nueva', 'galeria'));
$('#btn-ajustes').addEventListener('click', abrirAjustes);
$('#btn-atras').addEventListener('click', irAInicio);

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
  if (destino === 'camara') pedirFoto('nueva', 'camara');
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

  if (e.target.closest('#btn-revisar')) return pedirFoto('revision', 'camara');

  if (e.target.closest('#btn-borrar-planta')) {
    const nombre = plantaAbierta.ficha.identificacion.nombre_comun;
    if (!confirm(`¿Eliminar ${nombre} y todas sus revisiones?`)) return;
    await db.deletePlant(plantaAbierta.id);
    brindis('Planta eliminada');
    await irAInicio();
  }
});

$('#btn-guardar-ajustes').addEventListener('click', () => {
  ajustes = db.setAjustes({
    apiKey: $('#in-key').value.trim(),
    ubicacion: $('#in-ubicacion').value.trim(),
    notas: $('#in-notas').value.trim(),
  });
  brindis('Ajustes guardados');
  irAInicio();
});

$('#btn-borrar-todo').addEventListener('click', async () => {
  if (!confirm('Se borrarán todas tus plantas, fotos y ajustes de este iPhone. ¿Seguro?')) return;
  limpiarURLs();
  await db.wipeAll();
  ajustes = db.getAjustes();
  brindis('Todo borrado');
  await irAInicio();
});

// ---------- Arranque ----------

async function arrancar() {
  ajustes = db.getAjustes();
  await pintarInicio();
  mostrar('inicio');

  if (!ajustes.apiKey) {
    const plantas = await db.allPlants();
    if (!plantas.length) brindis('Añade tu API key en Ajustes para empezar');
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
