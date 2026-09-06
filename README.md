# FitGirl Web Enhanced

<p align="center">
  <a href="https://github.com/red352/fitgirl-web-enhanced/releases"><img src="https://img.shields.io/badge/Userscript-v1.6.0-blue.svg?style=flat-square" alt="Userscript Version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License" /></a>
  <a href="https://fitgirl-repacks.site/"><img src="https://img.shields.io/badge/Target-fitgirl--repacks.site-purple.svg?style=flat-square" alt="Target Site" /></a>
  <a href="#permissions--privacy-security"><img src="https://img.shields.io/badge/Permissions-Minimal-success.svg?style=flat-square" alt="Permissions: Minimal" /></a>
  <a href="package.json"><img src="https://img.shields.io/badge/Built_with-Vite_%7C_TypeScript-646CFF.svg?style=flat-square" alt="Tech Stack" /></a>
</p>

<p align="center">
  A modern, lightweight, and non-destructive Userscript for <strong>FitGirl Repacks</strong>.<br />
  Re-engineers grid flow and browsing experience while strictly preserving all original content, download mirrors, video trailers, screenshots, and magnet links.
</p>

<p align="center">
  <a href="https://raw.githubusercontent.com/red352/fitgirl-web-enhanced/master/dist/fitgirl-enhanced.user.js"><strong>🚀 One-Click Install Userscript</strong></a> ·
  <a href="https://cdn.jsdelivr.net/gh/red352/fitgirl-web-enhanced@master/dist/fitgirl-enhanced.user.js">Mirror CDN Install</a> ·
  <a href="https://github.com/red352/fitgirl-web-enhanced/issues">Report Issue / Feedback</a>
</p>

<p align="center">
  <strong>English</strong> · <a href="README.zh-CN.md">简体中文</a>
