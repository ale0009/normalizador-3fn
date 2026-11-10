// Lectura del formato simple: atributos separados por comas y una DF por línea («A, B -> C, D»).
import { MAX_ATRIBUTOS, indices } from './fd.js';

const FLECHA = /\s*(?:->|→|=>|⟶)\s*/;

function partir(texto) {
  return texto.split(/[,;\n]/).map((t) => t.trim().replace(/\s+/g, ' ')).filter(Boolean);
}

/**
 * Convierte el texto en { atributos, dfs, errores, avisos }.
 * - Si los atributos son una sola palabra en mayúsculas («ABCDE»), cada letra es un atributo.
 * - En las DF, «AB» se lee como A y B si todos los atributos son de una letra.
 * - Un atributo que aparece en una DF y no estaba en la lista se agrega con un aviso.
 */
export function leerEsquema(textoAtributos, textoDfs) {
  const errores = [];
  const avisos = [];
  let atributos = partir(textoAtributos || '');
  if (atributos.length === 1 && /^[A-Z]{2,}$/.test(atributos[0])) atributos = atributos[0].split('');
  const vistos = new Set();
  atributos = atributos.filter((a) => {
    const k = a.toLowerCase();
    if (vistos.has(k)) { avisos.push(`«${a}» estaba repetido; se cuenta una vez.`); return false; }
    vistos.add(k);
    return true;
  });

  const buscar = (nombre) => {
    let i = atributos.indexOf(nombre);
    if (i < 0) i = atributos.findIndex((a) => a.toLowerCase() === nombre.toLowerCase());
    return i;
  };
  const deUnaLetra = () => atributos.length > 0 && atributos.every((a) => a.length === 1);

  const lado = (texto, nLinea) => {
    let m = 0;
    for (const tok of texto.split(',').map((t) => t.trim().replace(/\s+/g, ' ')).filter(Boolean)) {
      let i = buscar(tok);
      if (i < 0 && tok.length > 1 && deUnaLetra() && /^[A-Za-z]+$/.test(tok) && [...tok].every((c) => buscar(c) >= 0)) {
        for (const c of tok) m |= 1 << buscar(c);
        continue;
      }
      if (i < 0) {
        if (!/^[\p{L}\p{N}_][\p{L}\p{N}_ .#-]*$/u.test(tok)) {
          errores.push({ linea: nLinea, mensaje: `«${tok}» no parece un nombre de atributo.` });
          continue;
        }
        atributos.push(tok);
        i = atributos.length - 1;
        avisos.push(`«${tok}» (línea ${nLinea}) no estaba en la lista de atributos; se agregó.`);
      }
      if (i >= MAX_ATRIBUTOS) continue;
      m |= 1 << i;
    }
    return m;
  };

  const dfs = [];
  (textoDfs || '').split('\n').forEach((bruta, k) => {
    const nLinea = k + 1;
    const linea = bruta.replace(/(#|\/\/).*$/, '').trim();
    if (!linea) return;
    for (const parte of linea.split(';').map((p) => p.trim()).filter(Boolean)) {
      const lados = parte.split(FLECHA);
      if (lados.length !== 2) {
        errores.push({ linea: nLinea, mensaje: lados.length < 2 ? 'Falta la flecha «->».' : 'Hay más de una flecha; escribe una dependencia por línea.' });
        continue;
      }
      if (!lados[0].trim()) { errores.push({ linea: nLinea, mensaje: 'Falta el lado izquierdo (lo que determina).' }); continue; }
      if (!lados[1].trim()) { errores.push({ linea: nLinea, mensaje: 'Falta el lado derecho (lo determinado).' }); continue; }
      const izq = lado(lados[0], nLinea);
      const der = lado(lados[1], nLinea);
      if (izq && der) dfs.push({ izq, der, linea: nLinea });
    }
  });

  if (atributos.length > MAX_ATRIBUTOS) {
    errores.push({ linea: 0, mensaje: `Hay ${atributos.length} atributos; el máximo es ${MAX_ATRIBUTOS}.` });
  }
  if (!atributos.length) errores.push({ linea: 0, mensaje: 'Escribe al menos un atributo.' });
  return { atributos, dfs, errores, avisos };
}

/** Nombres de una máscara, en el orden de la lista de atributos. */
export function nombres(mascara, atributos) {
  return indices(mascara).map((i) => atributos[i]);
}

/** «A, B → C» */
export function textoDf(df, atributos, flecha = '→') {
  return `${nombres(df.izq, atributos).join(', ')} ${flecha} ${nombres(df.der, atributos).join(', ')}`;
}

/** «{A, B}» */
export function textoConjunto(mascara, atributos) {
  return `{${nombres(mascara, atributos).join(', ')}}`;
}
