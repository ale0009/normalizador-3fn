// Ejemplos clásicos de libro, verificados a mano (los resultados esperados se escribieron antes de correr el código).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cierre, cierreConPasos, clavesCandidatas, recubrimientoMinimo, equivalentes, formaNormal,
  sintesis3FN, descomposicionBCNF, reunionSinPerdida, preservaDependencias, proyectar, analizar, separar, contar,
} from '../js/fd.js';
import { leerEsquema, nombres, textoDf } from '../js/esquema.js';
import { EJEMPLOS } from '../js/ejemplos.js';

/** Arma un esquema desde texto y devuelve ayudas para comparar por nombres. */
function esq(atributos, dfs) {
  const e = leerEsquema(atributos, dfs.replace(/;/g, '\n'));
  assert.deepEqual(e.errores, []);
  const m = (txt) => txt.split(',').map((t) => t.trim()).filter(Boolean).reduce((a, n) => a | (1 << e.atributos.indexOf(n)), 0);
  const n = (mask) => nombres(mask, e.atributos).join(',');
  const U = 2 ** e.atributos.length - 1;
  return { ...e, m, n, U };
}
const conjuntos = (e, lista) => lista.map((r) => e.n(r.atributos ?? r)).sort();

// ------------------------------------------------------------------ cierre
test('cierre: {A,B}⁺ = {A,B,C,D,E} (Ullman y Widom)', () => {
  const e = esq('A,B,C,D,E,F', 'A,B->C; B,C->A,D; D->E; C,F->B');
  assert.equal(e.n(cierre(e.m('A,B'), e.dfs)), 'A,B,C,D,E');
  const { pasos } = cierreConPasos(e.m('A,B'), e.dfs);
  assert.deepEqual(pasos.map((p) => e.n(p.nuevos)), ['C', 'D', 'E']);
});

test('cierre: {A,G}⁺ es todo R (Silberschatz)', () => {
  const e = esq('A,B,C,G,H,I', 'A->B; A->C; C,G->H; C,G->I; B->H');
  assert.equal(e.n(cierre(e.m('A,G'), e.dfs)), 'A,B,C,G,H,I');
  assert.equal(e.n(cierre(e.m('A'), e.dfs)), 'A,B,C,H');
});

test('cierre: EMP_PROJ de Elmasri y Navathe', () => {
  const e = esq('Ssn,Pnumber,Hours,Ename,Pname,Plocation', 'Ssn,Pnumber->Hours; Ssn->Ename; Pnumber->Pname,Plocation');
  assert.equal(e.n(cierre(e.m('Ssn'), e.dfs)), 'Ssn,Ename');
  assert.equal(e.n(cierre(e.m('Pnumber'), e.dfs)), 'Pnumber,Pname,Plocation');
  assert.equal(e.n(cierre(e.m('Ssn,Pnumber'), e.dfs)), 'Ssn,Pnumber,Hours,Ename,Pname,Plocation');
});

// ------------------------------------------------------------------ claves
test('claves: R(ABCDE) con A→BC, CD→E, B→D, E→A tiene cuatro: A, E, BC, CD', () => {
  const e = esq('ABCDE', 'A->BC; CD->E; B->D; E->A');
  const k = clavesCandidatas(e.U, e.dfs);
  assert.deepEqual(k.claves.map(e.n), ['A', 'E', 'B,C', 'C,D']);
  assert.ok(k.revisados < k.ingenuo, 'la poda revisa menos que 2^n − 1');
});

test('claves: el núcleo (atributos que nunca se deducen) basta si su cierre es todo', () => {
  const e = esq('A,B,C,G,H,I', 'A->B; A->C; C,G->H; C,G->I; B->H');
  const k = clavesCandidatas(e.U, e.dfs);
  assert.deepEqual(k.claves.map(e.n), ['A,G']);
  assert.equal(k.revisados, 1);
});

