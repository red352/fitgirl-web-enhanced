# AGENTS.md

## Project Overview
- **Type**: Tampermonkey / Violentmonkey / Greasemonkey Userscript
- **Target Site**: `https://fitgirl-repacks.site/*`
- **Purpose**: Web experience and UI/UX enhancement for FitGirl Repacks (search optimization, download link parsing, UI cleanup, magnet handling, etc.)

## Userscript Standards & Conventions
- **Header Metadata Block (`// ==UserScript==`)**:
  - `@name`: Clear, descriptive naming (e.g., `FitGirl Web Enhanced`)
  - `@match` / `@include`: Strictly target `https://fitgirl-repacks.site/*`
  - `@run-at`: Default to `document-idle` unless early execution is explicitly required
  - `@grant`: Keep permissions minimal (use `@grant none` if GM APIs are unnecessary; declare `GM_getValue`, `GM_setValue`, `GM_xmlhttpRequest`, `GM_addStyle` explicitly when needed)
- **DOM Resilience & Selectors**:
  - FitGirl is WordPress-based. Use robust CSS selectors targeting semantic content (`article`, `.entry-title`, `.entry-content`, `.search-form`, `.nav-links`).
  - Always guard against missing DOM nodes (null-safe checks / optional chaining `?.`).
  - Use `MutationObserver` or resilient polling helpers for dynamically loaded elements or AJAX pagination.

## Development & Code Structure
- **Build / Packaging**:
  - If single-file: maintain `fitgirl-enhanced.user.js` directly with standard Userscript metadata headers.
  - If bundled (e.g., `vite-plugin-monkey` / Rollup / Webpack): keep source in `src/` and output to `dist/*.user.js`. Avoid committing temporary build artifacts except published distribution scripts.
- **External Requests & Cross-Origin**:
  - Use `GM_xmlhttpRequest` when fetching external data (e.g., 1337x, Steam APIs) to bypass CORS restrictions. Declare `@connect` domains in the metadata block.
- **Storage & State**:
  - Use `GM_getValue` / `GM_setValue` (or `localStorage`) prefixed with a distinct namespace for user preferences.

## Git & Contribution Rules
- **No Autonomous Commits**: Unless the user explicitly gives a commit command in the current dialogue (e.g., explicitly stating "commit code", "commit", etc.), automatically running `git commit` or `git push` is strictly prohibited. After code changes, tests, and builds are completed, report status to the user and wait for user confirmation before creating any commit.
- Keep commits concise and imperative (e.g., `feat: add magnet quick-copy button`, `fix: update selectors for post links`).
- Do not commit local user config or browser-specific test tokens.

## Installation & Distribution Best Practices
- **Direct URL Install**: The compiled Userscript artifact is maintained at `dist/fitgirl-enhanced.user.js`. After publishing to the GitHub repository, users directly accessing the `raw.githubusercontent.com` or jsDelivr CDN link can trigger one-click Userscript installation in Tampermonkey / Violentmonkey.
- **Auto-Update (`@updateURL` & `@downloadURL`)**: Configure reliable self-update and download URLs in the Userscript metadata header to allow script managers to silently check for new versions and prompt for updates in the background.

## Version Management & Bumping Rules
- **Single Source of Truth (SSOT)**: `"version"` in `package.json` is the only place a version number is written by hand. `vite.config.ts` must dynamically reference it and must never hardcode version strings. The README badges use the dynamic shields.io endpoint (`img.shields.io/github/package-json/v/red352/fitgirl-web-enhanced`) and must never contain a literal version. `dist/fitgirl-enhanced.user.js` is build output — its `@version` header is generated, never edited.
- **Two Entry Points**:
  - `npm run bump <patch | minor | major | x.y.z>` — bump `package.json` + `package-lock.json`, rebuild `dist/`, and stop. Nothing is committed.
  - `npm run release <patch | minor | major | x.y.z>` — same pipeline, then `git commit -m "chore: release vX.Y.Z"` and an annotated tag `vX.Y.Z`. It never pushes.
  - `patch`: Bug fixes and patch releases (e.g., `1.4.1` -> `1.4.2`)
  - `minor`: New features and functionality additions (e.g., `1.4.1` -> `1.5.0`)
  - `major`: Architectural refactoring and breaking changes (e.g., `1.5.0` -> `2.0.0`)
- **Script Guarantees**: `scripts/bump-version.mjs` delegates version writing to `npm version --no-git-tag-version` (so the lockfile is always npm-format), refuses to run when the target tag already exists (and, in release mode, when the working tree is dirty), asserts the rebuilt artifact's `@version` matches `package.json`, and rolls back `package.json` / `package-lock.json` / `dist/` if the build fails. Never edit version strings across multiple files manually.
- **Compliance Boundary**: `--release` is only run when the user explicitly asks for a release. After either command, report status and wait for explicit user confirmation before `git push`.

