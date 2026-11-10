# Is your table in 3NF?

Type a table's attributes and its functional dependencies (`A, B -> C`, one per line) or pick an example, and the tool, **with no server and nothing uploaded**:

- computes **attribute closures** step by step;
- finds **all candidate keys**, with pruning (attributes never on a right-hand side belong to every key);
- derives a **minimal cover** and explains what it removed;
- tells which **normal form** the table is in (1NF assumed, 2NF, 3NF, BCNF) and **which dependency violates which**, including derived partial dependencies;
- draws an SVG **dependency graph** with the violations animated in red;
- proposes the **3NF decomposition (Bernstein synthesis)** and a **BCNF** one, shown as cards, and checks **lossless join** (chase tableau) and **dependency preservation**.

`/proceso/` (Spanish) explains the theory, solves a real exercise from our normalization worksheet step by step, and covers charts, design decisions, limitations and errata.

## Usage

```bash
python3 -m http.server 8000   # then open http://localhost:8000
node --test                   # 36 tests based on classic textbook examples
```

No dependencies, no build step; deployable as-is on GitHub Pages.

## Limitations

Functional dependencies only (no 4NF/5NF), 1NF assumed, up to 30 attributes, exponential key search in the worst case. BCNF decomposition is not unique.

## Credits

[Mario Puerta «ale0009»](https://github.com/ale0009) × [David Rincón «Kuronoma»](https://www.linkedin.com/in/davidalexanderrinconcorredorkuronoma/). Built from our database normalization exercises. MIT License.
