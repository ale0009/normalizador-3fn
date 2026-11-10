// Motor de normalización: dependencias funcionales (DF) como máscaras de bits.
// Cada atributo es un bit (máximo 30, para que las operaciones de bits de JS sigan siendo positivas).
// Una DF es { izq, der } con izq y der como máscaras. Todo son funciones puras.

export const MAX_ATRIBUTOS = 30;
/** Más allá de esto la búsqueda de subconjuntos (claves, proyecciones) se vuelve demasiado lenta. */
export const MAX_BUSQUEDA = 20;

// ---------------------------------------------------------------- utilidades de conjuntos

export function contar(m) {
  let c = 0;
  while (m) { m &= m - 1; c++; }
  return c;
}

/** Índices de los bits encendidos, de menor a mayor. */
export function indices(m) {
  const out = [];
  for (let i = 0; m; i++, m >>>= 1) if (m & 1) out.push(i);
  return out;
}

export const contiene = (a, b) => (a & b) === b; // ¿b ⊆ a?

/** Todos los subconjuntos de `m` de tamaño k, en orden lexicográfico de índices. */
export function combinaciones(m, k) {
  const idx = indices(m);
  const out = [];
  const elegir = (desde, actual, faltan) => {
    if (faltan === 0) { out.push(actual); return; }
    for (let i = desde; i <= idx.length - faltan; i++) elegir(i + 1, actual | (1 << idx[i]), faltan - 1);
  };
  if (k >= 0 && k <= idx.length) elegir(0, 0, k);
  return out;
}

/** Subconjuntos no vacíos de m, de menor a mayor tamaño (y en orden lexicográfico dentro de cada tamaño). */
export function subconjuntosPorTamano(m, incluirTodo = true) {
  const n = contar(m);
  const out = [];
  for (let k = 1; k <= (incluirTodo ? n : n - 1); k++) out.push(...combinaciones(m, k));
  return out;
}

const mismaDf = (a, b) => a.izq === b.izq && a.der === b.der;

// ---------------------------------------------------------------- cierre

/** Cierre X⁺ de un conjunto de atributos bajo las DF. */
export function cierre(x, dfs) {
  let c = x;
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (const d of dfs) {
      if ((d.izq & c) === d.izq && (d.der & ~c) !== 0) { c |= d.der; cambio = true; }
    }
  }
  return c;
}

/**
 * Cierre con la traza de pasos: qué DF se aplicó y qué atributos nuevos trajo.
 * Recorre las DF en orden y vuelve a empezar mientras algo cambie (el algoritmo de los libros).
 */
export function cierreConPasos(x, dfs) {
  let c = x;
  const pasos = [];
  let cambio = true;
  let ronda = 0;
  while (cambio) {
    cambio = false;
    ronda++;
    dfs.forEach((d, i) => {
      if ((d.izq & c) === d.izq && (d.der & ~c) !== 0) {
        pasos.push({ df: i, nuevos: d.der & ~c, ronda });
        c |= d.der;
        cambio = true;
      }
    });
  }
  return { cierre: c, pasos };
}

export const esSuperclave = (x, universo, dfs) => contiene(cierre(x, dfs), universo);

// ---------------------------------------------------------------- claves candidatas

/**
 * Todas las claves candidatas de `universo` bajo `dfs`.
 * Poda clásica: los atributos que nunca aparecen a la derecha (de forma no trivial) están en TODA clave;
 * los que solo aparecen a la derecha no están en ninguna. Solo se prueban combinaciones del resto.
 * Devuelve { claves, nucleo, revisados, ingenuo, completo }.
 */