test('claves: sin DF la única clave es todo el esquema', () => {
  const e = esq('A,B,C', '');
  assert.deepEqual(clavesCandidatas(e.U, e.dfs).claves.map(e.n), ['A,B,C']);
});

test('claves: dirección postal tiene {Calle, Ciudad} y {Calle, CP}', () => {
  const e = esq('Calle,Ciudad,CP', 'Calle,Ciudad->CP; CP->Ciudad');
  assert.deepEqual(clavesCandidatas(e.U, e.dfs).claves.map(e.n), ['Calle,Ciudad', 'Calle,CP']);
});

// ------------------------------------------------------------------ recubrimiento mínimo
test('recubrimiento: {A→BC, B→C, A→B, AB→C} queda {A→B, B→C} (Silberschatz)', () => {
  const e = esq('A,B,C', 'A->B,C; B->C; A->B; A,B->C');
  const r = recubrimientoMinimo(e.dfs);
  assert.deepEqual(r.dfs.map((d) => textoDf(d, e.atributos, '->')), ['A -> B', 'B -> C']);
  assert.ok(equivalentes(r.dfs, e.dfs));
  assert.deepEqual(r.registro.map((x) => x.tipo), ['extrano', 'redundante']);
});

test('recubrimiento: {B→A, D→A, AB→D} queda {D→A, B→D} (Elmasri y Navathe)', () => {
  const e = esq('A,B,D', 'B->A; D->A; A,B->D');
  const r = recubrimientoMinimo(e.dfs);
  assert.deepEqual(r.dfs.map((d) => textoDf(d, e.atributos, '->')), ['D -> A', 'B -> D']);
  assert.ok(equivalentes(r.dfs, e.dfs));
});

test('recubrimiento: siempre equivalente y con un solo atributo a la derecha', () => {
  for (const ej of EJEMPLOS) {
    const e = leerEsquema(ej.atributos, ej.dfs);
    const r = recubrimientoMinimo(e.dfs);
    assert.ok(equivalentes(r.dfs, e.dfs), ej.id);
    assert.ok(r.dfs.every((d) => contar(d.der) === 1), ej.id);
  }
});

// ------------------------------------------------------------------ formas normales
test('forma normal: EMP_PROJ está en 1FN (dos dependencias parciales)', () => {
  const e = esq('Ssn,Pnumber,Hours,Ename,Pname,Plocation', 'Ssn,Pnumber->Hours; Ssn->Ename; Pnumber->Pname,Plocation');
  const f = formaNormal(e.U, e.dfs);
  assert.equal(f.forma, '1FN');
  assert.deepEqual(f.violaciones.map((v) => `${v.tipo}:${e.n(v.izq)}->${e.n(v.der)}`), ['2FN:Ssn->Ename', '2FN:Pnumber->Pname,Plocation']);
  assert.deepEqual(f.estados.map((x) => x.estado), ['ok', '2FN', '2FN']);
});

test('forma normal: EMP_DEPT está en 2FN (dependencia transitiva por Dnumber)', () => {
  const e = esq('Ename,Ssn,Bdate,Address,Dnumber,Dname,Dmgr_ssn', 'Ssn->Ename,Bdate,Address,Dnumber; Dnumber->Dname,Dmgr_ssn');
  const f = formaNormal(e.U, e.dfs);
  assert.equal(f.forma, '2FN');
  assert.deepEqual(f.violaciones.map((v) => `${v.tipo}:${e.n(v.izq)}->${e.n(v.der)}`), ['3FN:Dnumber->Dname,Dmgr_ssn']);
});

test('forma normal: dirección postal está en 3FN pero no en BCNF', () => {
  const e = esq('Calle,Ciudad,CP', 'Calle,Ciudad->CP; CP->Ciudad');
  const f = formaNormal(e.U, e.dfs);
  assert.equal(f.forma, '3FN');
  assert.deepEqual(f.violaciones.map((v) => `${v.tipo}:${e.n(v.izq)}->${e.n(v.der)}`), ['BCNF:CP->Ciudad']);
});

