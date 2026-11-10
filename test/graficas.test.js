import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redundancia, proyectarFilas, seCumple, curvaRedundancia, svgBarrasRedundancia, svgCurva, svgPoda } from '../js/graficas.js';
import { COLUMNAS, FILAS } from '../js/datos-ejercicio.js';

const DFS = [
  { izq: ['CedulaE'], der: ['NombreEst', 'EdadE', 'NombreRep'] },
  { izq: ['NombreRep'], der: ['DireccionRep'] },
  { izq: ['NombreMat'], der: ['SemestreM', 'ProfesorM'] },
];

test('la tabla de notas de la hoja: 66 celdas, 16 repiten algo ya guardado (contado a mano: 2×2×3 + 2×2×1)', () => {
  const r = redundancia(COLUMNAS, FILAS, DFS);
  assert.equal(r.celdas, 66);
  assert.deepEqual(r.porDf, [12, 4, 0]);
  assert.equal(r.redundantes, 16);
});

test('las cuatro tablas 3FN guardan 60 celdas y ninguna repetida', () => {
  const tablas = [
    ['CedulaE', 'NombreEst', 'EdadE', 'NombreRep'], ['NombreRep', 'DireccionRep'],
    ['NombreMat', 'SemestreM', 'ProfesorM'], ['CedulaE', 'NombreMat', 'N1', 'N2', 'N3'],
  ];
  let celdas = 0, rep = 0;
  for (const t of tablas) {
    const filas = proyectarFilas(COLUMNAS, FILAS, t);
    const r = redundancia(t, filas, DFS);
    celdas += r.celdas; rep += r.redundantes;
  }
  assert.equal(celdas, 2 * 4 + 2 * 2 + 6 * 3 + 6 * 5);
  assert.equal(rep, 0);
});

test('los datos de la hoja no contradicen las DF, pero sí refutan «ProfesorM → SemestreM»', () => {
  for (const d of DFS) assert.ok(seCumple(COLUMNAS, FILAS, d.izq, d.der));
  assert.equal(seCumple(COLUMNAS, FILAS, ['ProfesorM'], ['SemestreM']), false);
  assert.equal(seCumple(COLUMNAS, FILAS, ['CedulaE'], ['SemestreM']), false);
});

test('curva: con 3 materias 4·2/(11·3) = 24,2 %; con 1 materia 0 %', () => {
  const c = curvaRedundancia();
  assert.equal(c[0].pct, 0);
  assert.ok(Math.abs(c[2].pct - 800 / 33) < 1e-9);
});

test('las gráficas son SVG con título accesible', () => {
  for (const s of [
    svgBarrasRedundancia({ celdas: 66, redundantes: 16 }, { celdas: 60, redundantes: 0 }),
    svgCurva(curvaRedundancia()),
    svgPoda([{ nombre: 'x', revisados: 1, ingenuo: 2047 }]),
  ]) {
    assert.match(s, /^<svg [^>]*role="img"/);
    assert.match(s, /<title id=/);
    assert.match(s, /<\/svg>$/);
  }
});
