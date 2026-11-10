// Grafo de dependencias en SVG: atributos como cajas, cada DF como una flecha (con un nudo si tiene varios atributos a la izquierda).
// Las columnas salen de «a cuántos saltos de la clave» está cada atributo. Función pura: devuelve texto SVG.
import { indices, contiene } from './fd.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ALTO = 34;
const SEP_FILA = 14;
const SEP_COL = 120;
const MARGEN = 14;

/** Capa de cada atributo: 0 para la clave; luego 1 + la generación en la que el cierre lo alcanza. */
export function capas(n, dfs, clave) {
  const capa = new Array(n).fill(-1);
  const padre = new Array(n).fill(-1);
  for (const i of indices(clave)) capa[i] = 0;
  let conocidos = clave;
  for (let gen = 1; gen <= n; gen++) {
    let nuevos = 0;
    dfs.forEach((d, k) => {
      if (!contiene(conocidos, d.izq)) return;
      for (const i of indices(d.der & ~conocidos & ~nuevos)) { capa[i] = gen; padre[i] = k; nuevos |= 1 << i; }
    });
    if (!nuevos) break;
    conocidos |= nuevos;
  }
  const max = Math.max(0, ...capa);
  for (let i = 0; i < n; i++) if (capa[i] < 0) capa[i] = max + 1; // inalcanzables (no debería pasar)
  return { capa, padre };
}

const anchoTexto = (t) => Math.round(18 + 7.9 * [...t].length);

/** Calcula posiciones. Devuelve { nodos, ancho, alto }. */
export function disponer(atributos, dfs, clave) {
  const n = atributos.length;
  const { capa, padre } = capas(n, dfs, clave);
  const nCapas = Math.max(...capa, 0) + 1;
  const cols = Array.from({ length: nCapas }, () => []);
  for (let i = 0; i < n; i++) cols[capa[i]].push(i);
  const nodos = new Array(n);
  let x = MARGEN + 56; // margen izquierdo para que las flechas hacia atrás entren por la izquierda
  const altoCol = (c) => c.length * ALTO + Math.max(0, c.length - 1) * SEP_FILA;
  const alto = Math.max(...cols.map(altoCol), ALTO) + 2 * MARGEN + 16 + 34; // 34: carril inferior para flechas hacia atrás
  cols.forEach((col, ci) => {
    if (ci > 0) {
      // baricentro: ordenar por la altura media de quienes los determinan
      const centro = (i) => {
        const d = dfs[padre[i]];
        if (!d) return 1e9;
        const ys = indices(d.izq).map((j) => nodos[j]?.y ?? 0);
        return ys.reduce((a, b) => a + b, 0) / ys.length;
      };
      col.sort((a, b) => centro(a) - centro(b) || a - b);
    }
    const w = Math.max(...col.map((i) => anchoTexto(atributos[i])), 60);
    let y = MARGEN + 16 + (alto - 34 - 2 * MARGEN - 16 - altoCol(col)) / 2;
    for (const i of col) {
      const wi = anchoTexto(atributos[i]);
      nodos[i] = { i, x: x + (w - wi) / 2, y, w: wi, h: ALTO, capa: ci };
      y += ALTO + SEP_FILA;
    }
    x += w + SEP_COL;
  });
  return { nodos, ancho: x - SEP_COL + MARGEN + 60, alto };
}

function curva(sx, sy, tx, ty, fondo) {
  if (tx > sx + 24) {
    const dx = Math.max(30, (tx - sx) / 2);
    return `M${sx.toFixed(1)},${sy.toFixed(1)} C${(sx + dx).toFixed(1)},${sy.toFixed(1)} ${(tx - dx).toFixed(1)},${ty.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)}`;
  }
  // flecha hacia atrás (p. ej. CP → Ciudad): sale a la derecha, baja por debajo de todo y entra por la izquierda
  const yb = (fondo ?? Math.max(sy, ty) + 40);
  const f = (v) => v.toFixed(1);
  return `M${f(sx)},${f(sy)} C${f(sx + 55)},${f(sy)} ${f(sx + 55)},${f(yb)} ${f(sx)},${f(yb)} L${f(tx - 30)},${f(yb)} C${f(tx - 70)},${f(yb)} ${f(tx - 60)},${f(ty)} ${f(tx)},${f(ty)}`;
}

/**
 * SVG del grafo. `estados[i].estado` ∈ ok | 2FN | 3FN | BCNF | trivial marca cada DF escrita.
 * `claves` y `primos` resaltan los atributos.
 */
