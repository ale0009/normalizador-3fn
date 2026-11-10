import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerEsquema, textoDf, textoConjunto } from '../js/esquema.js';

test('lee atributos con comas y DF con flecha ASCII o Unicode', () => {
  const e = leerEsquema('CodLibro, Titulo, NombreLector, FechaDev', 'CodLibro -> Titulo\nCodLibro, NombreLector → FechaDev');
  assert.deepEqual(e.atributos, ['CodLibro', 'Titulo', 'NombreLector', 'FechaDev']);
  assert.deepEqual(e.dfs.map((d) => textoDf(d, e.atributos)), ['CodLibro → Titulo', 'CodLibro, NombreLector → FechaDev']);
  assert.deepEqual(e.errores, []);
});

test('«ABCDE» son cinco atributos y «CD -> E» se lee como C, D → E', () => {
  const e = leerEsquema('ABCDE', 'CD -> E');
  assert.deepEqual(e.atributos, ['A', 'B', 'C', 'D', 'E']);
  assert.equal(textoDf(e.dfs[0], e.atributos), 'C, D → E');
});

test('un atributo nuevo en una DF se agrega con aviso; mayúsculas no importan', () => {
  const e = leerEsquema('A, B', 'a -> Nuevo');
  assert.deepEqual(e.atributos, ['A', 'B', 'Nuevo']);
  assert.equal(e.avisos.length, 1);
  assert.equal(textoConjunto(e.dfs[0].izq, e.atributos), '{A}');
});

test('errores: sin flecha, lado vacío, varias flechas; comentarios y líneas vacías se ignoran', () => {
  const e = leerEsquema('A, B, C', '# comentario\nA B\n -> B\nA ->\nA -> B -> C\n\nA -> B; B -> C');
  assert.deepEqual(e.errores.map((x) => x.linea), [2, 3, 4, 5]);
  assert.equal(e.dfs.length, 2);
});

test('repetidos se cuentan una vez y hay tope de 30 atributos', () => {
  assert.deepEqual(leerEsquema('A, B, a', '').atributos, ['A', 'B']);
  const muchos = Array.from({ length: 31 }, (_, i) => `x${i}`).join(',');
  assert.equal(leerEsquema(muchos, '').errores.length, 1);
});
