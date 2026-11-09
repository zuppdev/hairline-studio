# Contributing to Hairline Studio

Thank you for helping. This document describes how the project is organised and what a change needs before it can be merged.

## Ground rules

- **The studio stays a single, dependency-free `index.html`.** No build step, no bundler and no runtime packages. Node and the packages in `devDependencies` are used only for tests and tooling.
- **The engine is written in ES5 syntax.** `hairlineMount` is copied verbatim into every exported file, so it must run anywhere: use `var` and `function`, not `let`, `const`, arrow functions, classes or template literals. A test enforces this.
- **Exports are a public format.** Changes to the figure format or to the exported page should stay backward compatible, so that files exported by earlier versions can still be opened.
- **Examples follow the engine.** After any change to `hairlineMount`, run `npm run examples` and commit the regenerated files. CI fails if they are out of date.

## Setting up

Requirements: Node 20 or later.

```sh
git clone https://github.com/zuppdev/hairline-studio.git
cd hairline-studio
npm install
npx playwright install
npm start        # http://localhost:8765
```

## Making a change

1. Open an issue first for anything larger than a small fix, so the approach can be agreed before work starts.
2. Create a branch from `main`.
3. Make the change in `index.html` (or the relevant file) and add or update tests in `tests/`.
4. Run `npm test`. To run a single browser or test while working:

   ```sh
   npx playwright test --project=chromium
   npx playwright test -g "export"
   npx playwright test --ui
   ```

5. If the engine changed, run `npm run examples`.
6. Add a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md) describing the change from a user's point of view.
7. Open a pull request and complete the checklist in the template.

## Tests

| File | Covers |
| --- | --- |
| `tests/engine.spec.js` | `hairlineMount` on its own: depth order, timing, syntax. |
| `tests/studio.spec.js` | The editor: presets, dragging, keys, undo, save, open, export. |
| `tests/examples.spec.js` | Each file in `examples/` embeds the current engine and runs. |

Tests use the `window.__studio` hook that `index.html` exposes. Keep it stable or update the tests with it.

## Commit messages

Short, imperative subject lines are preferred, optionally in [Conventional Commits](https://www.conventionalcommits.org/) form, for example `fix(engine): keep the tour clock monotonic`.

## Reporting bugs and proposing features

Use the issue templates. For bugs, include the browser and operating system and, where possible, the `.hairline.json` file that shows the problem (use *Save* in the studio).

Security issues must not be reported in public issues. See [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
