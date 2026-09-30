# Verification record — v0.1.0

## Executed in the build environment

- Linux, Node 24.19.0
- 48 named automated tests passed: 36 core, 4 project/report, 8 DOM interaction tests
- One core test additionally exercised 500 seeded hostile token combinations
- TypeScript strict checking passed
- Production static app and reusable ESM/declaration build passed
- Built-ESM dimensional fixture and static-asset smoke check passed
- npm audit after dependency updates: 0 known vulnerabilities reported
- Standalone offline HTML emitted with inline app/style/icon assets
- Independent review found and verified fixes for uniform dimension-exponent bounds, stale preset repair, and asynchronous import races

DOM tests use Happy DOM. They verify actual event handlers, preset repair, language toggle, text-only rendering of HTML-like input, source-selection linkage, opt-in draft clearing, and interrupted import/repair flows. They are not a substitute for browser rendering, accessibility-tree, screen-reader, touch, or download tests.

## Distribution and CI

The public repository includes source and reproducible build instructions. `npm run build` produces both a static app in `dist/` and `dist/standalone.html` for local offline use. No public hosted demo is promised by this release.

GitHub Actions is configured for Windows/Linux and Node 22/24. A configured workflow is not evidence of completed remote checks; consult the exact commit's [Actions run](https://github.com/loaff123/dimsleuth/actions).

## Not yet manually verified

- Real-browser app rendering, local-file opening, browser downloads, and file chooser behavior
- Phone-sized rendering, mobile touch, 200% zoom, and assistive-technology/screen-reader behavior
- Proposed WebMCP API in a supported browser

Responsive and semantic implementation was inspected, but these manual checks are not visually certified. Automated DOM tests do not establish them.

## Manual release checklist

1. Open the app, select the failing addition, inspect L vs L T^-1, and try t² repair
2. Use all six presets; alter symbol units and try an unknown symbol/function
3. Use the keyboard through every control and inspect a narrow viewport
4. Export/import a project, cancel/repeat imports, and export/open the HTML report
5. Opt into local draft storage, reload, then clear it
6. Open standalone.html offline and verify no application network requests
7. Verify the public repository's exact commit passes all four CI jobs
