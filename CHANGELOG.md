# Changelog

All notable changes to this project are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Versions refer to the studio, the engine and the export format together.

## [Unreleased]

## [1.0.0] - 2026-11-09

First public release.

### Added

- Visual editor for isometric line figures made of blocks and cylinders, with Edit and Preview modes, presets (Keyboard, Drawers, Bar chart, Silos, Blank), undo and redo, autosave, and Save/Open of `.hairline.json` projects.
- Export to a single dependency-free HTML file with an intensity slider, a theme switch and a guided tour. Exported files can be opened in the studio again.
- Esc deselects the current part in Edit mode.
- *Play tour* explains why nothing happens when no part moves with the pointer.
- Engine API: `update(figure, keepView)` and `order()`.
- Test suite in Chromium, Firefox and WebKit; continuous integration; deployment to GitHub Pages; `npm run examples` to regenerate the examples.

### Fixed

- Dragging a part no longer runs away from the pointer. The view used to refit on every move, which shifted the frame under the pointer and kept the part moving even when the pointer stood still.
- *Play tour* no longer stops the animation in Firefox. The tour clock could start ahead of the frame clock and read past the start of the tour.
- Parts are drawn in correct depth order. Sorting by centre point drew long parts, such as rails and pulled-out drawers, over parts that should cover them.
- Springs and easing run at the same speed on 60 Hz, 120 Hz and faster displays.
- Arrow keys on a focused slider in Edit mode move the slider instead of the selected part.
- Each discrete edit (adding, duplicating, repeating, removing, changing a part's shape, loading a preset or file) is its own undo step.
- Values in opened files and in the autosave are validated and clamped to the ranges the controls allow, so a damaged or hand-edited file can no longer break the animation.

### Changed

- The engine skips redrawing when nothing has moved, which reduces CPU use for idle figures.

[Unreleased]: https://github.com/zuppdev/hairline-studio/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/zuppdev/hairline-studio/releases/tag/v1.0.0
