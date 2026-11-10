// Cálculos y gráficas SVG de la página /proceso/. Funciones puras.

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const f1 = (x) => x.toLocaleString('es-CO', { maximumFractionDigits: 1 });

/**
 * Celdas redundantes de una tabla: para cada DF X → Y (por nombres de columna), cada fila cuyo valor de X
 * ya apareció antes repite |Y| datos que ya se sabían. Devuelve { celdas, redundantes, porDf }.
 */
export function redundancia(columnas, filas, dfs) {
  const col = (n) => columnas.indexOf(n);
  const porDf = dfs.map(({ izq, der }) => {
    const iz = izq.map(col).filter((i) => i >= 0);
    const de = der.map(col).filter((i) => i >= 0);
    if (!iz.length || !de.length || iz.length < izq.length) return 0;
    const vistos = new Set();
    let r = 0;
    for (const f of filas) {
      const k = JSON.stringify(iz.map((i) => f[i]));
      if (vistos.has(k)) r += de.length; else vistos.add(k);
    }
    return r;
  });
  return { celdas: columnas.length * filas.length, redundantes: porDf.reduce((a, b) => a + b, 0), porDf };
}

/** Proyecta las filas sobre unas columnas, sin duplicados (lo que guardaría la tabla normalizada). */
export function proyectarFilas(columnas, filas, sobre) {
  const idx = sobre.map((c) => columnas.indexOf(c));
  const vistos = new Set();
  const out = [];
  for (const f of filas) {
    const p = idx.map((i) => f[i]);
    const k = JSON.stringify(p);
    if (!vistos.has(k)) { vistos.add(k); out.push(p); }
  }
  return out;
}

/** ¿La DF X → Y se cumple en estas filas? (Los datos solo pueden refutar una DF, nunca probarla.) */
export function seCumple(columnas, filas, izq, der) {
  const iz = izq.map((c) => columnas.indexOf(c));
  const de = der.map((c) => columnas.indexOf(c));
  const mapa = new Map();
  for (const f of filas) {
    const k = JSON.stringify(iz.map((i) => f[i]));
    const v = JSON.stringify(de.map((i) => f[i]));
    if (mapa.has(k) && mapa.get(k) !== v) return false;
    mapa.set(k, v);
  }
  return true;
}

/** Porcentaje de celdas redundantes de la tabla de notas si cada estudiante ve m materias (calculado aquí). */
export function curvaRedundancia(mMax = 10, porEstudiante = 4, columnas = 11) {
  return Array.from({ length: mMax }, (_, k) => {
    const m = k + 1;
    return { m, pct: (100 * porEstudiante * (m - 1)) / (columnas * m) };
  });
}

/** Barras horizontales: celdas totales y redundantes, antes y después. */
export function svgBarrasRedundancia(antes, despues) {
  const W = 640, H = 220, x0 = 190, ancho = W - x0 - 60;
  const max = Math.max(antes.celdas, despues.celdas);
  const fila = (y, etq, d) => {
    const wt = (d.celdas / max) * ancho;
    const wr = (d.redundantes / max) * ancho;
    return `<text x="${x0 - 10}" y="${y + 20}" text-anchor="end" class="g-rot">${esc(etq)}</text>`
      + `<rect x="${x0}" y="${y}" width="${wt.toFixed(1)}" height="30" class="g-barra"/>`
      + (wr ? `<rect x="${x0}" y="${y}" width="${wr.toFixed(1)}" height="30" class="g-barra g-dest"/>` : '')
      + `<text x="${(x0 + wt + 8).toFixed(1)}" y="${y + 20}" class="g-num-g">${d.celdas}</text>`
      + `<text x="${x0 + 6}" y="${y + 48}" class="g-nota">${d.redundantes} repetidas (${f1((100 * d.redundantes) / d.celdas)} %)</text>`;
  };
  return `<svg viewBox="0 0 ${W} ${H}" class="grafica" role="img" aria-labelledby="g-red-t g-red-d"><title id="g-red-t">Celdas guardadas y celdas repetidas</title>`
    + `<desc id="g-red-d">Tabla original: ${antes.celdas} celdas, ${antes.redundantes} repetidas. Cuatro tablas en 3FN: ${despues.celdas} celdas, ${despues.redundantes} repetidas.</desc>`
    + `<line x1="${x0}" y1="10" x2="${x0}" y2="${H - 30}" class="g-base"/>`
    + fila(20, 'Tabla original', antes) + fila(100, 'Cuatro tablas 3FN', despues)
    + `<rect x="${x0}" y="${H - 22}" width="14" height="12" class="g-barra"/><text x="${x0 + 20}" y="${H - 12}" class="g-nota">celdas</text>`
    + `<rect x="${x0 + 80}" y="${H - 22}" width="14" height="12" class="g-barra g-dest"/><text x="${x0 + 100}" y="${H - 12}" class="g-nota">repiten un dato</text>`
    + '</svg>';
}

