# DimSleuth

### Follow the units. Find the mistake.

A local-first visual debugger for the **dimensions** of physics formulas. See the exact subexpression that fails, inspect every operation's rule and inputs, and try a repair without losing the trail.

**[中文指南](README.zh-CN.md) · [Language & limits](docs/semantics.md) · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md)**

```text
x = v*t + a*t
    └─ L ─┘ └─ L T⁻¹ ─┘
             ✕ incompatible addition

x = v*t + a*t^2
    └─ L ─┘ └── L ──┘
             ✓ dimensionally consistent
```

The second equation is **not thereby physically correct**. Dimensions cannot find the missing `1/2`, a wrong sign, an invalid assumption, or an incorrect numerical value.

## Why this little tool?

When a formula is wrong, a final red/green answer is only the beginning. DimSleuth makes the debugging path inspectable:

- A precise source highlight for every trace step and error
- Input → rule → output for each operation
- Exact rational exponents across all seven SI dimensions
- Independent error reporting without a flood of downstream false errors
- Six physics examples: kinematics, kinetic energy, pendulum, electric power, Reynolds number, and de Broglie wavelength
- English and Chinese interface; detailed parser/rule text currently English
- Versioned JSON projects and escaped, standalone HTML trace reports
- No runtime dependencies, accounts, APIs, network fonts, analytics, or formula upload

A draft is saved in browser-local storage only when you opt in. Language preference is saved locally. Hosted access control belongs to the hosting platform; it is not part of the app.

## Run it

Node.js **22.18+** or **24+** and npm:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Then:

1. Try `x = v*t + a*t` with `x: m`, `v: m/s`, `a: m/s^2`, `t: s`
2. Select the failed addition and inspect its two inputs
3. Try the preset's missing-`t²` repair; compare the dimensions again
4. Export a project or a standalone report for a lesson or review

```sh
npm test          # parser, vectors, security, project I/O, DOM interaction tests
npm run build     # reusable ESM core + types + static app
npm run preview   # serve the production app
node scripts/check-build.mjs
```

`dist/` is a self-contained static site. Serve it with any static HTTP server; there is no backend. For a single-file offline app, open `dist/standalone.html` directly in a normal local browser. This release does not install a service worker or promise offline reopening of a hosted tab.

## Reuse the core

The core has no runtime dependencies. Build first, then import it directly or install this directory as a local package. No npm publication is required. The package is marked `private` only to prevent accidental registry publication; this repository and its MIT-licensed source are public.

```ts
import { analyze, parseUnit, formatDimension } from './lib/index.js';

const result = analyze('F = m*a', [
  { name: 'F', unit: 'N' },
  { name: 'm', unit: 'kg' },
  { name: 'a', unit: 'm/s^2' },
]);
console.log(result.status); // consistent
console.log(parseUnit('N')); // ['1','1','-2','0','0','0','0']
```

All dimensions use ordered, reduced rational strings: **length, mass, time, current, temperature, amount, luminous intensity**. Trace spans use JavaScript UTF-16 indices and a half-open `[start, end)` range. `Analysis` and related public types are exported.

## Deliberately small language

```text
+  -  *  /  ^  ( )  optional single =
sqrt(x)  sin(x)  cos(x)  tan(x)  exp(x)  log(x)
```

Use explicit multiplication. Powers associate right and bind tighter than unary minus. Exponents must be numeric constant arithmetic. Trig, log, and exp require dimensionless arguments. `pi` and `e` are reserved dimensionless constants. Symbols are case-sensitive ASCII letter-first names.

Known units include the seven SI base units, common derived units and prefixes. This is dimensional algebra, **not numerical unit conversion**. `C` means coulomb; Celsius/Fahrenheit offset units are rejected. See the full [semantics and limits](docs/semantics.md).

## Prior art, honestly

Dimensional checking is not new. [Numbat](https://github.com/sharkdp/numbat) is a mature typed scientific language with units and descriptive errors. [mathjs](https://mathjs.org/docs/datatypes/units.html) offers unit-aware calculations. [TeckTani's checker](https://teck-tani.com/en/dimensional-equation-checker) checks symbolic dimensional equations, and [CinePhysicsHQ's lab](https://abhijit-cinephysics.github.io/CinePhysicsHQ-Labs/Dimensional_analysis_lab/) teaches dimensional analysis interactively.

DimSleuth's focus is a small, inspectable **source-linked debugging workflow**, packaged for local browser use and reusable as a tiny core. It is not a replacement for a scientific calculator or CAS, and it does not claim to be the first dimensional checker.

## Status

v0.1.0. Automated checks and limitations are recorded in [QA.md](docs/QA.md). CI is configured for Node 22/24 on Linux and Windows; configuration alone does not establish a remote CI pass.

MIT licensed. The generated browser preload helper retains its [Vite MIT notice](public/third-party-notices.txt). Contributions should keep the language explicit, the error trail useful, and the privacy boundary simple.
