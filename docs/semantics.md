# Language, semantics, and limits

## What is checked

Each expression has an exact seven-component rational dimension vector, in this order:

1. Length (L)
2. Mass (M)
3. Time (T)
4. Electric current (I)
5. Thermodynamic temperature (Θ)
6. Amount of substance (N)
7. Luminous intensity (J in dimension notation, distinct from unit J = joule)

Multiplication adds exponents; division subtracts them. Powers multiply them by the exact rational exponent. Addition, subtraction, and equality require identical vectors. A group or unary sign preserves dimension. A square root halves all exponents. sin, cos, tan, exp, and log require a dimensionless argument and return dimensionless results. Radians and steradians are dimensionless.

Zero, signs, numerical factors and all other ordinary numerical values have no special physical interpretation. In particular, `0 + x` is a mismatch if x is dimensioned; the literal zero is not treated as polymorphic. `1/0`, `sqrt(-1)`, and `log(-1)` outside exponent arithmetic can be dimensionally consistent: numerical domains and evaluation are deliberately not checked. Exponent arithmetic is evaluated to obtain exact dimension exponents and rejects undefined arithmetic.

## Grammar

```ebnf
formula = sum, ["=", sum];
sum = product, {("+" | "-"), product};
product = unary, {("*" | "/"), unary};
unary = ("+" | "-"), unary | power;
power = primary, ["^", unary];
primary = number | name | "(", sum, ")" | function, "(", sum, ")";
function = "sqrt" | "sin" | "cos" | "tan" | "exp" | "log";
```

Powers associate right: `x^2^3` is `x^(2^3)`. Power binds tighter than a leading unary sign: `-x^2` is `-(x^2)`. Negative powers are allowed: `x^-2`. Multiplication/division and addition/subtraction are left-associative at their respective precedence levels. There is at most one equality at the top level. Parenthesized equalities, chained equalities, assignments and statements are not supported.

Multiplication is always explicit. `2x`, `x y`, and `x(y)` are not accepted as multiplication. `xy` is one variable. A name begins with an ASCII letter, followed by ASCII letters, digits or underscores, maximum 32 characters. Names are case-sensitive. `pi`, `e`, and supported function names are reserved; E is an ordinary variable. Formula Unicode symbols such as λ are not accepted; use lambda. Unsupported astral Unicode characters still get correct UTF-16 source spans.

Numbers include integers, decimals, and scientific notation (`.5`, `1.`, `1e-3`, `2E4`). Numeric literals are bounded exact rationals, not binary floats.

### Powers

The exponent subtree must consist only of numeric literals, grouping, unary signs, and arithmetic. `x^(0.1+0.2)` uses exactly 3/10. `x^(4^(1/2))` uses exactly 2. Symbols, constants, and functions in an exponent are rejected, even when dimensionless or numerically obvious: `x^pi`, `x^t`, `x^sqrt(4)` are unsupported. A constant power is permitted only if its exact real rational result is representable within the bounds. Irrational powers are rejected. `x^(1/0)`, `x^(0^0)`, and even roots of negative constants are invalid.

## Units

Units are dimension declarations, not values. For example, cm and m both declare length; no scale factor enters the analysis. Supports explicit multiplication/division, powers, unary signs, parentheses, and sqrt. No equality, addition/subtraction, other functions, implicit multiplication, or arbitrary user-defined units.

- SI base: m, kg, s, A, K, mol, cd
- Derived: Hz, N, Pa, J, W, C, V, ohm, Ω, S, F, Wb, T, H, lm, lx, Bq, Gy, Sv, kat
- Dimensionless: 1, rad, sr (numeric constants are also dimensionless)
- Common additional declarations: g, L, l, eV, t (tonne), min, h, day, d
- SI prefixes: Q R Y Z E P T G M k h da d c m µ μ u n p f a z y r q, for prefixable base/derived symbols in src/core/units.ts

Exact unit symbols take priority over prefix splitting. C means coulomb, F means farad, T means tesla, and H means henry. `degC`, `°C`, Celsius, `degF`, `°F`, Fahrenheit are rejected as offset temperature units. Use K when declaring temperature dimension. The app never computes affine temperature arithmetic.

All configured unit entries are validated, including symbols not used by the current formula. Unknown symbols and invalid/duplicate names are invalid inputs, not implicit dimensionless values.

## Outcomes and trace

- `consistent`: all operations checked agree dimensionally
- `inconsistent`: at least one dimensional incompatibility
- `invalid`: unsupported/malformed input, unknown symbol/unit, invalid configuration or bounded arithmetic failure

Independent semantic errors in separate branches are collected. An ancestor of an erroneous node is marked `blocked`, with no guessed output dimension. The parser reports the first syntax failure; it does not attempt recovery into a partial AST.

Trace nodes are postorder with stable per-analysis IDs, source spans, child IDs, dimensions and readable rules. Spans are half-open JavaScript UTF-16 offsets. A mismatch diagnostic highlights the entire failing operation subtree; unit-configuration diagnostics carry the symbol and a zero-length formula span. Do not interpret node IDs as persistent across edits.

## Limits

- Formula source: 2,048 UTF-16 code units
- Tokens: 512
- Parser recursion/nesting and constructed tree depth: 64
- Configured symbols: 128; symbol names: 32 ASCII characters
- Unit expression: 128 characters
- Exact rational numerator and denominator: 256 bits after reduction
- Scientific literal exponent and precision shift: absolute value at most 100 (the rational bound may reject smaller literals)
- Constant exponentiation: exponent numerator magnitude at most 4,096; denominator/root degree at most 64, plus rational-size preflight
- Every resulting dimension exponent: numerator magnitude and denominator at most 1,000,000
- Project import: at most 65,536 UTF-8 bytes; schemaVersion 1; title 120, formula 2,048, unit 128 characters

These limits are rejection boundaries, not a guarantee that every expression under every individual limit is accepted. Combined operations can exceed another limit.

## Project and report safety

Project JSON contains only schemaVersion, title, formula, and symbols (each with name and unit). Extra/missing fields, wrong types, duplicate names, reserved names, and dangerous property keys are rejected. Imports never evaluate strings. Browser state is replaced only after validation.

Reports escape all content and contain no JavaScript or external assets. The local-only WebMCP read tool, where a browser supports the proposed API, only reads the visible analysis and does not modify a project. Its API support is optional and not required for ordinary use.