export function clavesCandidatas(universo, dfs, limite = MAX_BUSQUEDA) {
  const propias = dfs.filter((d) => contiene(universo, d.izq));
  let derNoTrivial = 0;
  let izqTodas = 0;
  for (const d of propias) { derNoTrivial |= d.der & ~d.izq; izqTodas |= d.izq; }
  derNoTrivial &= universo;
  const nucleo = universo & ~derNoTrivial; // nunca se deducen: van en toda clave
  const medio = derNoTrivial & izqTodas; // a ambos lados: quizá
  const ingenuo = 2 ** contar(universo) - 1;
  let revisados = 1;
  if (contiene(cierre(nucleo, propias), universo)) {
    return { claves: [nucleo], nucleo, revisados, ingenuo, completo: true };
  }
  if (contar(medio) > limite) return { claves: [], nucleo, revisados, ingenuo, completo: false };
  const claves = [];
  for (let k = 1; k <= contar(medio); k++) {
    for (const s of combinaciones(medio, k)) {
      if (claves.some((c) => contiene(s, c & medio))) continue; // superconjunto de una clave: no es mínima
      revisados++;
      if (contiene(cierre(nucleo | s, propias), universo)) claves.push(nucleo | s);
    }
  }
  return { claves, nucleo, revisados, ingenuo, completo: true };
}

export function atributosPrimos(claves) {
  return claves.reduce((a, c) => a | c, 0);
}

// ---------------------------------------------------------------- recubrimiento mínimo

/** Parte las DF en DF de un solo atributo a la derecha, sin las triviales ni repetidas. */
export function separar(dfs) {
  const out = [];
  for (const d of dfs) {
    for (const i of indices(d.der & ~d.izq)) {
      const n = { izq: d.izq, der: 1 << i };
      if (!out.some((o) => mismaDf(o, n))) out.push(n);
    }
  }
  return out;
}

/**
 * Recubrimiento mínimo (canónico con lado derecho unitario):
 * 1) un atributo a la derecha; 2) quitar atributos extraños de la izquierda; 3) quitar DF redundantes.
 * Devuelve { dfs, registro } donde registro explica cada cosa que se quitó.
 */
export function recubrimientoMinimo(dfs) {
  const registro = [];
  let g = separar(dfs);
  // 2) atributos extraños a la izquierda
  for (let i = 0; i < g.length; i++) {
    for (const a of indices(g[i].izq)) {
      const bit = 1 << a;
      if (contar(g[i].izq) < 2 || !(g[i].izq & bit)) continue;
      const sin = g[i].izq & ~bit;
      if (contiene(cierre(sin, g), g[i].der)) {
        registro.push({ tipo: 'extrano', antes: { ...g[i] }, atributo: bit });
        g[i] = { izq: sin, der: g[i].der };
      }
    }
  }
  const sinRepetir = [];
  for (const d of g) if (!sinRepetir.some((o) => mismaDf(o, d))) sinRepetir.push(d);
  g = sinRepetir;
  // 3) DF redundantes
  for (let i = 0; i < g.length;) {
    const resto = g.filter((_, j) => j !== i);
    if (contiene(cierre(g[i].izq, resto), g[i].der)) {
      registro.push({ tipo: 'redundante', df: { ...g[i] } });
      g = resto;
    } else i++;
  }
  return { dfs: g, registro };
}

/** Junta las DF con el mismo lado izquierdo (A→B, A→C ⇒ A→BC), respetando el orden de aparición. */
export function agrupar(dfs) {
  const out = [];
  for (const d of dfs) {
    const g = out.find((o) => o.izq === d.izq);
    if (g) g.der |= d.der; else out.push({ izq: d.izq, der: d.der });
  }
  return out;
}

/** ¿Dos conjuntos de DF son equivalentes (mismo cierre)? */
export function equivalentes(f, g) {
  return f.every((d) => contiene(cierre(d.izq, g), d.der)) && g.every((d) => contiene(cierre(d.izq, f), d.der));
}

// ---------------------------------------------------------------- formas normales

/**
 * Analiza el esquema completo. Supone 1FN (valores atómicos: eso no se deduce de las DF).
 * Devuelve claves, primos, el estado de cada DF escrita y la lista de violaciones:
 *  - 2FN: un atributo no primo depende de una PARTE de una clave (dependencia parcial).
 *  - 3FN: un atributo no primo depende de algo que no es superclave ni parte de clave (transitiva).
 *  - BCNF: X → A con X que no es superclave, aunque A sea primo.
 */
