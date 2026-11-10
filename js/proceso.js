// Página /proceso/: resuelve en vivo el ejercicio real con el mismo motor de la herramienta y dibuja las gráficas.
import { iniciarTema } from './tema.js';
import { analizar, cierreConPasos, preservaDependencias, reunionSinPerdida, separar } from './fd.js';
import { leerEsquema, nombres, textoDf, textoConjunto } from './esquema.js';
import { EJEMPLOS } from './ejemplos.js';
import { svgGrafo } from './grafo.js';
import { COLUMNAS, FILAS, SOLUCION_HOJA } from './datos-ejercicio.js';
import { redundancia, proyectarFilas, curvaRedundancia, svgBarrasRedundancia, svgCurva, svgPoda } from './graficas.js';

iniciarTema(document.getElementById('tema'));
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const tabla = (cols, filas, clave = []) => `<div class="tabla-envoltura"><table class="tabla${cols.length > 4 ? ' tabla-ancha' : ''}"><thead><tr>${cols.map((c) => `<th scope="col">${clave.includes(c) ? `<u>${esc(c)}</u>` : esc(c)}</th>`).join('')}</tr></thead><tbody>${filas.map((f) => `<tr>${f.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

try {
  // 1. La tabla original
  $('tabla-original').innerHTML = tabla(COLUMNAS, FILAS);

  // 2. El análisis con el motor
  const ej = EJEMPLOS.find((e) => e.id === 'notas');
  const e = leerEsquema(ej.atributos, ej.dfs);
  const a = analizar(e.atributos.length, e.dfs);
  const N = (m) => esc(textoConjunto(m, e.atributos));
  const L = (m) => esc(nombres(m, e.atributos).join(', '));
  const clave = a.claves[0];
  const { pasos } = cierreConPasos(clave, e.dfs);
  $('paso-cierre').innerHTML = `<p>Empiezo con X = ${N(clave)} (lo que nunca aparece a la derecha de una flecha) y aplico las DF hasta que nada cambie:</p><ol class="pasos">${pasos.map((p) => `<li><code>${esc(textoDf(e.dfs[p.df], e.atributos))}</code> suma <b>${L(p.nuevos)}</b></li>`).join('')}</ol><p>X⁺ tiene los ${e.atributos.length} atributos: ${N(clave)} es superclave. Como ninguna de sus partes sola alcanza todo, es <b>la única clave candidata</b> (la herramienta lo comprobó con ${a.busqueda.revisados} cierre de ${a.busqueda.ingenuo.toLocaleString('es-CO')} combinaciones posibles).</p>`;
  $('paso-violaciones').innerHTML = `<ul>${a.violaciones.map((v) => `<li><span class="tag ${v.tipo === 'BCNF' ? 'm-bajo-t' : 'm-alto-t'}">rompe ${v.tipo}</span> <code>${L(v.izq)} → ${L(v.der)}</code>${v.tipo === '2FN' ? ` · ${L(v.izq)} es solo una parte de la clave${v.escritas.length ? '' : ' (deducida)'}` : ' · NombreRep no es clave: clave → NombreRep → DireccionRep'}</li>`).join('')}</ul><p>Resultado: <b>${a.forma}</b>. Fíjate en la primera: <code>DireccionRep</code> no estaba escrita junto a <code>CedulaE</code>; aparece por transitividad.</p>`;
  $('paso-grafo').innerHTML = svgGrafo(e.atributos, e.dfs, { claves: a.claves, primos: a.primos, estados: a.estados }).svg;
  const rels = a.tercera.relaciones;
  $('paso-tablas').innerHTML = rels.map((r, i) => {
    const cols = nombres(r.atributos, e.atributos);
    const pk = nombres(r.claves[0], e.atributos);
    return `<figure class="figura"><figcaption><b>T${i + 1}</b> · clave ${esc(pk.join(', '))}</figcaption>${tabla(cols, proyectarFilas(COLUMNAS, FILAS, cols), pk)}</figure>`;
  }).join('');
  $('paso-pruebas').innerHTML = `Reunión sin pérdida: <b>${a.tercera.reunion.sinPerdida ? 'sí' : 'no'}</b> (la fila de T${a.tercera.reunion.fila + 1} del tablero quedó toda en «a»). Preserva dependencias: <b>${a.tercera.preservacion.preserva ? 'sí' : 'no'}</b>. La descomposición BCNF da las mismas ${a.bcnf.relaciones.length} tablas.`;

  // 3. La solución de la hoja, revisada con el mismo motor
  const sinSerial = SOLUCION_HOJA.map((t) => t.filter((c) => e.atributos.includes(c)));
  const masks = sinSerial.map((t) => t.reduce((m, c) => m | (1 << e.atributos.indexOf(c)), 0));
  const cubre = masks.reduce((m, x) => m | x, 0);
  const faltan = nombres(a.universo & ~cubre, e.atributos);
  const pres = preservaDependencias(masks, separar(e.dfs));
  const reu = reunionSinPerdida(cubre, masks, e.dfs);
  $('hoja-tablas').innerHTML = `<ol>${SOLUCION_HOJA.map((t) => `<li><code>${esc(t.join(', '))}</code></li>`).join('')}</ol>`;
  $('hoja-revision').innerHTML = `<ul>
    <li>Ninguna tabla tiene <b>${esc(faltan.join(', ') || '—')}</b>: ese dato se pierde.</li>
    <li>No se preservan: ${pres.perdidas.map((p) => `<code>${L(p.izq)} → ${L(p.der)}</code>`).join(', ')}.</li>
    <li>Reunión sin pérdida: <b>${reu.sinPerdida ? 'sí' : 'no'}</b> (sobre los atributos que sí quedan)${reu.sinPerdida ? '' : ': SemestreM solo queda junto a CedulaE, así que al juntar las tablas cada materia se combina con todos los semestres del estudiante y aparecen filas falsas'}.</li>
    <li>La cuarta tabla repite NombreEst, EdadE, NombreRep y DireccionRep junto a SemestreM: vuelve a mezclar al estudiante con datos de la materia.</li>
  </ul>`;

  // 4. Gráficas
  const DFS_N = [
    { izq: ['CedulaE'], der: ['NombreEst', 'EdadE', 'NombreRep'] },
    { izq: ['NombreRep'], der: ['DireccionRep'] },
    { izq: ['NombreMat'], der: ['SemestreM', 'ProfesorM'] },
  ];
  const antes = redundancia(COLUMNAS, FILAS, DFS_N);
  const despues = rels.reduce((acc, r) => {
    const cols = nombres(r.atributos, e.atributos);
    const x = redundancia(cols, proyectarFilas(COLUMNAS, FILAS, cols), DFS_N);
    return { celdas: acc.celdas + x.celdas, redundantes: acc.redundantes + x.redundantes };
  }, { celdas: 0, redundantes: 0 });
  $('g-redundancia').innerHTML = svgBarrasRedundancia(antes, despues);
  $('g-curva').innerHTML = svgCurva(curvaRedundancia());
  const filas = EJEMPLOS.map((x) => {
    const s = leerEsquema(x.atributos, x.dfs);
    const r = analizar(s.atributos.length, s.dfs);
    return { nombre: x.titulo.length > 20 ? `${x.titulo.slice(0, 19)}…` : x.titulo, revisados: r.busqueda.revisados, ingenuo: r.busqueda.ingenuo, forma: r.forma, claves: r.claves.length, n: s.atributos.length, tablas3: r.tercera.relaciones.length, tablasB: r.bcnf.relaciones.length, pierde: r.bcnf.preservacion.perdidas.length, completo: x.titulo };
  });
  $('g-poda').innerHTML = svgPoda(filas);
  $('tabla-ejemplos').innerHTML = tabla(
    ['Ejemplo', 'Atributos', 'Claves', 'Forma', 'Tablas 3FN', 'Tablas BCNF', 'DF que pierde BCNF'],
    filas.map((f) => [f.completo, f.n, f.claves, f.forma, f.tablas3, f.tablasB, f.pierde]),
  );
  $('cifra-redundancia').textContent = `${antes.redundantes} de ${antes.celdas}`;
} catch (err) {
  for (const id of ['paso-cierre', 'g-redundancia']) $(id).textContent = `No se pudo calcular (${err.message}).`;
}