test('forma normal: R(ABCDE) con cuatro claves está en 3FN; B→D rompe BCNF', () => {
  const e = esq('ABCDE', 'A->BC; CD->E; B->D; E->A');
  const f = formaNormal(e.U, e.dfs);
  assert.equal(f.forma, '3FN');
  assert.deepEqual(f.violaciones.map((v) => `${v.tipo}:${e.n(v.izq)}->${e.n(v.der)}`), ['BCNF:B->D']);
});

test('forma normal: una dependencia parcial deducida (A→D vía C) también cuenta', () => {
  const e = esq('A,B,C,D', 'A,B->D; A->C; C->D');
  const f = formaNormal(e.U, e.dfs);
  assert.equal(f.forma, '1FN');
  const parcial = f.violaciones.find((v) => v.tipo === '2FN');
  assert.equal(e.n(parcial.izq), 'A');
  assert.equal(e.n(parcial.der), 'C,D');
  assert.deepEqual(f.estados.map((x) => x.estado), ['ok', '2FN', '3FN']);
});

test('forma normal: una relación con clave simple y nada más está en BCNF', () => {
  const e = esq('Id,Nombre,Correo', 'Id->Nombre,Correo');
  assert.equal(formaNormal(e.U, e.dfs).forma, 'BCNF');
});

// ------------------------------------------------------------------ descomposiciones
test('síntesis 3FN: EMP_PROJ da EP1, EP2 y EP3 (Elmasri y Navathe)', () => {
  const e = esq('Ssn,Pnumber,Hours,Ename,Pname,Plocation', 'Ssn,Pnumber->Hours; Ssn->Ename; Pnumber->Pname,Plocation');
  const s = sintesis3FN(e.U, e.dfs);
  assert.deepEqual(conjuntos(e, s.relaciones), ['Ssn,Ename', 'Ssn,Pnumber,Hours', 'Pnumber,Pname,Plocation'].sort());
  assert.equal(s.claveAgregada, null);
});

test('síntesis 3FN: si ninguna tabla tiene la clave, se agrega una (A→B, C→D en ABCDE)', () => {
  const e = esq('A,B,C,D,E', 'A->B; C->D');
  const s = sintesis3FN(e.U, e.dfs);
  assert.deepEqual(conjuntos(e, s.relaciones), ['A,B', 'C,D', 'A,C,E'].sort());
  assert.equal(e.n(s.claveAgregada), 'A,C,E');
});

test('síntesis 3FN: la dirección postal queda igual (la tabla de CP está contenida)', () => {
  const e = esq('Calle,Ciudad,CP', 'Calle,Ciudad->CP; CP->Ciudad');
  const s = sintesis3FN(e.U, e.dfs);
  assert.deepEqual(conjuntos(e, s.relaciones), ['Calle,Ciudad,CP']);
});

test('BCNF: la dirección postal se parte en {Ciudad, CP} y {Calle, CP} y pierde Calle, Ciudad → CP', () => {
  const e = esq('Calle,Ciudad,CP', 'Calle,Ciudad->CP; CP->Ciudad');
  const b = descomposicionBCNF(e.U, e.dfs);
  assert.deepEqual(conjuntos(e, b.relaciones), ['Calle,CP', 'Ciudad,CP']);
  const rels = b.relaciones.map((r) => r.atributos);
  assert.equal(reunionSinPerdida(e.U, rels, e.dfs).sinPerdida, true);
  const p = preservaDependencias(rels, separar(e.dfs));
  assert.equal(p.preserva, false);
  assert.deepEqual(p.perdidas.map((x) => `${e.n(x.izq)}->${e.n(x.der)}`), ['Calle,Ciudad->CP']);
});

