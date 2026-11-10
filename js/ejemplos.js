// Ejemplos precargados. Los tres primeros salen de los ejercicios de normalización de Mario y David
// (solo los atributos: los datos de las hojas no se copian); los otros son clásicos de libro.

export const EJEMPLOS = [
  {
    id: 'notas',
    titulo: 'Notas de estudiantes',
    origen: 'Hoja de ejercicios de normalización · ejercicio 2',
    atributos: 'CedulaE, NombreEst, EdadE, NombreRep, DireccionRep, NombreMat, SemestreM, ProfesorM, N1, N2, N3',
    dfs: [
      'CedulaE -> NombreEst, EdadE, NombreRep',
      'NombreRep -> DireccionRep',
      'NombreMat -> SemestreM, ProfesorM',
      'CedulaE, NombreMat -> N1, N2, N3',
    ].join('\n'),
  },
  {
    id: 'biblioteca',
    titulo: 'Préstamos de biblioteca',
    origen: 'Hoja de ejercicios de normalización · ejercicio 1',
    atributos: 'CodLibro, Titulo, Autor, Editorial, NombreLector, FechaDev',
    dfs: ['CodLibro -> Titulo, Autor, Editorial', 'CodLibro, NombreLector -> FechaDev'].join('\n'),
  },
  {
    id: 'clinica',
    titulo: 'Clínica: un médico por paciente',
    origen: 'Entrega «Tablas normalizadas» de Mario y David · ejercicio 1',
    atributos: 'Paciente, DirPaciente, TelPaciente, Seguro, FechaConsulta, Doctor, DirDoctor, TelDoctor',
    dfs: ['Paciente -> DirPaciente, TelPaciente, Seguro, FechaConsulta, Doctor', 'Doctor -> DirDoctor, TelDoctor'].join('\n'),
  },
  {
    id: 'factura',
    titulo: 'Facturación',
    origen: 'Entrega «Tablas normalizadas» de Mario y David · ejercicio 2',
    atributos: 'NumFactura, FechaFactura, DocCliente, NombreCliente, DirCliente, TelCliente, CiudadCliente, CodProducto, Descripcion, Categoria, ValorUnitario, Cantidad',
    dfs: [
      'NumFactura -> FechaFactura, DocCliente',
      'DocCliente -> NombreCliente, DirCliente, TelCliente, CiudadCliente',
      'CodProducto -> Descripcion, Categoria, ValorUnitario',
      'NumFactura, CodProducto -> Cantidad',
    ].join('\n'),
  },
  {
    id: 'postal',
    titulo: 'Dirección postal',
    origen: 'Clásico de libro (3FN que no es BCNF)',
    atributos: 'Calle, Ciudad, CP',
    dfs: ['Calle, Ciudad -> CP', 'CP -> Ciudad'].join('\n'),
  },
  {
    id: 'letras',
    titulo: 'R(A, B, C, D, E)',
    origen: 'Clásico de libro (cuatro claves)',
    atributos: 'A, B, C, D, E',
    dfs: ['A -> B, C', 'C, D -> E', 'B -> D', 'E -> A'].join('\n'),
  },
];

export const POR_DEFECTO = 'notas';
