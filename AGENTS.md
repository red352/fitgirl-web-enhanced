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
- **Single Source of Truth (SSOT)**: `"version"` in `package.json` is the sole standard for project versioning. `vite.config.ts` must dynamically reference the version from `package.json` and must never hardcode version strings.
- **Unified Version Bumping Command**: Version bumps must be executed via `npm run bump <patch | minor | major | x.y.z>`. Never modify multiple files manually.
  - `patch`: Bug fixes and patch releases (e.g., `1.4.1` -> `1.4.2`)
  - `minor`: New features and functionality additions (e.g., `1.4.1` -> `1.5.0`)
  - `major`: Architectural refactoring and breaking changes (e.g., `1.5.0` -> `2.0.0`)
- **Automated Synchronization Scope**: `npm run bump` automatically synchronizes `package.json`, `package-lock.json`, and version badges in both `README.md` and `README.zh-CN.md`, and triggers `npm run build` to regenerate the Userscript artifact carrying the latest `@version` header.
- **Compliance Boundary**: After running the version bump command, strictly follow the "No Autonomous Commits" rule and wait for explicit user confirmation before committing.