test('chase: {AB, BC} con B→C es sin pérdida; con A→B no', () => {
  const e = esq('A,B,C', 'B->C');
  assert.equal(reunionSinPerdida(e.U, [e.m('A,B'), e.m('B,C')], e.dfs).sinPerdida, true);
  const f = esq('A,B,C', 'A->B');
  assert.equal(reunionSinPerdida(f.U, [f.m('A,B'), f.m('B,C')], f.dfs).sinPerdida, false);
});

test('chase: EMP_PROJ partida como en la figura de Elmasri y Navathe pierde información; EMP, PROJ, WORKS_ON no', () => {
  const e = esq('Ssn,Ename,Pnumber,Pname,Plocation,Hours', 'Ssn->Ename; Pnumber->Pname,Plocation; Ssn,Pnumber->Hours');
  const mala = reunionSinPerdida(e.U, [e.m('Ename,Plocation'), e.m('Ssn,Pnumber,Hours,Pname,Plocation')], e.dfs);
  assert.equal(mala.sinPerdida, false);
  const buena = reunionSinPerdida(e.U, [e.m('Ssn,Ename'), e.m('Pnumber,Pname,Plocation'), e.m('Ssn,Pnumber,Hours')], e.dfs);
  assert.equal(buena.sinPerdida, true);
  assert.equal(buena.fila, 2);
});

test('proyección: {A→B, B→C} sobre {A, C} da A→C', () => {
  const e = esq('A,B,C', 'A->B; B->C');
  const p = proyectar(e.m('A,C'), e.dfs);
  assert.deepEqual(p.dfs.map((d) => textoDf(d, e.atributos, '->')), ['A -> C']);
});

test('todos los ejemplos: 3FN sin pérdida y preservando; BCNF sin pérdida y en BCNF', () => {
  for (const ej of EJEMPLOS) {
    const e = leerEsquema(ej.atributos, ej.dfs);
    const a = analizar(e.atributos.length, e.dfs);
    assert.equal(a.tercera.reunion.sinPerdida, true, ej.id);
    assert.equal(a.tercera.preservacion.preserva, true, ej.id);
    assert.ok(a.tercera.relaciones.every((r) => ['3FN', 'BCNF'].includes(r.forma)), ej.id);
    assert.equal(a.bcnf.reunion.sinPerdida, true, ej.id);
    assert.ok(a.bcnf.relaciones.every((r) => r.forma === 'BCNF'), ej.id);
  }
});

test('ejemplo de notas: 1FN, clave {CedulaE, NombreMat} y cuatro tablas', () => {
  const ej = EJEMPLOS.find((x) => x.id === 'notas');
  const e = leerEsquema(ej.atributos, ej.dfs);
  const a = analizar(e.atributos.length, e.dfs);
  const n = (m) => nombres(m, e.atributos).join(',');
  assert.equal(a.forma, '1FN');
  assert.deepEqual(a.claves.map(n), ['CedulaE,NombreMat']);
  assert.deepEqual(a.violaciones.map((v) => `${v.tipo}:${n(v.izq)}->${n(v.der)}`), [
    '2FN:CedulaE->NombreEst,EdadE,NombreRep,DireccionRep',
    '2FN:NombreMat->SemestreM,ProfesorM',
    '3FN:NombreRep->DireccionRep',
  ]);
  assert.deepEqual(a.tercera.relaciones.map((r) => n(r.atributos)), [
    'CedulaE,NombreEst,EdadE,NombreRep', 'NombreRep,DireccionRep', 'NombreMat,SemestreM,ProfesorM', 'CedulaE,NombreMat,N1,N2,N3',
  ]);
});

test('formas de los ejemplos precargados', () => {
  const formas = Object.fromEntries(EJEMPLOS.map((ej) => {
    const e = leerEsquema(ej.atributos, ej.dfs);
    return [ej.id, formaNormal(2 ** e.atributos.length - 1, e.dfs).forma];
  }));
  assert.deepEqual(formas, { notas: '1FN', biblioteca: '1FN', clinica: '2FN', factura: '1FN', postal: '3FN', letras: '3FN' });
});
