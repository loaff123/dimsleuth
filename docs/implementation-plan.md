# Development guide

DimSleuth is a local-first visual dimensional debugger with a reusable TypeScript analysis core, independent project I/O, and a static browser UI. See [architecture.md](architecture.md) and [semantics.md](semantics.md) for its current design and language contract.

## Making a change

1. Add tests for expected dimensions, precise source spans, parser behavior, or the affected project/UI interaction.
2. Keep the core independent of the DOM and project storage. All source handling must remain local and non-executing.
3. Preserve exact seven-SI rational dimensions and independent diagnostics. Do not substitute numerical evaluation for dimensional analysis.
4. Exercise invalid input, repeated actions, and interrupted imports, as well as the happy path.
5. Update the semantics, changelog, and verification record when behavior changes.
6. Run the commands in [CONTRIBUTING.md](../CONTRIBUTING.md) and verify all four remote CI jobs.

## Review priorities

- Arbitrary Unicode and HTML-like input
- Deep nesting, excessive rational exponents, and bounded resource use
- Invalid or unused symbol-unit definitions
- Stale trace selection or repair actions after formula changes
- Corrupt local drafts, repeated import/export, and asynchronous file-read races
- Keyboard behavior, narrow viewports, and exported report safety

No numerical unit conversion, equation solver, telemetry, backend, or external API is part of the current scope.
