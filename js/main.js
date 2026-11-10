// Interfaz de «¿Tu tabla está en 3FN?». Toda la lógica está en fd.js, esquema.js y grafo.js.
import { iniciarTema } from './tema.js';
import { analizar, cierreConPasos, agrupar, contiene, contar, indices, nivel, MAX_ATRIBUTOS } from './fd.js';
import { leerEsquema, nombres, textoDf, textoConjunto } from './esquema.js';
import { svgGrafo } from './grafo.js';
import { EJEMPLOS, POR_DEFECTO } from './ejemplos.js';

iniciarTema(document.getElementById('tema'));

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const NUMS = ['壱', '弐', '参', '肆', '伍', '陸', '漆', '捌', '玖', '拾'];
const reducido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const estado = { esquema: null, a: null, modo: 'tercera', ejemplo: POR_DEFECTO, seleccion: 0 };

// ------------------------------------------------------------ ejemplos
function pintarEjemplos() {
  $('botones-ejemplo').innerHTML = EJEMPLOS.map((e) => `<button class="mini" type="button" data-ejemplo="${e.id}" aria-pressed="${e.id === estado.ejemplo}">${esc(e.titulo)}</button>`).join('');
  const ej = EJEMPLOS.find((e) => e.id === estado.ejemplo);
  $('chip-ejemplo').hidden = !ej;
  $('origen-ejemplo').textContent = ej ? ej.origen : 'Tu propio esquema';
}
function cargarEjemplo(id) {
  const ej = EJEMPLOS.find((e) => e.id === id);
  if (!ej) return;
  estado.ejemplo = id;
  $('atributos').value = ej.atributos;
  $('dfs').value = ej.dfs;
  estado.seleccion = -1;
  pintarEjemplos();
  recalcular(true);
}
$('botones-ejemplo').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-ejemplo]');
  if (b) cargarEjemplo(b.dataset.ejemplo);
});

// ------------------------------------------------------------ entrada
let espera = 0;
function alEscribir() {
  if (estado.ejemplo) { estado.ejemplo = null; pintarEjemplos(); }
  clearTimeout(espera);
  espera = setTimeout(() => recalcular(true), 250);
}
$('atributos').addEventListener('input', alEscribir);
$('dfs').addEventListener('input', alEscribir);

function recalcular(animar) {
  const e = leerEsquema($('atributos').value, $('dfs').value);
  const msgs = [
    ...e.errores.map((x) => `<p class="msg msg-error">${x.linea ? `Línea ${x.linea}: ` : ''}${esc(x.mensaje)}</p>`),
    ...e.avisos.map((x) => `<p class="msg msg-aviso">${esc(x)}</p>`),
  ];
  $('mensajes').innerHTML = msgs.join('');
  if (!e.atributos.length || e.atributos.length > MAX_ATRIBUTOS) {
    $('veredicto').textContent = '…';
    $('sub-veredicto').textContent = 'Escribe entre 1 y 30 atributos.';
    return;
  }
  estado.esquema = e;
  estado.a = analizar(e.atributos.length, e.dfs);
  if (estado.seleccion < 0 || estado.seleccion >= 2 ** e.atributos.length) estado.seleccion = seleccionInicial();
  pintarVeredicto();
  pintarGrafo(animar);
  pintarClaves();
  pintarCierre();
  pintarRecubrimiento();
  pintarDescomposicion();
}

function seleccionInicial() {
  const v = estado.a.violaciones[0];
  if (v) return v.izq;
  return estado.a.claves[0] ?? 1;
}

// ------------------------------------------------------------ veredicto
const TEXTO = {
  '1FN': ['Solo 1FN', 'Hay dependencias parciales: algo depende de un pedazo de la clave.'],
  '2FN': ['Se queda en 2FN', 'No hay parciales, pero sí dependencias transitivas.'],
  '3FN': ['¡Está en 3FN!', 'Pero no en BCNF: alguna dependencia sale de algo que no es superclave.'],
  BCNF: ['¡BCNF! Nivel máximo', 'Toda dependencia sale de una superclave. Nada que corregir.'],
};
const N = (m) => esc(textoConjunto(m, estado.esquema.atributos));
const L = (m) => esc(nombres(m, estado.esquema.atributos).join(', '));

