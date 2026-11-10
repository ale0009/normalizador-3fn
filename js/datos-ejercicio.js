// Ejercicio 2 de la hoja de normalización: la tabla de notas tal como viene (6 filas), anonimizada.
// Se conservan la estructura, las materias, los semestres, las edades y las notas; los nombres,
// documentos, direcciones y profesores se cambiaron por etiquetas («Estudiante 1», «Prof. A»…).

export const COLUMNAS = ['CedulaE', 'NombreEst', 'EdadE', 'NombreRep', 'DireccionRep', 'NombreMat', 'SemestreM', 'ProfesorM', 'N1', 'N2', 'N3'];

export const FILAS = [
  ['E-01', 'Estudiante 1', 21, 'Rep. 1', 'Barrio 1', 'Matemáticas 1', 2, 'Prof. A', 2, 4, 9],
  ['E-01', 'Estudiante 1', 21, 'Rep. 1', 'Barrio 1', 'Estadística', 2, 'Prof. B', 6, 7, 3],
  ['E-01', 'Estudiante 1', 21, 'Rep. 1', 'Barrio 1', 'Informática', 2, 'Prof. C', 3, 4, 10],
  ['E-02', 'Estudiante 2', 23, 'Rep. 2', 'Barrio 2', 'Matemáticas II', 3, 'Prof. A', 3, 4, 5],
  ['E-02', 'Estudiante 2', 23, 'Rep. 2', 'Barrio 2', 'Inglés', 4, 'Prof. D', 4, 8, 7],
  ['E-02', 'Estudiante 2', 23, 'Rep. 2', 'Barrio 2', 'Bases de datos', 3, 'Prof. E', 5, 8, 8],
];

/** La propuesta de solución que trae la hoja (solo nombres de columnas; «NomnbreRep» y «DireccionRe» corregidos). */
export const SOLUCION_HOJA = [
  ['CedulaE', 'NombreMat', 'N1', 'N2', 'N3'],
  ['CedulaE', 'NombreEst', 'EdadE'],
  ['CedulaE', 'NombreRep', 'DireccionRep'],
  ['CedulaE', 'NombreEst', 'EdadE', 'NombreRep', 'DireccionRep', 'SemestreM', 'SERIAL'],
];
