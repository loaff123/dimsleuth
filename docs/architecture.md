# DimSleuth v0.1 design

A static, offline-capable debugging workbench for students, teachers, and engineers. Paste an expression/equation, assign symbol units, find the earliest incompatible operation, inspect its source-linked dimensional trace, and edit the formula. Consistency is necessary, never proof of physical truth.

## Scope and decisions
- TypeScript core with no runtime dependency and no eval, Function, or input execution. Vite builds a lean browser UI.
- Exact rational seven-SI dimension vectors serialized as reduced strings, order L M T I Θ N J (J here is luminous intensity, not joule).
- Grammar: a single optional top-level equality; explicit multiplication; + - * / ^; unary +/-; groups; sqrt/sin/cos/tan/exp/log. Power right-associative and tighter than unary; 2^-2 allowed. Numeric literal-only arithmetic exponent subexpressions; exact rational values, no symbolic exponents.
- Unit grammar supports same algebra with known units; no equality, addition, trig, or implicit multiplication; no offset temperature units.
- Limits: source 2048 chars, 512 tokens, nesting 64, 128 symbols, unit 128 chars, bounded rationals and powers. Reject unsupported syntax precisely.
- AST trace nodes retain UTF-16 source spans; errors on independent branches collected, parents with invalid inputs blocked rather than cascade.
- Browser-only project JSON v1, strict fields/types/size, reject dangerous object keys. Safe escaped standalone report. Nothing user-entered is transmitted.
- Responsive, keyboard-accessible workbench: cobalt sidebar, near-black trace canvas, amber failure markers, lime repair success. English primary with Chinese toggle. Six real physics presets. Inputs and result visible immediately.
- No backend, numerical unit conversion, affine temperature arithmetic, solver, physics validation, unknown unit guessing, live collaboration, AI/API calls, analytics, network fonts, account requirement in app. Hosting platforms may add separate access controls.

## Alternatives
Numbat and mathjs are broader unit/calculation systems; this project focuses on visible source-to-operation explanation rather than competing with their language breadth. A CAS integration would obscure the small security boundary and is deliberately excluded.

## Modules
src/core/types.ts frozen UI/core contract. src/core/index.ts analyze(formula,symbols), parseUnit(unit), formatDimension(dim); pure. src/project.ts JSON validation and report export. src/presets.ts six presets. src/main.ts UI. Tests cover core, boundaries, project I/O, security, independent dimensional fixtures; CI on Linux/Windows configured separately from local results.