/** Línea: % de redundancia según cuántas materias ve cada estudiante. */
export function svgCurva(puntos) {
  const W = 640, H = 250, x0 = 56, y0 = 205, w = W - x0 - 20, h = 170;
  const maxM = puntos.length;
  const X = (m) => x0 + ((m - 1) / (maxM - 1)) * w;
  const Y = (p) => y0 - (p / 40) * h;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="grafica" role="img" aria-labelledby="g-cur-t g-cur-d"><title id="g-cur-t">Redundancia según materias por estudiante</title>`
    + `<desc id="g-cur-d">${puntos.map((p) => `${p.m} materias: ${f1(p.pct)} %`).join('; ')}</desc>`;
  for (const p of [0, 10, 20, 30, 40]) s += `<line x1="${x0}" x2="${W - 20}" y1="${Y(p)}" y2="${Y(p)}" class="g-reji"/><text x="${x0 - 8}" y="${Y(p) + 4}" text-anchor="end" class="g-eje">${p} %</text>`;
  s += `<line x1="${x0}" x2="${W - 20}" y1="${Y(400 / 11)}" y2="${Y(400 / 11)}" class="g-limite"/><text x="${W - 22}" y="${Y(400 / 11) - 6}" text-anchor="end" class="g-nota">tope: 4 de 11 columnas = ${f1(400 / 11)} %</text>`;
  s += `<polyline class="g-linea" points="${puntos.map((p) => `${X(p.m).toFixed(1)},${Y(p.pct).toFixed(1)}`).join(' ')}"/>`;
  for (const p of puntos) {
    s += `<circle cx="${X(p.m).toFixed(1)}" cy="${Y(p.pct).toFixed(1)}" r="${p.m === 3 ? 7 : 4}" class="${p.m === 3 ? 'g-punto g-dest' : 'g-punto'}"/>`;
    s += `<text x="${X(p.m).toFixed(1)}" y="${y0 + 18}" text-anchor="middle" class="g-eje">${p.m}</text>`;
  }
  const p3 = puntos[2];
  s += `<text x="${(X(3) + 12).toFixed(1)}" y="${(Y(p3.pct) + 22).toFixed(1)}" class="g-nota">la hoja: 3 materias → ${f1(p3.pct)} %</text>`;
  s += `<text x="${x0 + w / 2}" y="${H - 2}" text-anchor="middle" class="g-eje">materias por estudiante</text>`;
  return s + '</svg>';
}

/** Barras en escala logarítmica: cierres revisados por la poda frente a todas las combinaciones. */
export function svgPoda(filas) {
  const W = 640, x0 = 170, ancho = W - x0 - 90, alto = 26, sep = 46;
  const H = 30 + filas.length * sep + 20;
  const maxLog = Math.log10(Math.max(...filas.map((f) => f.ingenuo), 10));
  const L = (v) => (Math.log10(Math.max(v, 1)) / maxLog) * ancho;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="grafica" role="img" aria-labelledby="g-poda-t g-poda-d"><title id="g-poda-t">Cierres para encontrar las claves</title>`
    + `<desc id="g-poda-d">${filas.map((f) => `${f.nombre}: ${f.revisados} de ${f.ingenuo}`).join('; ')}</desc>`;
  filas.forEach((f, i) => {
    const y = 20 + i * sep;
    s += `<text x="${x0 - 10}" y="${y + 17}" text-anchor="end" class="g-rot">${esc(f.nombre)}</text>`;
    s += `<rect x="${x0}" y="${y}" width="${Math.max(2, L(f.ingenuo)).toFixed(1)}" height="${alto}" class="g-barra g-claro"/>`;
    s += `<rect x="${x0}" y="${y + 6}" width="${Math.max(3, L(f.revisados)).toFixed(1)}" height="${alto - 12}" class="g-barra g-dest"/>`;
    s += `<text x="${(x0 + L(f.ingenuo) + 6).toFixed(1)}" y="${y + 17}" class="g-num-g">${f.revisados} / ${f.ingenuo.toLocaleString('es-CO')}</text>`;
  });
  s += `<text x="${x0}" y="${H - 4}" class="g-nota">escala logarítmica · rojo = cierres que hizo la poda · gris = 2ⁿ − 1 combinaciones</text>`;
  return s + '</svg>';
}
