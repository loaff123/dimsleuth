# Contributing

Keep the first issue small: a precise parser bug, a missing dimensional fixture, a clearer diagnostic, accessibility, or Chinese translation.

1. Install Node 22.18+ or 24+, then `npm ci`.
2. Add a regression test that fails for the reported behavior.
3. Change the smallest responsible module.
4. Run `npm test`, `npm run build`, and `node scripts/check-build.mjs`.
5. For UI changes, test keyboard use, a phone-sized viewport, invalid inputs, and repeated import/preset actions.

Core modules are pure and runtime-dependency-free. Never use eval, Function, or execution of user expressions. Keep AST source spans and exact rational dimension vectors stable. Do not silently infer multiplication, units, numerical values, or physical truth.

Explain semantic changes in docs/semantics.md and CHANGELOG.md. Include sources for new dimensional fixtures. Tests should use independently written expected vectors, not compute expected answers with production helpers. CI has four Node/OS combinations; record what actually ran locally separately.

Do not introduce accounts, external telemetry, networking, or AI services into this local-first tool without discussing the privacy and scope change first.