</p>

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Interface Preview](#interface-preview)
- [Installation Guide](#installation-guide)
- [Interactions & Keyboard Shortcuts](#interactions--keyboard-shortcuts)
- [Technical Architecture & Design Principles](#technical-architecture--design-principles)
- [Permissions & Privacy Security](#permissions--privacy-security)
- [Compatibility](#compatibility)
- [Local Development & Testing](#local-development--testing)
- [FAQ & Troubleshooting](#faq--troubleshooting)
- [Contributing Guidelines](#contributing-guidelines)
- [Disclaimer & License](#disclaimer--license)

---

## Project Overview

The original FitGirl Repacks layout relies on a traditional linear blog feed. On modern high-resolution or ultrawide displays, it suffers from low screen real estate utilization, excessively long mixed text/media streams, and visual fatigue during extensive browsing.

**FitGirl Web Enhanced** employs a progressive enhancement strategy operating in a sandboxed frontend environment strictly following the principle of least privilege:

- **Layout Restructuring**: Transforms endless single-column feeds into row-aligned, responsive grid cards, greatly enhancing information retrieval efficiency.
- **Steam Rating Integration**: Intelligently parses game titles and fetches official Steam positive review percentages, ratings, and Metascores for faster decision-making.
- **Non-Destructive & Reversible**: Features an underlying bidirectional DOM transaction recorder that preserves native structure and attributes, enabling instant one-click toggle back to the original view.
- **Plug & Play**: Zero third-party runtime dependencies, broad script manager support, and automated silent update checks.

---

## Key Features

### 1. Strict Row-Aligned Grid Flow

- **Equal Height Baseline Alignment**: Employs standard CSS Grid with stretch alignment (`align-items: stretch`), eliminating visual jumps and temporal confusion caused by staggered masonry columns.
- **Responsive Viewport Breakpoints**:
  - **Mobile / Compact (< 1152px)**: Single-column adaptive fluid layout;
  - **Desktop / Laptop (1152px ~ 1699px)**: Dual-column balanced card stream;
  - **2K / Wide Display (1700px ~ 2399px)**: Adaptive 3-column layout;
  - **4K / Ultrawide Display (≥ 2400px)**: Adaptive 4-column high-density layout.
- **Chronological Hierarchy**:
  - The latest repack card features an ambient glow highlight;
  - The top 3 recent entries carry ranked magenta badges (`#1`, `#2`, `#3`);
  - Humanized relative timestamps (e.g., `Today`, `Yesterday`, `2d ago`) at the top of each card.
- **Aspect Ratio Preservation**: Game covers use `object-fit: contain` to prevent cropping of titles or artwork edges.

### 2. Steam Ratings & Reviews Integration

- **Smart Title Sanitization & Precision Matching**:
  - Automatically extracts game titles, stripping FitGirl repack numbers, version tags, brackets (e.g., `(Denuvoless)`), asterisk notes (`*`), tildes, and bundled extras (e.g., `+ All DLCs*`, `+ Soundtrack Bundle`, `+ Bonus OST`, `+ Artbook`);
  - Recognizes and trims release edition suffixes (such as `Deluxe Edition`, `Digital Deluxe Edition`), prioritizing clean base game names (e.g., `Dragon's Dogma 2`, `Hollowbody`) for high matching accuracy.
- **Automatic Parent Game Resolution for DLCs**:
  - When an entry is a standalone DLC, expansion pack, or special edition (e.g., `The Blood of Dawnwalker: Eclipse Edition` resolving to AppID `4417550`), the system probes Steam API metadata to detect whether it is downloadable content and identifies the base game;
  - Automatically traces the query back to the parent game (e.g., `The Blood of Dawnwalker`), fetching authentic reviews, counts, and Metascores, avoiding skewed stats from small DLC sample sizes.
- **Dynamic Micro-Capsule & Graceful Fallbacks**:
  - **Loading State**: Displays a spinning micro-capsule (`Querying...` / `.fwe-spin`) indicating search progress;
  - **Rating Badge**: Once ready, renders clear review percentages, ratings (e.g., `92% Very Positive (45.6k)`), and Metascore;
  - **Unmatched State**: If a title is not on Steam or not yet matched, displays an elegant grayscale `Unmatched` capsule without leaving abrupt empty space.
- **Rich Review Popover**:
  - Hover or click the rating badge to reveal a comprehensive popover displaying review percentage gradient bars, positive/negative breakdowns, and release year;
  - Quick links to Steam Store and SteamDB charts/price history;
  - Includes a **Force Refresh 🔄** button in the popover and single post parameter bar to invalidate local cache and fetch fresh data from Steam.
- **High-Performance Local LRU Cache & Toggle**:
  - Built-in 7-day TTL local cache minimizes network overhead and syncs across tabs;
  - A dedicated `Show Game Ratings` switch in the top **View** menu enables one-click toggling anytime.

### 3. Rich Interactive Lightbox

- Click any screenshot or video thumbnail to launch a full-screen lightbox with instant low-res placeholder and smooth transition to original high-res assets.
- Full native loop playback support for embedded `<video>` trailers.
- Rich desktop interaction: smooth zoom centered at mouse cursor, double-click zoom/reset, click-and-drag panning, and complete keyboard navigation.

### 4. Modal Details & Structural Folding

- **Card Quick Modal**: The bottom of each card integrates `Download Mirrors`, `Features`, and `Description` buttons to view details in a clean dialog without leaving the list.
- **Single Page Folding**: Download mirrors and file hosts are organized into clean disclosure toggles, keeping initial page height compact.
- **DOM Normalization**: Automatically isolates WordPress clear-fix pseudo-elements and stray ad containers to eliminate unexpected blank spacing; keeps `Upcoming Repacks` pinned full-width at the top.

### 5. Seamless Infinite Scroll

- As you scroll near the bottom of the feed, the next page is smoothly preloaded in the background and appended row by row without jarring jumps or re-layouts.
- Persistent toggle available in the top **View** menu (enabled by default). When disabled, safely restores native numbered pagination.

### 6. Pink Paw Award Games & Directory Index Optimization

- **Non-Destructive Container Piercing**:
  - For games awarded FitGirl's "Personal Pink Paw Award" (wrapped in a special pink-paw container `<div>`, such as `/the-alters/`, `/replaced/`), the script penetrates the decorative shell and flattens inner semantic nodes;
  - Completely parses and extracts download mirrors (Torrents / Magnets / Filehosters), screenshot galleries, game features, and descriptions.
- **Exclusive Pink Paw Badge**:
  - Detects `category-pink-paw-award` taxonomy and adds an exclusive `🐾 Pink Paw` badge beside the title.
- **Directory & A-Z Index Grid Transformation**:
  - Automatically transforms `/games-with-my-personal-pink-paw-award/` and all category pages using `.lcp_catlist` into responsive multi-column card grids (`.fwe-directory-az`).

### 7. Unified Navigation & Drawers

- **Decoupled Popular List**: Converts the persistent sidebar "Most Popular Repacks of the Week" into a desktop slide-out drawer and mobile bottom sheet, opened on demand.
- **Global Browse Drawer**: Top navigation provides a **Browse** dropdown dialog for quick access to site taxonomies, A-Z directories, and monthly archives.
- **Cross-Site Visual Cohesion**: Unifies responsive layouts for search results, Updates Digest, and archive listing pages.

### 8. Zero-Flicker Loading & State Persistence

- Synchronous Fast-Path state check executed at `@run-at: document-start` injects view control attributes during initial DOM parsing, completely preventing Flash of Unstyled Content (FOUC).
- Preferences use dual-layer fault-tolerant storage across `localStorage` and `IndexedDB`, kept in sync across sessions and tabs.

---

## Interface Preview

> Preview screenshots are captured automatically by our headless test pipeline under real high-resolution desktop and mobile viewports.

### 1. Listing & Stream Flow

Strict row-aligned responsive card grid adapting to desktop multi-column high-density and mobile single-column stream, featuring Steam rating badges, temporal glow, and relative timestamps:

|             Desktop Listing (Equal-Height Grid & Ratings)             |               Mobile Listing (Adaptive Single-Column)               |
| :-------------------------------------------------------------------: | :-----------------------------------------------------------------: |
| ![Desktop Listing View](docs/assets/listing-desktop.png)              | ![Mobile Listing View](docs/assets/listing-mobile.png)              |

### 2. Steam Game Ratings & Rich Review Popover

Sanitizes and matches titles, showing Steam positive percentage and Metascore. Hover or click to open the detailed popover with review bars, breakdown counts, Steam / SteamDB links, and a refresh button:

|                    Steam Review Details Popover & Card                     |
| :------------------------------------------------------------------------: |
| ![Steam Rating & Review Popover](docs/assets/rating-popover.png)           |

### 3. Game Detail & Pink Paw Award

Single post parameters bar aggregates live Steam ratings; download mirrors fold cleanly. Smart container piercing displays the exclusive Pink Paw badge with full feature and gallery rendering:

|             Standard Game Detail Page (Folded Mirrors & Rating)             |              Pink Paw Award Game (Container Piercing & Badge)               |
| :-------------------------------------------------------------------------: | :-------------------------------------------------------------------------: |
| ![Desktop Detail View](docs/assets/detail-desktop.png)                      | ![Pink Paw Award Detail View](docs/assets/pink-paw-desktop.png)            |

### 4. Modals, Lightbox & Gestures

Card quick modals for download mirrors, immersive full-screen lightbox (smooth zoom, drag-panning, and original resolution toggle), and adaptive mobile bottom sheets:

|               Card Quick Modal (Mirrors & Features)               |              Desktop Lightbox Gallery (Immersive Viewer)              |
| :---------------------------------------------------------------: | :-------------------------------------------------------------------: |
| ![Card Quick Modal](docs/assets/modal-desktop.png)                | ![Desktop Interactive Lightbox](docs/assets/lightbox-desktop.png)     |

|                       Mobile Popular Repacks Drawer (Adaptive Bottom Sheet)                       |
| :-----------------------------------------------------------------------------------------------: |
| <img src="docs/assets/popular-mobile.png" alt="Mobile Popular Drawer" width="360" />             |

---

## Installation Guide

### Prerequisites

Install any browser extension supporting modern Userscript standards:

- [Tampermonkey](https://www.tampermonkey.net/) (Recommended, Chrome / Edge / Firefox / Safari)
- [Violentmonkey](https://violentmonkey.github.io/)
- [Greasemonkey](https://www.greasespot.net/)

### Installation Steps

1. Click the install link: [Raw Script Install](https://raw.githubusercontent.com/red352/fitgirl-web-enhanced/master/dist/fitgirl-enhanced.user.js) (or use the [jsDelivr Mirror](https://cdn.jsdelivr.net/gh/red352/fitgirl-web-enhanced@master/dist/fitgirl-enhanced.user.js));
2. The script manager will prompt an installation confirmation; click **Install**;
3. Visit [fitgirl-repacks.site](https://fitgirl-repacks.site/) — the page will automatically render in enhanced mode.

### Automatic Updates

The script includes `@updateURL` and `@downloadURL` metadata headers. When a new release is published to GitHub, your script manager will detect the update and prompt you automatically.

---

## Interactions & Keyboard Shortcuts

### Lightbox Shortcuts

| Shortcut                                                      | Action                                     |
| :------------------------------------------------------------ | :----------------------------------------- |
| <kbd>←</kbd>                                                  | Previous screenshot / media                |
| <kbd>→</kbd>                                                  | Next screenshot / media                    |
| <kbd>+</kbd> / <kbd>=</kbd> or <kbd>Ctrl</kbd> + <kbd>+</kbd> | Zoom in                                    |
| <kbd>-</kbd> or <kbd>Ctrl</kbd> + <kbd>-</kbd>                | Zoom out                                   |
| <kbd>0</kbd> or <kbd>Ctrl</kbd> + <kbd>0</kbd>                | Reset zoom and pan to 1.0x                 |
| <kbd>Esc</kbd>                                                | Close lightbox                             |

### Mouse & Gesture Interactions

- **Zoom**: While lightbox is open, use the mouse wheel to smoothly zoom relative to the mouse cursor.
- **Quick Zoom**: Double-click image to toggle between 1.0x and 2.2x zoom.
- **Drag & Pan**: When zoomed in, hold left mouse button and drag to pan across the image canvas.
- **Modal Navigation**: All dialogs and drawers support <kbd>Esc</kbd> or clicking the backdrop overlay to close.

---

## Technical Architecture & Design Principles

```
src/
├── dom.ts          # DOM parsing, section extraction, structural detection, and reversible transactions
├── ui.ts           # Responsive card stream, media gallery, modal dialogs, drawers, and lightbox controller
├── rating.ts       # Steam rating fetching, smart title sanitization, parent DLC resolution, and LRU cache
├── preferences.ts  # Synchronous Fast-Path preference injection, localStorage / IndexedDB persistence
├── i18n.ts         # Zero-dependency internationalization module (English & Simplified Chinese)
├── types.ts        # Global TypeScript interfaces and domain model definitions
├── icons.ts        # Inline SVG icon generator
├── style.css       # Media queries, container queries, and scoped styling rules
└── main.ts         # Lifecycle initialization entry and runtime sandbox bootstrapper
```

- **Reversible Transactions**:
  DOM transformations are strictly non-destructive. A transaction manager captures original parent containers, sibling positions, inline styles, and class lists. Toggling back to `Original View` replays operations in reverse, restoring the page to 100% native state.
- **Dynamic Mutation Isolation**:
  Internal `WeakSet` and tracking attributes monitor processed nodes. During infinite scroll or external script insertions, only newly injected elements are processed incrementally, preventing redundant calculations or nested wrappers.
- **Style Scope Isolation**:
  All enhanced CSS styles are scoped under `html[data-fwe-mode="enhanced"]`, guaranteeing zero styling pollution in original view.

---

## Permissions & Privacy Security

- **Minimal Permission Grants**: The script strictly adheres to the principle of least privilege, requesting only essential privileges:
  - `@grant GM_xmlhttpRequest`: Initiates read-only cross-origin requests to official public Steam Store APIs for review stats;
  - `@grant GM_getValue` / `GM_setValue`: Manager-level configuration persistence and cross-tab synchronization;
  - `@connect store.steampowered.com`: Strictly restricts outbound requests to the official Steam Store domain, blocking any unauthorized third-party endpoints.
- **Zero Privacy Tracking & Read-Only Requests**:
  - Steam rating requests use public read-only APIs without transmitting user tokens, cookies, account credentials, or private information;
  - Contains no analytics trackers, beacons, telemetry, or third-party analytics services. Your browsing history is never recorded or uploaded.
- **Namespaced Local Storage**: Configurations and cache data are stored under namespaced keys:
  - `fitgirl-web-enhanced:v1:layout-mode`: View mode configuration (`enhanced` / `original`);
  - `fitgirl-web-enhanced:v1:media-expand`: Default screenshot expand preference;
  - `fitgirl-web-enhanced:v1:infinite-scroll`: Infinite scroll toggle;
  - `fitgirl-web-enhanced:v1:show-ratings`: Game ratings display toggle;
  - `fitgirl-web-enhanced:v1:language`: UI language preference (`en` / `zh-CN`);
  - `fitgirl-web-enhanced:ratings:v1`: Local Steam ratings cache dictionary (7-day TTL eviction).

---

## Compatibility

| Environment         | Support Details                                                                 |
| :------------------ | :------------------------------------------------------------------------------ |
| **Script Managers** | Tampermonkey, Violentmonkey, Greasemonkey, and standard Userscript managers     |
| **Browsers**        | Latest stable Chromium (Chrome, Edge, Brave, Vivaldi), Firefox, and derivatives |
| **Viewports**       | 390px mobile single-column up to 4K+ ultrawide 4-column adaptive layout         |
| **Graceful Degrad** | Automatically falls back to native layout if unexpected DOM anomalies occur      |

---

## Local Development & Testing

### Prerequisites

- [Node.js](https://nodejs.org/) `>= 22.12`
- [npm](https://www.npmjs.com/)

### Workflow Commands

```bash
# Install dependencies
npm ci

# Start local hot-reloading development server
npm run dev

# Static type check
npm run typecheck

# Code linting and formatting check
npm run lint
npm run format:check

# Run unit tests
npm run test

# Build production bundle (outputs to dist/fitgirl-enhanced.user.js)
npm run build

# Bump version uniformly (syncs package.json, package-lock.json, README badges, and rebuilds)
npm run bump patch   # or minor, major, 1.5.0

# Run Playwright E2E and visual snapshot tests
npm run test:e2e

# Headless capture of documentation preview assets (outputs to docs/assets/)
npm run capture

# Comprehensive pre-commit check
npm run check
```

---

## FAQ & Troubleshooting

### Q1: The layout doesn't change after installing the script?

- Ensure your current URL matches `https://fitgirl-repacks.site/*`;
- Confirm the script is enabled in your script manager dashboard;
- If you previously switched to the original view, toggle it back from the top **View** menu or run `localStorage.clear()` in DevTools console to reset settings.

### Q2: Why are some non-game articles not shown as grid cards?

- Updates Digest, administrative announcements, and non-repack posts lack standard metadata and are rendered in full-width fidelity layout to prevent missed announcements or broken styling.

### Q3: How do I report layout issues after a site redesign?

- Switch temporarily to **Original View** via the top **View** menu to continue browsing;
- Open an issue on [GitHub Issues](https://github.com/red352/fitgirl-web-enhanced/issues) with the page URL, browser version, and DevTools console error screenshots.

### Q4: Why do some titles show "Unmatched" or lack Steam ratings?

- Common reasons include:
  1. The title is non-Steam (console exclusive port, Epic/GOG/EA/Ubisoft exclusive);
  2. The post title uses non-standard aliases or special subtitles that missed matching candidates;
  3. Network timeout or throttling when reaching Steam Store public endpoints.
- **Solution**: Hover over the "Unmatched" badge and click **Steam Search** or **SteamDB Search** in the popover to search manually, or click **Query Again 🔄** to retry.

### Q5: What if ratings are outdated or need refreshing?

- Successfully retrieved ratings are cached locally for 7 days to eliminate unnecessary network requests and ensure instant loading.
- To refresh a title's rating immediately, hover over the rating badge (or view the single post info bar) and click the **Force Refresh 🔄** button in the popover or info row.

---

## Contributing Guidelines

Contributions that enhance this project are welcome!

1. Fork the repository and create your feature branch;
2. Adhere to the existing ESLint and Prettier formatting standards;
3. Ensure `npm run check` and `npm run test:e2e` pass cleanly;
4. Write clear, imperative commit messages (e.g., `feat: ...`, `fix: ...`).

---

## Disclaimer & License

### Disclaimer

This script is an independent open-source frontend enhancement tool developed solely to improve readability and user experience.

- The script does not host, store, index, parse, or distribute any copyrighted binaries, torrent files, or data streams.
- The author has no affiliation, endorsement, or employment relationship with FitGirl Repacks.
- Users are responsible for complying with their local laws and regulations. The author assumes no liability for external links or user actions.

### License

Distributed under the [MIT License](LICENSE).<br />
Copyright © 2026 red352