export function formaNormal(universo, dfs, opciones = {}) {
  const k = clavesCandidatas(universo, dfs, opciones.limite);
  const claves = k.claves;
  const primos = atributosPrimos(claves);
  const noPrimos = universo & ~primos;
  const cierres = new Map();
  const cie = (x) => { if (!cierres.has(x)) cierres.set(x, cierre(x, dfs)); return cierres.get(x); };
  const parteDeClave = (x) => claves.some((c) => contiene(c, x) && c !== x);
  const violaciones = [];

  // 2FN: subconjuntos propios de cada clave que determinan atributos no primos (incluye las deducidas).
  const vistos = new Map(); // lhs → atributos ya reportados
  for (const c of claves) {
    if (contar(c) < 2) continue;
    for (const s of subconjuntosPorTamano(c, false)) {
      let nuevos = cie(s) & noPrimos & ~s;
      // si un subconjunto más pequeño ya los explica, no repetir
      for (const [x, attrs] of vistos) if (contiene(s, x)) nuevos &= ~attrs;
      if (nuevos) {
        vistos.set(s, (vistos.get(s) || 0) | nuevos);
        violaciones.push({
          tipo: '2FN', izq: s, der: nuevos, clave: c,
          escritas: dfs.map((d, i) => (d.izq === s && (d.der & nuevos) ? i : -1)).filter((i) => i >= 0),
        });
      }
    }
  }

  // Estado de cada DF escrita + violaciones 3FN y BCNF.
  const estados = dfs.map((d, i) => {
    const der = d.der & ~d.izq & universo;
    if (!der || !contiene(universo, d.izq)) return { df: i, estado: 'trivial' };
    if (contiene(cie(d.izq), universo)) return { df: i, estado: 'ok' };
    const np = der & noPrimos;
    if (np && parteDeClave(d.izq)) return { df: i, estado: '2FN' };
    if (np) {
      violaciones.push({ tipo: '3FN', izq: d.izq, der: np, escritas: [i] });
      if (der & primos) violaciones.push({ tipo: 'BCNF', izq: d.izq, der: der & primos, escritas: [i] });
      return { df: i, estado: '3FN' };
    }
    violaciones.push({ tipo: 'BCNF', izq: d.izq, der, escritas: [i] });
    return { df: i, estado: 'BCNF' };
  });
  // Una DF escrita con izquierda parcial que trae atributos primos también rompe BCNF.
  estados.forEach((e) => {
    if (e.estado !== '2FN') return;
    const d = dfs[e.df];
    const p = d.der & ~d.izq & primos;
    if (p) violaciones.push({ tipo: 'BCNF', izq: d.izq, der: p, escritas: [e.df] });
  });

  const hay = (t) => violaciones.some((v) => v.tipo === t);
  const forma = hay('2FN') ? '1FN' : hay('3FN') ? '2FN' : hay('BCNF') ? '3FN' : 'BCNF';
  const orden = { '2FN': 0, '3FN': 1, BCNF: 2 };
  violaciones.sort((a, b) => orden[a.tipo] - orden[b.tipo]);
  return { forma, claves, primos, noPrimos, violaciones, estados, busqueda: k };
}

export const NIVELES = ['1FN', '2FN', '3FN', 'BCNF'];
export const nivel = (forma) => NIVELES.indexOf(forma);

// ---------------------------------------------------------------- proyección

/**
 * Proyecta las DF sobre un subconjunto S: todas las X → (X⁺ ∩ S) con X ⊆ S, reducidas a un recubrimiento mínimo.
 * Es exponencial en |S|; por encima de `limite` se usa solo lo que cabe entero en S (aproximado: true).
 */
export function proyectar(s, dfs, limite = 16) {
  if (contar(s) > limite) {
    const dentro = separar(dfs).filter((d) => contiene(s, d.izq) && contiene(s, d.der));
    return { dfs: recubrimientoMinimo(dentro).dfs, aproximado: true };
  }
  const brutas = [];
  for (const x of subconjuntosPorTamano(s, false)) {
    const y = cierre(x, dfs) & s & ~x;
    if (y) brutas.push({ izq: x, der: y });
  }
  return { dfs: recubrimientoMinimo(brutas).dfs, aproximado: false };
}

