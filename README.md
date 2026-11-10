# ¿Tu tabla está en 3FN?

Escribe los atributos de una tabla y sus dependencias funcionales (`A, B -> C`, una por línea) o elige un ejemplo, y la herramienta, **sin servidor y sin enviar nada**:

- calcula **cierres** paso a paso (eliges X con botones y ves X⁺ crecer);
- encuentra **todas las claves candidatas**, con poda (lo que nunca aparece a la derecha va en toda clave);
- obtiene el **recubrimiento mínimo** y explica qué quitó y por qué;
- dice en qué **forma normal** está (1FN supuesta, 2FN, 3FN, BCNF) y **qué dependencia viola cuál**, incluidas las parciales deducidas;
- dibuja el **grafo de dependencias** en SVG, con las violaciones animadas en rojo;
- propone la descomposición **3FN (síntesis de Bernstein)** y la **BCNF**, como cartas, y comprueba **reunión sin pérdida** (tablero *chase*) y **preservación de dependencias**.

La página `/proceso/` cuenta de dónde sale: la teoría (Codd, Armstrong, Bernstein, Aho–Beeri–Ullman), el ejercicio de notas de estudiantes de nuestra hoja de normalización resuelto paso a paso, gráficas de redundancia y de la poda de claves, decisiones de diseño, limitaciones y fe de erratas.

## Uso

```bash
python3 -m http.server 8000   # y abre http://localhost:8000
node --test                   # 36 pruebas con ejemplos clásicos de libro
```

Sin dependencias ni compilación; se publica tal cual en GitHub Pages. La lógica está en funciones puras (`js/fd.js`, `js/esquema.js`, `js/grafo.js`, `js/graficas.js`).

## Formato

```
Atributos:   CedulaE, NombreEst, NombreMat, Nota
Dependencias:
CedulaE -> NombreEst
CedulaE, NombreMat -> Nota
```

Si todos los atributos son de una letra puedes escribir `ABCDE` y `AB -> C`. También valen `→` y `;` para varias en una línea; `#` comenta.

## Limitaciones

Solo dependencias funcionales (no 4FN ni 5FN), 1FN supuesta, máximo 30 atributos y búsqueda exponencial de claves en el peor caso. La descomposición BCNF no es única.

## Créditos

[Mario Puerta «ale0009»](https://github.com/ale0009) × [David Rincón «Kuronoma»](https://www.linkedin.com/in/davidalexanderrinconcorredorkuronoma/). Sale de nuestros ejercicios de normalización de bases de datos. Licencia MIT.