export function svgGrafo(atributos, dfs, { claves = [], primos = 0, estados = [] } = {}) {
  const clave = claves[0] ?? (2 ** atributos.length - 1);
  const { nodos, ancho, alto } = disponer(atributos, dfs, clave);
  const afectados = new Set();
  let aristas = '';
  let sellos = '';
  dfs.forEach((d, k) => {
    const est = estados[k]?.estado ?? 'ok';
    if (est === 'trivial') return;
    const malo = ['2FN', '3FN', 'BCNF'].includes(est);
    const cls = `arista${malo ? ` viola v-${est}` : ''}`;
    const marca = malo ? 'url(#punta-roja)' : 'url(#punta)';
    const izq = indices(d.izq).map((i) => nodos[i]);
    const der = indices(d.der & ~d.izq).map((i) => nodos[i]);
    let sx, sy;
    let g = `<g class="df${malo ? ' df-mala' : ''}" data-df="${k}">`;
    if (izq.length === 1) {
      sx = izq[0].x + izq[0].w; sy = izq[0].y + ALTO / 2;
    } else {
      sx = Math.max(...izq.map((o) => o.x + o.w)) + 36;
      sy = izq.reduce((a, o) => a + o.y + ALTO / 2, 0) / izq.length;
      for (const o of izq) g += `<path class="${cls} entra" d="${curva(o.x + o.w, o.y + ALTO / 2, sx, sy)}"/>`;
      g += `<circle class="nudo${malo ? ' nudo-malo' : ''}" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="6"/>`;
    }
    for (const t of der) {
      if (malo) afectados.add(t.i);
      g += `<path class="${cls}" d="${curva(sx, sy, t.x - 3, t.y + ALTO / 2, alto - 18 - 6 * k % 12)}" marker-end="${marca}"/>`;
    }
    aristas += g + '</g>';
    if (malo) {
      const etq = est === '2FN' ? 'parcial' : est === '3FN' ? 'transitiva' : 'no BCNF';
      const w = 14 + 7 * etq.length;
      sellos += `<g class="sello-g" data-df="${k}"><rect class="sello-r" x="${(sx + 6).toFixed(1)}" y="${(sy - 26).toFixed(1)}" width="${w}" height="18" rx="2"/><text class="sello-t" x="${(sx + 6 + w / 2).toFixed(1)}" y="${(sy - 13).toFixed(1)}" text-anchor="middle">${etq}</text></g>`;
    }
  });
  let cajas = '';
  for (const o of nodos) {
    const bit = 1 << o.i;
    const cls = ['nodo', primos & bit ? 'primo' : '', clave & bit ? 'clave' : '', afectados.has(o.i) ? 'afectado' : ''].filter(Boolean).join(' ');
    cajas += `<g class="${cls}" data-attr="${o.i}"><rect x="${o.x.toFixed(1)}" y="${o.y.toFixed(1)}" width="${o.w}" height="${ALTO}" rx="3"/>`
      + `<text x="${(o.x + o.w / 2).toFixed(1)}" y="${(o.y + 22).toFixed(1)}" text-anchor="middle"${clave & bit ? ' text-decoration="underline"' : ''}>${esc(atributos[o.i])}</text></g>`;
  }
  const desc = dfs.map((d, k) => `${indices(d.izq).map((i) => atributos[i]).join(', ')} determina ${indices(d.der & ~d.izq).map((i) => atributos[i]).join(', ')}${['2FN', '3FN', 'BCNF'].includes(estados[k]?.estado) ? ` (viola ${estados[k].estado})` : ''}`).join('; ');
  const defs = '<defs>'
    + '<marker id="punta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="punta" d="M0,0 L10,5 L0,10 z"/></marker>'
    + '<marker id="punta-roja" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="punta-roja" d="M0,0 L10,5 L0,10 z"/></marker>'
    + '</defs>';
  const rot = `<text class="g-capa" x="${MARGEN}" y="${MARGEN + 4}">clave →</text>`;
  const svg = `<svg class="grafo" viewBox="0 0 ${Math.ceil(ancho)} ${Math.ceil(alto)}" width="${Math.ceil(ancho)}" role="img" aria-labelledby="grafo-t grafo-d">`
    + `<title id="grafo-t">Grafo de dependencias funcionales</title><desc id="grafo-d">${esc(desc)}</desc>${defs}${rot}`
    + `<g class="aristas">${aristas}</g><g class="cajas">${cajas}</g><g class="sellos">${sellos}</g></svg>`;
  return { svg, ancho: Math.ceil(ancho), alto: Math.ceil(alto) };
}