function explicar(v) {
  const s = contar(v.der) > 1;
  if (v.tipo === '2FN') {
    const ded = v.escritas.length ? '' : ' <em>(deducida: no la escribiste, sale por transitividad)</em>';
    return `<strong>${L(v.izq)} → ${L(v.der)}</strong>${ded}<span>${L(v.izq)} es solo una parte de la clave ${N(v.clave)}. ${s ? 'Esos atributos dependen' : 'Ese atributo depende'} de un pedazo de la clave: <b>dependencia parcial</b>.</span>`;
  }
  if (v.tipo === '3FN') {
    return `<strong>${L(v.izq)} → ${L(v.der)}</strong><span>${L(v.izq)} no es superclave ni parte de una clave, y ${L(v.der)} no ${s ? 'son primos' : 'es primo'}: la clave determina ${L(v.izq)} y ${L(v.izq)} determina ${L(v.der)}. <b>Dependencia transitiva</b>.</span>`;
  }
  return `<strong>${L(v.izq)} → ${L(v.der)}</strong><span>${L(v.izq)} no es superclave. ${L(v.der)} ${s ? 'son primos' : 'es primo'} (parte de una clave), por eso 3FN lo perdona; <b>BCNF no</b>.</span>`;
}

function pintarVeredicto() {
  const a = estado.a;
  const nv = nivel(a.forma);
  [...$('escalera').children].forEach((li, i) => {
    li.className = i <= nv ? 'logrado' : i === nv + 1 ? 'falla' : '';
  });
  const [t, sub] = TEXTO[a.forma];
  const v = $('veredicto');
  v.textContent = t;
  v.className = `veredicto f-${a.forma}`;
  $('sub-veredicto').textContent = a.busqueda.completo ? sub : 'Demasiadas combinaciones para buscar todas las claves; el veredicto puede ser incompleto.';
  $('violaciones').innerHTML = a.violaciones.map((x, i) => `<li class="violacion" tabindex="0" data-i="${i}" data-df="${x.escritas.join(' ')}"><span class="sello sello-${x.tipo}">rompe ${x.tipo}</span><p>${explicar(x)}</p></li>`).join('')
    || '<li class="violacion sin"><span class="sello sello-ok">combo limpio</span><p><strong>Ninguna violación.</strong><span>Cada lado izquierdo es superclave.</span></p></li>';
}

function enfocar(dfsTexto, encendido) {
  const caja = $('grafo');
  caja.querySelectorAll('.foco').forEach((g) => g.classList.remove('foco'));
  if (!encendido || !dfsTexto) { caja.classList.remove('con-foco'); return; }
  caja.classList.add('con-foco');
  for (const k of dfsTexto.split(' ')) caja.querySelectorAll(`[data-df="${k}"]`).forEach((g) => g.classList.add('foco'));
}
for (const ev of ['mouseover', 'focusin']) $('violaciones').addEventListener(ev, (e) => { const li = e.target.closest('.violacion'); if (li) enfocar(li.dataset.df, true); });
for (const ev of ['mouseout', 'focusout']) $('violaciones').addEventListener(ev, () => enfocar('', false));

// ------------------------------------------------------------ grafo
function pintarGrafo(animar) {
  const { esquema: e, a } = estado;
  const { svg, ancho } = svgGrafo(e.atributos, e.dfs, { claves: a.claves, primos: a.primos, estados: a.estados });
  const caja = $('grafo');
  caja.innerHTML = svg;
  const el = caja.querySelector('svg');
  el.style.minWidth = `${Math.min(ancho, 620)}px`;
  el.style.maxWidth = `${Math.round(ancho * 1.25)}px`;
  if (animar && !reducido()) {
    caja.classList.remove('animar');
    void caja.offsetWidth; // reinicia la animación
    caja.classList.add('animar');
  }
}

// ------------------------------------------------------------ claves y cierre
function pintarClaves() {
  const { esquema: e, a } = estado;
  $('claves').innerHTML = a.claves.map((k, i) => `<button type="button" class="clave-chip" data-mask="${k}" title="Calcular su cierre"><small>clave ${i + 1}</small>${N(k)}</button>`).join('')
    || '<p class="tenue">No se pudo calcular.</p>';
  const b = a.busqueda;
  const primos = nombres(a.primos, e.atributos);
  $('busqueda').innerHTML = `Primos (en alguna clave): <b>${esc(primos.join(', ') || '—')}</b>. `
    + (b.completo
      ? `Revisé <b>${b.revisados}</b> cierre${b.revisados === 1 ? '' : 's'} de <b>${b.ingenuo.toLocaleString('es-CO')}</b> combinaciones posibles: lo que nunca aparece a la derecha (${N(b.nucleo)}) va en toda clave.`
      : 'La búsqueda se detuvo: demasiados atributos aparecen a ambos lados.');
}
$('claves').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-mask]');
  if (b) { estado.seleccion = Number(b.dataset.mask); pintarCierre(); }
});

