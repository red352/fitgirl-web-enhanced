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
- **禁止自主提交（No Autonomous Commits）**：除非用户在此轮对话中给出了明确的提交指令（例如明确说出“提交代码”、“commit”等），否则严禁自动执行 `git commit` 或 `git push`。代码修改、测试与构建完成后，应当向用户汇报状态并等待用户确认，不得擅自创建提交。
- Keep commits concise and imperative (e.g., `feat: add magnet quick-copy button`, `fix: update selectors for post links`).
- Do not commit local user config or browser-specific test tokens.

## Language & Communication Rules
- **Primary Language**: 用户的母语是中文（Chinese）。所有代码注释、文档（README.md 双语优先或以中文为主）、更新日志以及所有与用户的交互沟通必须以中文进行。

## Installation & Distribution Best Practices
- **Direct URL Install**: 脚本编译产物保持在 `dist/fitgirl-enhanced.user.js`，在 GitHub 仓库发布后，用户直接访问 `raw.githubusercontent.com` 或 jsDelivr CDN 链接即可触发油猴（Tampermonkey / Violentmonkey）的一键安装界面。
- **Auto-Update (`@updateURL` & `@downloadURL`)**: 在 Userscript 元数据头配置可靠的自更新地址与下载地址，确保油猴插件能够在后台静默检测新版本并提示升级。

## Version Management & Bumping Rules（版本管理规范）
- **单一事实来源（SSOT）**：`package.json` 中的 `"version"` 为项目版本的唯一标准。`vite.config.ts` 必须动态引用 `package.json` 中的版本号，严禁在配置中硬编码版本字符串。
- **一键统一升级命令**：项目版本升级统一使用 `npm run bump <patch | minor | major | x.y.z>` 命令执行，严禁手动分头修改多个文件。
  - `patch`：Bug 修复、补丁升级（如 `1.4.1` -> `1.4.2`）
  - `minor`：新增功能、特性增强（如 `1.4.1` -> `1.5.0`）
  - `major`：架构重构、重大破坏性变更（如 `1.5.0` -> `2.0.0`）
- **自动化联动范围**：`npm run bump` 会全自动同步 `package.json`、`package-lock.json`、`README.md` 顶部徽章，并自动触发 `npm run build` 重新编译生成携带最新 `@version` 头信息的 `dist/fitgirl-enhanced.user.js`。
- **合规边界**：版本升级命令执行后，必须严格遵循「禁止自主提交」规则，等待用户确认后再行提交。