// ---------------------------------------------------------------- reunión sin pérdida (chase)

/**
 * Prueba del tablero (chase) de Aho, Beeri y Ullman.
 * Filas = relaciones, columnas = atributos. Celda 0 = símbolo distinguido «a»; otro número = «b_ij».
 * Se igualan símbolos con las DF hasta que nada cambie. Sin pérdida ⇔ alguna fila queda toda en «a».
 */
export function reunionSinPerdida(universo, relaciones, dfs) {
  const cols = indices(universo);
  let sig = 1;
  const t = relaciones.map((r) => cols.map((c) => (r & (1 << c) ? 0 : sig++)));
  const inicial = t.map((f) => f.slice());
  const unitarias = separar(dfs).filter((d) => contiene(universo, d.izq) && contiene(universo, d.der));
  const col = new Map(cols.map((c, j) => [c, j]));
  let cambio = true;
  let rondas = 0;
  while (cambio) {
    cambio = false;
    rondas++;
    for (const d of unitarias) {
      const izq = indices(d.izq).map((c) => col.get(c));
      const j = col.get(indices(d.der)[0]);
      for (let p = 0; p < t.length; p++) {
        for (let q = p + 1; q < t.length; q++) {
          if (!izq.every((c) => t[p][c] === t[q][c])) continue;
          const u = t[p][j], v = t[q][j];
          if (u === v) continue;
          const queda = Math.min(u, v), sale = Math.max(u, v); // 0 («a») gana siempre
          for (const f of t) if (f[j] === sale) f[j] = queda;
          cambio = true;
        }
      }
    }
  }
  const fila = t.findIndex((f) => f.every((v) => v === 0));
  return { sinPerdida: fila >= 0, fila, inicial, final: t, rondas, columnas: cols };
}

// ---------------------------------------------------------------- preservación de dependencias

/**
 * ¿Se preservan las DF? Algoritmo polinomial: para cada X → Y, crecer Z desde X con
 * Z ∪= ((Z ∩ Ri)⁺ ∩ Ri) en cada relación hasta que no cambie; se preserva si Y ⊆ Z.
 * Devuelve { preserva, perdidas: [{ df, izq, der }] } con der = lo que no se alcanza.
 */
export function preservaDependencias(relaciones, dfs) {
  const perdidas = [];
  dfs.forEach((d, i) => {
    let z = d.izq;
    let cambio = true;
    while (cambio) {
      cambio = false;
      for (const r of relaciones) {
        const nuevo = z | (cierre(z & r, dfs) & r);
        if (nuevo !== z) { z = nuevo; cambio = true; }
      }
    }
    const falta = d.der & ~z;
    if (falta) perdidas.push({ df: i, izq: d.izq, der: falta });
  });
  return { preserva: perdidas.length === 0, perdidas };
}

// ---------------------------------------------------------------- descomposiciones

function quitarContenidas(rels) {
  return rels.filter((r, i) => !rels.some((o, j) => j !== i && contiene(o.atributos, r.atributos) && (o.atributos !== r.atributos || j < i)));
}

/**
 * Síntesis de Bernstein (versión de los libros de texto):
 * 1) recubrimiento mínimo; 2) una relación por cada lado izquierdo (X ∪ todo lo que X determina);
 * 3) si ninguna contiene una clave candidata, se agrega una; 4) se quitan las relaciones contenidas en otras.
 * Siempre da 3FN, sin pérdida y preservando dependencias.
 */