function pintarCierre() {
  const { esquema: e, a } = estado;
  const sel = estado.seleccion;
  $('selector').innerHTML = e.atributos.map((n, i) => `<button type="button" class="attr-boton" data-i="${i}" aria-pressed="${!!(sel & (1 << i))}">${esc(n)}</button>`).join('');
  if (!sel) { $('cierre').innerHTML = 'Elige al menos un atributo.'; $('pasos').innerHTML = ''; return; }
  const { cierre: c, pasos } = cierreConPasos(sel, e.dfs);
  const esSuper = contiene(c, a.universo);
  const esClave = a.claves.includes(sel);
  const etiqueta = esClave ? '<span class="insignia i-clave">clave candidata</span>' : esSuper ? '<span class="insignia i-super">superclave (no mínima)</span>' : '<span class="insignia i-no">no es superclave</span>';
  $('cierre').innerHTML = `<span class="dato">${N(sel)}⁺ = ${N(c)}</span> ${etiqueta}`;
  $('pasos').innerHTML = pasos.map((p) => `<li><code>${esc(textoDf(e.dfs[p.df], e.atributos))}</code> suma <b>${L(p.nuevos)}</b></li>`).join('')
    || '<li class="tenue">Ninguna dependencia aplica: el cierre es el mismo conjunto.</li>';
}
$('selector').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-i]');
  if (!b) return;
  estado.seleccion ^= 1 << Number(b.dataset.i);
  pintarCierre();
  $('selector').querySelector(`[data-i="${b.dataset.i}"]`)?.focus();
});

// ------------------------------------------------------------ recubrimiento
function pintarRecubrimiento() {
  const { esquema: e, a } = estado;
  const r = a.recubrimiento;
  $('recubrimiento').innerHTML = agrupar(r.dfs).map((d) => `<li><code>${esc(textoDf(d, e.atributos))}</code></li>`).join('') || '<li class="tenue">Sin dependencias.</li>';
  const items = r.registro.map((x) => (x.tipo === 'extrano'
    ? `<li>Quité <b>${L(x.atributo)}</b> de <code>${esc(textoDf(x.antes, e.atributos))}</code>: sobraba a la izquierda.</li>`
    : `<li>Quité <code>${esc(textoDf(x.df, e.atributos))}</code>: se deduce de las demás.</li>`));
  $('registro').innerHTML = items.join('') || `<li class="tenue">Nada sobraba: solo se separó el lado derecho en ${r.dfs.length} dependencia${r.dfs.length === 1 ? '' : 's'} de un atributo (aquí se muestran juntas por lado izquierdo).</li>`;
}

// ------------------------------------------------------------ descomposición
function carta(r, i, total, modo) {
  const e = estado.esquema;
  const clave = r.claves[0] ?? r.atributos;
  const resto = r.atributos & ~clave;
  const filas = [
    ...indices(clave).map((j) => `<li class="pk"><span class="pk-t">PK</span>${esc(e.atributos[j])}</li>`),
    ...indices(resto).map((j) => `<li>${esc(e.atributos[j])}</li>`),
  ].join('');
  const otras = r.claves.slice(1).map((k) => N(k)).join(' · ');
  const custodia = agrupar(r.dfs);
  const extra = r.origen === 'clave' ? '<span class="carta-extra">tabla de la clave</span>' : '';
  return `<article class="carta c-${r.forma}" tabindex="0" aria-label="Tabla ${i + 1} de ${total}: ${esc(nombres(r.atributos, e.atributos).join(', '))}; forma ${r.forma}">
    <header class="carta-cab"><span class="carta-num" aria-hidden="true">${NUMS[i] ?? i + 1}</span><h3>T${i + 1} · ${L(clave)}</h3>${extra}</header>
    <ul class="carta-attrs">${filas}</ul>
    ${otras ? `<p class="carta-otras">Otras claves: ${otras}</p>` : ''}
    <footer class="carta-pie"><span class="carta-stat">ATR ${contar(r.atributos)}</span><span class="carta-stat">DF ${custodia.length}</span><span class="carta-sello">${r.forma}</span></footer>
    ${custodia.length ? `<p class="carta-df">${custodia.slice(0, 3).map((d) => `<code>${esc(textoDf(d, e.atributos))}</code>`).join(' ')}${custodia.length > 3 ? ` <span class="tenue">+${custodia.length - 3}</span>` : ''}</p>` : ''}
  </article>`;
}

function tablaChase(rel, reunion) {
  const e = estado.esquema;
  const cols = reunion.columnas;
  const origen = new Map();
  reunion.inicial.forEach((f, i) => f.forEach((v, j) => { if (v) origen.set(v, `b<sub>${i + 1},${j + 1}</sub>`); }));
  const cab = cols.map((c) => `<th scope="col">${esc(e.atributos[c])}</th>`).join('');
  const filas = reunion.final.map((f, i) => `<tr${i === reunion.fila ? ' class="fila-a"' : ''}><th scope="row">T${i + 1}</th>${f.map((v) => `<td>${v === 0 ? '<b>a</b>' : origen.get(v)}</td>`).join('')}</tr>`).join('');
  return `<details class="chase"><summary>Ver el tablero de la prueba (chase) al terminar</summary><div class="tabla-envoltura"><table class="tabla tabla-chase"><thead><tr><th></th>${cab}</tr></thead><tbody>${filas}</tbody></table></div><p class="tenue">«a» = el valor de la fila reconstruida. Las DF igualan símbolos hasta que nada cambia; si una fila queda toda en «a», la reunión de las tablas devuelve exactamente la original.</p></details>`;
}

function pintarDescomposicion() {
  const { esquema: e, a, modo } = estado;
  const d = a[modo];
  const rels = d.relaciones;
  if (modo === 'tercera') {
    $('desc-nota').innerHTML = a.forma === 'BCNF' || a.forma === '3FN'
      ? 'Tu tabla ya está en 3FN; la síntesis la deja igual o la parte sin perder nada.'
      : `Una tabla por cada lado izquierdo del recubrimiento mínimo${d.claveAgregada ? `, más una con la clave ${N(d.claveAgregada)} porque ninguna la tenía` : ''}.`;
  } else {
    $('desc-nota').innerHTML = d.pasos.length
      ? d.pasos.map((p, i) => `Corte ${i + 1}: ${N(p.desde)} por <code>${L(p.izq)} → ${L(p.der)}</code>`).join(' · ')
      : 'Nada que partir: ya está en BCNF.';
  }
  $('cartas').innerHTML = rels.map((r, i) => carta(r, i, rels.length, modo)).join('');
  const sp = d.reunion.sinPerdida;
  const pr = d.preservacion.preserva;
  const perdidas = d.preservacion.perdidas.map((p) => `<code>${L(p.izq)} → ${L(p.der)}</code>`).join(', ');
  $('pruebas').innerHTML = `<p class="prueba ${sp ? 'p-si' : 'p-no'}"><span class="sello">${sp ? 'SÍ' : 'NO'}</span> <span><b>Reunión sin pérdida.</b> ${sp ? `Al volver a juntar las tablas sale la original, ni una fila de más (la fila de T${d.reunion.fila + 1} del tablero quedó completa).` : 'Al juntar las tablas aparecerían filas falsas.'}</span></p>`
    + `<p class="prueba ${pr ? 'p-si' : 'p-no'}"><span class="sello">${pr ? 'SÍ' : 'NO'}</span> <span><b>Preserva dependencias.</b> ${pr ? 'Cada dependencia se puede revisar sin juntar tablas.' : `Se pierde ${perdidas}: para hacerla cumplir habría que juntar tablas (o usar un disparador).`}</span></p>`
    + tablaChase(rels, d.reunion);
}

function cambiarModo(modo, foco) {
  estado.modo = modo;
  document.querySelectorAll('.pestana').forEach((t) => {
    const sel = t.dataset.modo === modo;
    t.setAttribute('aria-selected', String(sel));
    t.tabIndex = sel ? 0 : -1;
    if (sel) { $('panel-desc').setAttribute('aria-labelledby', t.id); if (foco) t.focus(); }
  });
  if (estado.a) pintarDescomposicion();
}
document.querySelector('.pestanas').addEventListener('click', (ev) => {
  const t = ev.target.closest('.pestana');
  if (t) cambiarModo(t.dataset.modo);
});
document.querySelector('.pestanas').addEventListener('keydown', (ev) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(ev.key)) return;
  ev.preventDefault();
  cambiarModo(estado.modo === 'tercera' ? 'bcnf' : 'tercera', true);
});

// ------------------------------------------------------------ arranque
cargarEjemplo(POR_DEFECTO);