export function sintesis3FN(universo, dfs, opciones = {}) {
  const { dfs: min } = recubrimientoMinimo(dfs.filter((d) => contiene(universo, d.izq)));
  let rels = agrupar(min).map((g) => ({ atributos: g.izq | g.der, clave: g.izq, origen: 'df', dfs: [g] }));
  const { claves } = clavesCandidatas(universo, dfs, opciones.limite);
  let claveAgregada = null;
  if (claves.length && !rels.some((r) => claves.some((c) => contiene(r.atributos, c)))) {
    claveAgregada = claves[0];
    rels.push({ atributos: claves[0], clave: claves[0], origen: 'clave', dfs: [] });
  }
  const cubiertos = rels.reduce((a, r) => a | r.atributos, 0);
  if ((universo & ~cubiertos) && !claveAgregada) {
    // atributos sueltos (no aparecen en ninguna DF): ya están en toda clave, pero por si acaso
    rels.push({ atributos: universo & ~cubiertos, clave: universo & ~cubiertos, origen: 'clave', dfs: [] });
  }
  const antes = rels.length;
  rels = quitarContenidas(rels);
  return { relaciones: rels, recubrimiento: min, claveAgregada, quitadas: antes - rels.length };
}

/** Busca una DF que rompa BCNF dentro de S (proyectada). Devuelve el lado izquierdo o null. */
export function violacionBCNF(s, dfs, limite = 16) {
  const candidatos = agrupar(recubrimientoMinimo(dfs).dfs).map((d) => d.izq).filter((x) => contiene(s, x));
  const rompe = (x) => {
    const c = cierre(x, dfs) & s;
    return (c & ~x) !== 0 && c !== s;
  };
  for (const x of candidatos) if (rompe(x)) return x;
  if (contar(s) > limite) return null;
  for (const x of subconjuntosPorTamano(s, false)) if (rompe(x)) return x;
  return null;
}

/**
 * Descomposición BCNF clásica: mientras alguna relación S tenga X → Y que rompa BCNF,
 * se parte en (X⁺ ∩ S) y (S − (X⁺ − X)). Siempre sin pérdida; puede perder dependencias.
 * El resultado depende del orden en que se elijan las violaciones (no es único).
 */
export function descomposicionBCNF(universo, dfs, opciones = {}) {
  const pila = [universo];
  const hojas = [];
  const pasos = [];
  let vueltas = 0;
  while (pila.length && vueltas++ < 200) {
    const s = pila.shift();
    const x = violacionBCNF(s, dfs, opciones.limite);
    if (x === null) { hojas.push(s); continue; }
    const xc = cierre(x, dfs) & s;
    const r1 = xc;
    const r2 = (s & ~xc) | x;
    pasos.push({ desde: s, izq: x, der: xc & ~x, r1, r2 });
    pila.unshift(r1, r2);
  }
  const rels = quitarContenidas(hojas.map((a) => ({ atributos: a })));
  return { relaciones: rels, pasos };
}

/** Describe una relación resultante: sus DF proyectadas, claves y forma normal. */
export function describirRelacion(atributos, dfs) {
  const p = proyectar(atributos, dfs);
  const fn = formaNormal(atributos, p.dfs);
  return { atributos, dfs: p.dfs, claves: fn.claves, forma: fn.forma, aproximado: p.aproximado };
}

/** Análisis completo de un esquema: todo lo que la herramienta muestra. */
export function analizar(n, dfs) {
  if (n > MAX_ATRIBUTOS) throw new Error(`Máximo ${MAX_ATRIBUTOS} atributos.`);
  const universo = n ? (2 ** n - 1) : 0;
  const fn = formaNormal(universo, dfs);
  const min = recubrimientoMinimo(dfs);
  const tres = sintesis3FN(universo, dfs);
  const bc = descomposicionBCNF(universo, dfs);
  const evaluar = (rels) => {
    const masks = rels.map((r) => r.atributos);
    return {
      relaciones: rels.map((r) => ({ ...r, ...describirRelacion(r.atributos, dfs) })),
      reunion: reunionSinPerdida(universo, masks, dfs),
      preservacion: preservaDependencias(masks, separar(dfs)),
    };
  };
  return {
    universo, ...fn, recubrimiento: min,
    tercera: { ...evaluar(tres.relaciones), claveAgregada: tres.claveAgregada },
    bcnf: { ...evaluar(bc.relaciones), pasos: bc.pasos },
  };
}
