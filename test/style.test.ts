import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The stylesheet is the only place several of the P0 decisions live — colour,
 * weight, border style — and none of it is reachable from a DOM assertion. These
 * tests pin the decisions so a later edit cannot quietly undo them: a selector
 * that is gone has to stay gone, and a property that was retuned has to keep its
 * new value.
 *
 * Comments are stripped on load: this file's own prose quotes selectors, hex
 * values and `light-dark(` to explain why they are or are not used, and every
 * helper below does substring matching.
 */
function loadCss(): string {
  return readFileSync(resolve(root, 'src/style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Returns the declaration block that follows `selector`, or `''` when absent.
 *
 * The lookup runs against a whitespace-collapsed copy of the sheet: prettier
 * wraps long selector lists across lines, and a caller should not have to know
 * where it chose to break them.
 */
function ruleBody(rawCss: string, selector: string): string {
  const css = rawCss.replace(/\s+/g, ' ');
  const start = css.indexOf(selector);
  if (start === -1) return '';
  const open = css.indexOf('{', start);
  if (open === -1) return '';
  const close = css.indexOf('}', open);
  return css.slice(open + 1, close).trim();
}

/** Reads one declaration out of a rule body, as the raw value string. */
function declaration(body: string, property: string): string {
  const match = body.match(new RegExp(`${property}\\s*:\\s*([^;]+)`));
  return match?.[1]?.trim() ?? '';
}

/**
 * Finds the `@media` block whose body mentions `needle`.
 *
 * A stylesheet can hold several blocks with the same query (the skeleton's
 * reduced-motion opt-out lives next to its own rules, not in the shared one), so
 * the query string alone is not enough to identify a block.
 */
function mediaBlockContaining(css: string, needle: string): string {
  let from = 0;
  for (;;) {
    const start = css.indexOf('@media', from);
    if (start === -1) return '';
    const open = css.indexOf('{', start);
    const close = css.indexOf('}', open);
    const body = css.slice(open + 1, close);
    if (body.includes(needle)) return body;
    from = start + 1;
  }
}

/**
 * Every rule nested inside `@media (<condition>)`, as one string.
 *
 * `mediaBlockContaining` stops at the first `}`, which is the end of the first
 * nested rule — not the end of the query. Brace matching is the only way to
 * get a query's whole body, and a caller asserting on a breakpoint needs the
 * condition's own text to be reachable too.
 */
function mediaBlocks(css: string, condition: string): string {
  const start = css.indexOf(`@media (${condition})`);
  if (start === -1) return '';
  const open = css.indexOf('{', start);
  if (open === -1) return '';
  let depth = 1;
  for (let index = open + 1; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    else if (css[index] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, index);
    }
  }
  return '';
}

/**
 * Every declaration body whose selector list mentions `className`.
 *
 * `[^{}]` cannot cross a nested block, so rules inside `@media` are matched
 * individually and the wrapper itself is skipped — which is what makes this
 * usable on a stylesheet that mixes flat rules with at-rules.
 */
function ruleBodiesFor(css: string, className: string): string[] {
  const bodies: string[] = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(css)) !== null) {
    if (match[1]?.includes(className)) bodies.push(match[2] ?? '');
  }
  return bodies;
}

const css = loadCss();

describe('Stream card styling', () => {
  it('drops the in-stream rank badge rules along with the badge itself', () => {
    // The badge is no longer rendered in home/search streams, so its ladder of
    // pink treatments would be dead CSS that still ships to every reader.
    expect(css).not.toContain('fwe-order-badge');
  });

  it('drops the relative-time badge rules now that the date chip carries them', () => {
    expect(css).not.toContain('fwe-time-ago');
  });

  it('drops the Metacritic pill icon rule, which no longer has a call site', () => {
    expect(css).not.toContain('fwe-rating-icon-meta');
  });

  it('keeps the score corner anchored to the end of the header row', () => {
    expect(ruleBody(css, '.fwe-header-right')).toContain('justify-self: end');
  });

  it('gives notice and digest cards a quieter frame than game cards', () => {
    const body = ruleBody(css, '.fwe-notice');
    expect(body).toContain('border-style: dashed');
    expect(body).toContain('box-shadow: none');
    expect(body).toContain('align-self: start');
    expect(body).toContain('height: fit-content');
    expect(ruleBody(css, '.fwe-digest')).toContain('align-self: start');
  });

  it('labels the card kind as a small muted uppercase chip', () => {
    const body = ruleBody(css, '.fwe-card-kind');
    expect(body).toMatch(/text-transform: uppercase/);
    expect(body).toContain('var(--fwe-muted)');
  });

  it('tones the fact row icons down to the muted token', () => {
    const body = ruleBody(css, '.fwe-fact__label .fwe-icon');
    expect(body).toContain('color: var(--fwe-muted)');
    expect(body).not.toContain('var(--fwe-pink)');
  });

  it('demotes the gallery heading to a small muted uppercase label', () => {
    const body = ruleBody(css, '.fwe-media__label');
    expect(body).toMatch(/text-transform: uppercase/);
    expect(body).toContain('var(--fwe-muted)');
  });
});

describe('Card actions', () => {
  it('stops stretching every action button to the same width', () => {
    expect(ruleBody(css, '.fwe-card-btn {')).not.toContain('flex: 1');
  });

  it('gives the download action the primary share of the row', () => {
    const body = ruleBody(css, '.fwe-card-btn--primary {');
    expect(body).toMatch(/flex:\s*2/);
  });

  it('renders secondary actions as borderless ghost buttons', () => {
    const body = ruleBody(css, '.fwe-card-btn--ghost');
    expect(body).toMatch(/background:\s*(transparent|none)/);
    expect(body).toContain('color: var(--fwe-muted)');
    expect(body).toMatch(/flex:\s*1/);
  });
});

describe('Rating pill', () => {
  it('drops the blur that cost compositing for no legibility gain', () => {
    expect(ruleBody(css, '.fwe-rating-pill {')).not.toContain('backdrop-filter');
  });

  it('uses a 6px radius instead of a pill shape', () => {
    expect(ruleBody(css, '.fwe-rating-pill {')).toContain('border-radius: 6px');
  });

  it('marks the score with a tier token instead of a left rule', () => {
    // 左边线 + 满铺纸底的组合读起来像没对齐的贴纸。梯级色现在同时暴露成
    // --fwe-rating-tier，药丸的边和字都从它取，一个槽位一件事。
    const overwhelming = ruleBody(css, '.fwe-rating--overwhelming');
    expect(overwhelming).not.toContain('border-left');
    expect(overwhelming).toContain('--fwe-rating-tier: var(--fwe-rating-overwhelming)');
    const pill = ruleBody(css, '.fwe-rating-pill {');
    expect(declaration(pill, 'background')).toBe('var(--fwe-paper)');
    expect(pill).toContain('--fwe-rating-tier');
    expect(declaration(pill, 'border-radius')).toBe('6px');
  });
});

describe('Pink paw badge', () => {
  it('reads as a small trailing mark beside the title rather than a chip', () => {
    const body = ruleBody(css, '.fwe-paw-badge {');
    expect(body).not.toContain('box-shadow');
    expect(body).not.toContain('border:');
    // Smaller than the 0.68rem chip it replaces: it labels the title, it is not
    // a second headline.
    expect(Number.parseFloat(declaration(body, 'font-size'))).toBeLessThan(0.68);
  });
});

describe('Narrow viewports', () => {
  it('keeps the list-view card body visible on a 390px phone', () => {
    // twentyfourteen-fg hides `.list-view .type-post .entry-content` below 400px
    // with specificity (0,4,0). The enhanced card lives inside that element, so
    // without this override a phone reader gets nothing but title rows.
    const media = css.slice(css.indexOf('@media screen and (max-width: 400px)'));
    expect(media).toContain('display: flex !important');
  });

  it('lets the merged date chip wrap instead of squeezing the title', () => {
    // The chip now carries "Today · September 2, 2026"; at 390px that is wider
    // than the card, and it has to wrap rather than steal width from the title.
    const body = ruleBody(css, '.fwe-meta-chip__date');
    expect(body).toMatch(/overflow-wrap/);
  });
});

describe('Loading skeleton', () => {
  it('reserves the height a real card occupies so nothing jumps on landing', () => {
    // A real card is sized by `content-visibility: auto` +
    // `contain-intrinsic-size: auto 30rem`. If the skeleton reserves less, the
    // whole page shifts down when the real cards replace it.
    const card = ruleBody(css, '.fwe-skeleton-card {');
    expect(declaration(card, 'min-height')).toBe('30rem');
    // 镜像关系本身也要钉住：真实卡的占位尺寸就是骨架预留高度的基准，
    // 只钉骨架值的话，真实卡再变时这条测试会静静地变成假陈述。
    const realCard = ruleBody(css, "html[data-fwe-mode='enhanced'] .fwe-game-card {");
    expect(declaration(realCard, 'contain-intrinsic-size')).toBe('auto 30rem');
    // Same stretch behaviour as `.fwe-stream`, so one row of skeletons lines up
    // with one row of real cards.
    expect(ruleBody(css, '.fwe-skeleton {')).toContain('align-items: stretch');
  });

  it('mirrors the stream grid so the skeleton row lands on the same columns', () => {
    const grid = ruleBody(css, '.fwe-skeleton {');
    expect(grid).toContain('display: grid');
    expect(grid).toMatch(/grid-template-columns:\s*repeat\(/);
    expect(grid).toContain('gap: 1.25rem');
  });

  it('shades every placeholder with the one neutral line token', () => {
    // Restraint rule from the design doc: the loading state must not add a new
    // accent, and pink is reserved for the primary action. Blocks, fact rows and
    // the gallery all share a single shading rule, so there is exactly one place
    // for a stray colour to sneak in.
    const bodies = ruleBodiesFor(css, '.fwe-skeleton');
    expect(bodies.length).toBeGreaterThan(5);
    for (const body of bodies) {
      expect(body).not.toContain('--fwe-pink');
    }

    const shaded = bodies.filter((body) => /background:\s*var\(--fwe-line\)/.test(body));
    expect(shaded).toHaveLength(1);
    expect(shaded[0]).toContain('animation: fwe-skeleton-pulse');
  });

  it('degrades the pulse to a static block under prefers-reduced-motion', () => {
    // The shared reduced-motion block already covers the rest of the UI; the
    // skeleton opts into the same treatment rather than inventing a second one.
    expect(mediaBlockContaining(css, '.fwe-skeleton__block')).toContain('animation: none');
  });
});

/** Every `--fwe-*` declaration in a rule body, as a name → value map. */
function tokenMap(body: string): Record<string, string> {
  const map: Record<string, string> = {};
  const pattern = /(--fwe-[\w-]+)\s*:\s*([^;]+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    const name = match[1];
    const value = match[2];
    if (name && value) map[name] = value.trim();
  }
  return map;
}

/** WCAG 2.1 relative luminance. */
function luminance(hex: string): number {
  const pairs = hex.replace('#', '').match(/../g) ?? [];
  const channels = pairs
    .map((pair) => Number.parseInt(pair, 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  const [red, green, blue] = [channels[0] ?? 0, channels[1] ?? 0, channels[2] ?? 0];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG 2.1 contrast ratio between two `#rrggbb` colours. */
function contrast(foreground: string, background: string): number {
  const left = luminance(foreground);
  const right = luminance(background);
  return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
}

describe('Dark mode palette', () => {
  const darkBlock = ruleBody(css, "html[data-fwe-theme='dark'] {");

  it('leaves the light palette exactly as P0 tuned it', () => {
    // The dark mode is an override layer, not a rewrite: every light value the
    // card work landed on has to survive untouched underneath it.
    const light = tokenMap(ruleBody(css, ':root {'));
    expect(light['--fwe-paper']).toBe('#f5f3ef');
    expect(light['--fwe-card']).toBe('#fffdf9');
    expect(light['--fwe-ink']).toBe('#1b1b1f');
    expect(light['--fwe-muted']).toBe('#69676d');
    expect(light['--fwe-line']).toBe('#ded9d2');
    expect(light['--fwe-pink']).toBe('#d60072');
    expect(light['--fwe-header']).toBe('#08080a');
  });

  it('overrides the whole palette under one selector', () => {
    // One override block is the whole mechanism: nothing else in the sheet is
    // allowed to special-case the dark theme by name.
    const dark = tokenMap(darkBlock);
    expect(dark['--fwe-paper']).toBe('#131317');
    expect(dark['--fwe-card']).toBe('#1e1d23');
    expect(dark['--fwe-ink']).toBe('#e9e5de');
    expect(dark['--fwe-muted']).toBe('#a6a29c');
    expect(dark['--fwe-line']).toBe('#332f3a');
    expect(dark['--fwe-pink']).toBe('#f65d9e');
    // The masthead is already near-black in both themes; re-declaring it keeps
    // the override block complete rather than relying on inheritance.
    expect(dark['--fwe-header']).toBe('#08080a');
    expect(dark['--fwe-shadow']).toBe('0 14px 36px rgb(0 0 0 / 45%)');
  });

  it('declares color-scheme for all three states', () => {
    // `light-dark()` is deliberately unused: the three states have to be able to
    // force a scheme, which means each one says so explicitly.
    expect(declaration(ruleBody(css, "html[data-fwe-theme='light']"), 'color-scheme')).toBe(
      'light',
    );
    expect(declaration(darkBlock, 'color-scheme')).toBe('dark');
    expect(declaration(ruleBody(css, "html[data-fwe-theme='system']"), 'color-scheme')).toBe(
      'light dark',
    );
    expect(css).not.toContain('light-dark(');
  });

  it('switches the palette for a system reader without any script', () => {
    // `system` cannot be resolved at parse time, so the same dark values are
    // repeated behind a media query. The two maps must stay identical, or the
    // three states drift apart — that equality is this test's whole job.
    const media = mediaBlockContaining(css, "data-fwe-theme='system'");
    expect(media).not.toBe('');
    expect(tokenMap(ruleBody(media, "html[data-fwe-theme='system']"))).toEqual(tokenMap(darkBlock));
  });

  it('retunes the rating tiers instead of carrying the light greens over', () => {
    // The doc pins olive/amber/red for dark. Those land at 2.97:1, 4.37:1 and
    // 2.84:1 on #131317 — the score number is the one thing the tier exists to
    // make readable, so the hues stay and the values move (see the contrast
    // test below). Light gets the same treatment: #38bdf8 on cream is 1.93:1.
    const dark = tokenMap(darkBlock);
    expect(dark['--fwe-rating-overwhelming']).toBe('#3fae7e');
    expect(dark['--fwe-rating-positive']).toBe('#5fa8d9');
    expect(dark['--fwe-rating-mixed']).toBe('#e0a32e');
    expect(dark['--fwe-rating-negative']).toBe('#ef6b63');
  });

  it('keeps the theme blocks to token overrides and nothing else', () => {
    // The dark palette is one override layer. If a theme-scoped rule starts
    // styling a component directly, there is a second palette nobody can find,
    // and the `system` twin stops being the only thing that has to stay in sync.
    const declarations = css
      .split('}')
      .filter((chunk) => chunk.includes('data-fwe-theme'))
      .flatMap((chunk) => (chunk.split('{').pop() ?? '').split(';'))
      .map((line) => line.trim())
      .filter(Boolean);
    expect(declarations.length).toBeGreaterThan(20);
    for (const line of declarations) {
      expect(line).toMatch(/^(color-scheme\s*:|--fwe-[\w-]+\s*:)/);
    }
  });

  it('adds the hover tokens the light palette never needed', () => {
    // A ghost button on cream can hover to a slightly darker cream. On #131317
    // there is nowhere to go but up, so the lift has to be a white wash.
    expect(tokenMap(ruleBody(css, ':root {'))['--fwe-ghost']).toBeTruthy();
    expect(tokenMap(darkBlock)['--fwe-elevate']).toBe('rgb(255 255 255 / 6%)');
    expect(tokenMap(darkBlock)['--fwe-ghost']).toBeTruthy();
  });

  it('keeps body and muted text readable in both palettes', () => {
    // WCAG AA: 4.5:1 for body copy, 3:1 for large text. The dark values are
    // pulled towards warm grey rather than pure white, so they have to be
    // checked rather than assumed.
    const light = tokenMap(ruleBody(css, ':root {'));
    const dark = tokenMap(darkBlock);
    for (const [name, palette] of [
      ['light', light],
      ['dark', dark],
    ] as const) {
      const ink = palette['--fwe-ink'] ?? '';
      const muted = palette['--fwe-muted'] ?? '';
      const paper = palette['--fwe-paper'] ?? '';
      const card = palette['--fwe-card'] ?? '';
      expect(contrast(ink, paper), `${name} ink on paper`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, card), `${name} ink on card`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(muted, paper), `${name} muted on paper`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(muted, card), `${name} muted on card`).toBeGreaterThanOrEqual(4.5);
      // Pink is used for links and the accent edge; 3:1 is the bar for the
      // large/bold text it is applied to.
      expect(
        contrast(palette['--fwe-pink'] ?? '', paper),
        `${name} pink on paper`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps the segmented control legible on the light panel it sits in', () => {
    // The view-control panel is `var(--fwe-card)` in both themes, but the
    // segmented buttons were written against a dark panel: #b3adb1 on cream is
    // 2.17:1. The theme row makes this the control readers touch most.
    const body = ruleBody(css, '.fwe-segmented__btn {');
    expect(declaration(body, 'color')).toBe('var(--fwe-muted)');
    expect(declaration(ruleBody(css, ".fwe-segmented__btn[aria-pressed='true']"), 'color')).toBe(
      'var(--fwe-on-accent)',
    );
    const hover = ruleBody(css, ".fwe-segmented__btn:hover:not([aria-pressed='true'])");
    expect(declaration(hover, 'color')).toBe('var(--fwe-ink)');
  });

  it('neutralises the theme skin with tokens rather than a second palette', () => {
    // The three rules that undo twentyfourteen-fg's own defaults live in the
    // enhanced-mode section and read tokens, so they follow whichever palette is
    // active without a dark-mode twin. A literal in any of them would be a
    // colour that only looks right in one theme. Each rule is looked up by a
    // fragment prettier cannot break across lines.
    expect(declaration(ruleBody(css, '.page-content'), 'background')).toBe('transparent');
    expect(declaration(ruleBody(css, "html[data-fwe-mode='enhanced'] body"), 'color')).toBe(
      'var(--fwe-ink)',
    );
    expect(declaration(ruleBody(css, ':where(input, select, textarea)'), 'color')).toBe(
      'var(--fwe-ink)',
    );
    expect(declaration(ruleBody(css, 'a:not([class])'), 'color')).toBe('var(--fwe-link)');
  });

  it('keeps the game dialog header on a theme token, not a hardcoded light fill', () => {
    // The dialog header sits above the tab bar; a literal #faf8f5 makes it a
    // white slab in dark mode while its text follows --fwe-ink (light). Same
    // class of bug as the site-white-background neutraliser above.
    expect(
      declaration(
        ruleBody(css, "html[data-fwe-mode='enhanced'] .fwe-game-dialog__header {"),
        'background',
      ),
    ).toBe('var(--fwe-panel-deep)');
  });

  it('out-specifies the theme white backgrounds so dark mode stays dark', () => {
    /*
     * twentyfourteen-fg paints `.site-content .entry-header` and
     * `.site-content .entry-content` with `background-color: #fff` at specificity
     * (0,2,0). Our neutraliser must beat that, or dark mode gets a white panel
     * behind light text — the exact regression a fixture without the theme CSS
     * cannot catch. `:where()` zeroes the selector-list's specificity, leaving
     * only `html[mode]` (0,1,1), which LOSES. `:is()` keeps the list's own
     * specificity (0,2,0), giving (0,3,1) and winning. Pin the `:is` shape.
     */
    const flat = css.replace(/\s+/g, ' ');
    expect(flat).toContain("html[data-fwe-mode='enhanced'] :is( .site-content .entry-header,");
    // And the old, losing form must not creep back.
    expect(flat).not.toContain(
      "html[data-fwe-mode='enhanced'] :where( .site-content .entry-header,",
    );
  });

  it('keeps every rating tier readable on the pill background it sits on', () => {
    // The pill paints `var(--fwe-paper)` behind the score, so that is the
    // background the tier colour has to clear 4.5:1 against. P0's originals did
    // not: three of the four sat between 1.93:1 and 3.40:1.
    for (const [name, palette] of [
      ['light', tokenMap(ruleBody(css, ':root {'))],
      ['dark', tokenMap(darkBlock)],
    ] as const) {
      for (const tier of ['overwhelming', 'positive', 'mixed', 'negative'] as const) {
        const colour = palette[`--fwe-rating-${tier}`] ?? '';
        const paper = palette['--fwe-paper'] ?? '';
        expect(contrast(colour, paper), `${name} ${tier} on paper`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('lets the theme attribute own color-scheme on the root', () => {
    // `html[data-fwe-mode='enhanced']` used to declare `color-scheme: light`
    // for the UA's own widgets. That selector is (0,2,0) — it out-specifies
    // every `html[data-fwe-theme=…]` rule (0,1,1) — so it pinned the root to
    // light even with the dark palette active, and the UA kept painting light
    // scrollbars and form controls over a dark page. The theme block owns it
    // now; the one place a descendant still forces `light` is the embedded OST
    // iframe, which is a third-party document and not ours to re-theme.
    const rootRules = css
      .split('}')
      .map((chunk) => chunk.split('{').map((part) => part.trim()))
      .filter(([selector]) => /^html\[data-fwe-mode='(enhanced|original)'\]$/.test(selector ?? ''));
    expect(rootRules.length).toBeGreaterThan(0);
    for (const [, body] of rootRules) {
      expect(body ?? '').not.toMatch(/color-scheme\s*:/);
    }
  });

  it('tokens the extras input background instead of pinning white', () => {
    // A white input on a #131317 page is the single most visible dark-mode
    // break, and the subscription form is the one place it happened.
    const body = ruleBody(
      css,
      "html[data-fwe-mode='enhanced'] .fwe-extras-block input:not([type='submit'], [type='button'])",
    );
    expect(declaration(body, 'background')).toMatch(/^var\(--fwe-/);
  });
});

describe('Extras footer strip', () => {
  const stripBody = ruleBody(css, "html[data-fwe-mode='enhanced'] .fwe-extras-block--strip");

  it('drops the card frame so the band reads as chrome, not content', () => {
    // Four bordered, shadowed cards announced four pieces of content. The
    // demotion is the whole point of the strip: no border, no shadow, no
    // radius, no panel fill — only a hairline above it.
    expect(declaration(stripBody, 'border-top')).toBe('1px solid var(--fwe-line)');
    expect(declaration(stripBody, 'border-radius')).toBe('0');
    expect(declaration(stripBody, 'box-shadow')).toBe('none');
    expect(declaration(stripBody, 'background')).toBe('transparent');
    expect(declaration(stripBody, 'padding')).toBe('1.1rem 0 0');
    expect(declaration(stripBody, 'color')).toBe('var(--fwe-muted)');
  });

  it('lays the four cells out on one row and spans the full width', () => {
    // `1 / -1` keeps the band out of the extras section's auto-fill columns,
    // which would otherwise squeeze it to a 16rem track like the old cards.
    expect(declaration(stripBody, 'grid-column')).toBe('1 / -1');
    expect(declaration(stripBody, 'display')).toBe('grid');
    expect(declaration(stripBody, 'grid-template-columns')).toBe('repeat(4, minmax(0, 1fr))');
  });

  it('demotes the widget titles to small muted uppercase labels', () => {
    // A Georgia serif heading at 0.95rem is card weight. Inside the strip the
    // same node becomes a label: inherited family, tiny, tracked out, muted.
    const body = ruleBody(
      css,
      "html[data-fwe-mode='enhanced'] .fwe-extras-block--strip .fwe-extras-block__title",
    );
    expect(declaration(body, 'font-family')).toBe('inherit');
    expect(declaration(body, 'color')).toBe('var(--fwe-muted)');
    expect(declaration(body, 'font-size')).toBe('0.68rem');
    expect(declaration(body, 'font-weight')).toBe('800');
    expect(declaration(body, 'letter-spacing')).toBe('0.08em');
    expect(declaration(body, 'text-transform')).toBe('uppercase');
  });

  it('gives the OST embed a 16/9 box instead of a letterbox sliver', () => {
    // The old auto-fill track left the iframe a narrow strip of its cell. An
    // explicit ratio plus a full-width, auto-height box makes it a player.
    const body = ruleBody(css, "html[data-fwe-mode='enhanced'] .fwe-extras-strip__cell iframe");
    expect(declaration(body, 'aspect-ratio')).toBe('16 / 9');
    expect(declaration(body, 'width')).toBe('100%');
    expect(declaration(body, 'height')).toBe('auto');
  });

  it('puts the subscription form on one line', () => {
    // Stacked label-over-input-over-button ate a whole card. Inline is what
    // makes a four-cell band viable at all.
    const body = ruleBody(css, "html[data-fwe-mode='enhanced'] .fwe-extras-strip__cell form");
    expect(declaration(body, 'display')).toBe('flex');
    expect(declaration(body, 'gap')).toBe('0.4rem');
    // The input gives up its 100% width so the button fits beside it.
    const input = ruleBody(
      css,
      "html[data-fwe-mode='enhanced'] .fwe-extras-strip__cell input:not([type='submit'], [type='button'])",
    );
    expect(declaration(input, 'width')).toBe('auto');
    expect(declaration(input, 'flex')).toBe('1');
    expect(declaration(input, 'min-width')).toBe('0');
    // …and the button stops taking the margin-top the stacked layout needed.
    const button = ruleBody(css, "html[data-fwe-mode='enhanced'] .fwe-extras-strip__cell button");
    expect(declaration(button, 'margin-top')).toBe('0');
    expect(declaration(button, 'white-space')).toBe('nowrap');
  });

  it('degrades 4 → 2 → 1 columns instead of overflowing', () => {
    // Each step has to be a real column count, not `auto-fill` guessing: a
    // sliver track is what the band exists to avoid. The breakpoints are
    // computed from what a cell still needs (input + nowrap button ≈ 175px,
    // plus 1.75rem column gaps and the page's clamp(2rem, 5vw, 5rem) gutter),
    // so they are pinned here too — moving one without redoing that arithmetic
    // would silently squeeze the subscription form.
    const twoCol = mediaBlocks(css, 'max-width: 54rem');
    expect(twoCol).not.toBe('');
    expect(twoCol).toContain('repeat(2, minmax(0, 1fr))');
    expect(twoCol).toContain('.fwe-extras-block--strip');
    const oneCol = mediaBlocks(css, 'max-width: 26rem');
    expect(oneCol).not.toBe('');
    expect(oneCol).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(oneCol).toContain('.fwe-extras-block--strip');
    // Both queries scope to the strip, so nothing else in the sheet reflows.
    expect(twoCol).not.toContain('.fwe-game-card');
    expect(oneCol).not.toContain('.fwe-game-card');
  });

  it('keeps the OST iframe pinned to a light color-scheme', () => {
    // Declared in P1 for the canvas-opacity bug (w3c/csswg-drafts#4772); the
    // strip inherits it through the same selector, so it must survive the
    // move from `.fwe-extras-block` to the cell.
    const body = ruleBody(css, "html[data-fwe-mode='enhanced'] .fwe-extras-block iframe");
    expect(declaration(body, 'color-scheme')).toBe('light');
  });
});

describe('Detail page content column', () => {
  // `#content > :not(...)` hides everything it does not name with
  // `display: none !important`, and no later rule can win against that. The
  // detail page mounts the extras section inside `#content` (before the
  // comments, see `prepareSiteExtras`), so dropping it from the whitelist makes
  // the whole sidebar/footer restoration vanish without any test noticing.
  const hideRuleSelector = (): string => {
    const flat = css.replace(/\s+/g, ' ');
    const start = flat.indexOf("html[data-fwe-mode='enhanced'] #content > :not(");
    if (start === -1) return '';
    return flat.slice(start, flat.indexOf('{', start));
  };

  it('names the extras section in the #content hide-everything whitelist', () => {
    expect(hideRuleSelector()).toContain('.fwe-site-extras');
  });

  it('still hides unnamed #content children, so the guard stays armed', () => {
    const body = ruleBody(css, "html[data-fwe-mode='enhanced'] #content > :not(");
    expect(declaration(body, 'display')).toBe('none !important');
  });
});

describe('Rating surface tokens', () => {
  const darkBlock = ruleBody(css, "html[data-fwe-theme='dark'] {");
  const popover = ruleBody(css, '.fwe-rating-popover {');

  it('carries the popover surface through tokens in all three palettes', () => {
    for (const [name, palette] of [
      ['light', tokenMap(ruleBody(css, ':root {'))],
      ['dark', tokenMap(darkBlock)],
      [
        'system-dark',
        tokenMap(
          ruleBody(
            mediaBlockContaining(css, "data-fwe-theme='system'"),
            "html[data-fwe-theme='system']",
          ),
        ),
      ],
    ] as const) {
      expect(palette['--fwe-popover-bg'], `${name} popover bg`).toBeTruthy();
      expect(palette['--fwe-popover-line'], `${name} popover line`).toBeTruthy();
      expect(palette['--fwe-popover-shadow'], `${name} popover shadow`).toBeTruthy();
      expect(palette['--fwe-meta-good'], `${name} meta good`).toBeTruthy();
      expect(palette['--fwe-meta-warn'], `${name} meta warn`).toBeTruthy();
      expect(palette['--fwe-meta-bad'], `${name} meta bad`).toBeTruthy();
    }
    expect(tokenMap(ruleBody(css, ':root {'))['--fwe-popover-bg']).toBe('#fffdf9');
    expect(tokenMap(darkBlock)['--fwe-popover-bg']).toBe('#1e1d23');
  });

  it('keeps the dark twin byte-identical after the new tokens', () => {
    const system = mediaBlockContaining(css, "data-fwe-theme='system'");
    expect(tokenMap(ruleBody(system, "html[data-fwe-theme='system']"))).toEqual(
      tokenMap(darkBlock),
    );
  });

  it('paints the popover from tokens instead of a hardcoded dark slab', () => {
    expect(declaration(popover, 'background')).toBe('var(--fwe-popover-bg)');
    expect(declaration(popover, 'color')).toBe('var(--fwe-ink)');
    expect(declaration(popover, 'box-shadow')).toBe('var(--fwe-popover-shadow)');
    expect(declaration(popover, 'box-sizing')).toBe('border-box');
    expect(declaration(popover, 'width')).toBe('19.5rem');
    expect(popover).not.toContain('rgba(20, 24, 33');
  });

  it('leaves no dark-palette literals in the rating surfaces', () => {
    // 浅色模式下这些位置曾经是写死的深色字面量：一块与页面无关的深色贴纸。
    // 守卫的意义是防止它们被谁改回来。
    const bodies = [
      ...ruleBodiesFor(css, '.fwe-rating-popover'),
      ...ruleBodiesFor(css, '.fwe-rating-pill--loading'),
      ...ruleBodiesFor(css, '.fwe-rating-pill--unmatched'),
      ...ruleBodiesFor(css, '.fwe-rating--meta-'),
    ].join('\n');
    expect(bodies).not.toBe('');
    for (const literal of [
      '#94a3b8',
      '#64748b',
      '#cbd5e1',
      '#e2e8f0',
      '#f1f5f9',
      '#fff',
      '#4ade80',
      '#fbbf24',
      '#f87171',
      'rgba(255, 255, 255',
      'rgba(20, 24, 33',
    ]) {
      expect(bodies, `${literal} still hardcoded`).not.toContain(literal);
    }
  });

  it('keeps the metascore tier readable on the popover it sits in', () => {
    for (const [name, palette] of [
      ['light', tokenMap(ruleBody(css, ':root {'))],
      ['dark', tokenMap(darkBlock)],
    ] as const) {
      const bg = palette['--fwe-popover-bg'] ?? '';
      for (const tier of ['good', 'warn', 'bad'] as const) {
        expect(
          contrast(palette[`--fwe-meta-${tier}`] ?? '', bg),
          `${name} meta ${tier} on popover`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

/** Every colour-bearing declaration value in a rule body, shorthand prefixes removed. */
function colourValues(body: string): string[] {
  const values: string[] = [];
  const pattern =
    /(?:^|;)\s*(color|background|background-color|border|border-color|border-top|border-right|border-bottom|border-left|fill)\s*:\s*([^;]+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    const property = match[1] ?? '';
    const value = (match[2] ?? '').trim();
    values.push(
      property === 'border' || property.startsWith('border-')
        ? value.replace(/^1px\s+solid\s+/, '')
        : value,
    );
  }
  return values;
}

describe('Rating badge shape and card grid', () => {
  it('puts the score on the title row and lets the meta chips span both columns', () => {
    // 徽章独占第三行时，它飘在元信息下方右侧，与标题脱节。标题左、分数右是
    // 卡片上最省解释的读法，元信息胶囊仍要完整宽度，所以横跨两列。
    const header = ruleBody(css, "html[data-fwe-mode='enhanced'] article .entry-header {");
    expect(declaration(header, 'grid-template-areas')).toBe("'title right' 'meta meta'");
    expect(declaration(header, 'grid-template-columns')).toBe('minmax(0, 1fr) auto');
  });

  it('squares the badge and its pill to one 6px radius', () => {
    expect(declaration(ruleBody(css, '.fwe-rating-badge {'), 'border-radius')).toBe('6px');
    expect(declaration(ruleBody(css, '.fwe-rating-pill {'), 'border-radius')).toBe('6px');
  });

  it('scales the badge up to a legible size with a matching icon and padding', () => {
    expect(declaration(ruleBody(css, '.fwe-rating-badge {'), 'font-size')).toBe('0.78rem');
    expect(declaration(ruleBody(css, '.fwe-rating-pill {'), 'padding')).toBe('0.3rem 0.6rem');
    const icon = ruleBody(css, '.fwe-rating-icon {');
    expect(declaration(icon, 'width')).toBe('0.95rem');
    expect(declaration(icon, 'height')).toBe('0.95rem');
  });

  it('exposes the tier colour as one token that both the pill edge and the text read', () => {
    for (const tier of ['overwhelming', 'positive', 'mixed', 'negative'] as const) {
      const body = ruleBody(css, `.fwe-rating--${tier} {`);
      expect(body, tier).toContain(`--fwe-rating-tier: var(--fwe-rating-${tier})`);
      // percent 与 bar-fill 复用同一批类名，color 声明必须保留
      expect(declaration(body, 'color'), tier).toBe(`var(--fwe-rating-${tier})`);
      expect(body, tier).not.toContain('border-left');
      expect(declaration(body, 'background'), tier).toBe('');
    }

    const pill = ruleBody(css, '.fwe-rating-pill {');
    expect(declaration(pill, 'border')).toContain('var(--fwe-rating-tier');
    expect(declaration(pill, 'border')).toContain('color-mix(');
  });

  it('keeps the unmatched and loading pills on complete border declarations', () => {
    // 基态 pill 的 border 简写与状态类的 border-color 同特异度、写在后面，
    // 会把状态色吃掉（T3 前就存在的死声明）。状态类改写成完整 border，
    // hover 变体仍以更高特异度覆盖。
    for (const selector of ['.fwe-rating-pill--loading', '.fwe-rating-pill--unmatched']) {
      expect(declaration(ruleBody(css, selector), 'border'), selector).toBe(
        '1px solid var(--fwe-line)',
      );
    }

    const hover = ruleBody(css, '.fwe-rating-badge--unmatched:hover .fwe-rating-pill--unmatched');
    expect(declaration(hover, 'border')).toBe('1px solid var(--fwe-line)');
    expect(declaration(hover, 'color')).toBe('var(--fwe-ink)');
  });

  it('drops the backdrop blur now that the popover surface is opaque', () => {
    // 底色已不透明，blur 零收益还占一个合成层。
    expect(ruleBody(css, '.fwe-rating-popover {')).not.toContain('backdrop-filter');
  });

  it('drops the detail facts rating row and its refresh button', () => {
    // 同一个 Steam % 曾同时出现在头部徽章和 facts 行。去重后 facts 行的
    // Rating 条目与它的刷新按钮都没有调用点了，规则不该继续发到用户手里。
    expect(css).not.toContain('fwe-fact--rating');
    expect(css).not.toContain('fwe-fact-refresh');
  });

  it('gives the primary popover action a real hover step', () => {
    const hover = ruleBody(css, '.fwe-rating-popover__btn--primary:hover:not(:disabled)');
    expect(declaration(hover, 'background')).toBe('var(--fwe-accent-hover) !important');
  });

  it('paints every rating surface from tokens instead of literals', () => {
    // 徽章/药丸/骨架屏/进度条都是「图形或文字浮在某个底色上」，写死一个
    // 浅色值在暗色下坏、写死一个深色值在浅色下坏。这里同时做两件事：
    // 禁止字面量，并要求每个颜色声明真的经由 var() / color-mix() 取值。
    //
    // 用 ruleBodiesFor 而不是 ruleBody：同一个类会先出现在 @media 的
    // 选择器列表里（例如 reduced-motion 的 `animation: none`），
    // 只取第一次命中会读到那条无关规则，让守卫空转。
    const surfaces = [
      '.fwe-rating-badge',
      '.fwe-rating-pill',
      '.fwe-rating-icon',
      '.fwe-rating-skeleton',
      '.fwe-rating--overwhelming',
      '.fwe-rating--positive',
      '.fwe-rating--mixed',
      '.fwe-rating--negative',
      '.fwe-rating-popover__bar-fill',
    ];

    for (const selector of surfaces) {
      const bodies = ruleBodiesFor(css, selector);
      expect(bodies.length, selector).toBeGreaterThan(0);
      const joined = bodies.join('\n');
      expect(joined, selector).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
      for (const value of colourValues(joined)) {
        if (value === 'transparent' || value === 'none' || value === 'currentColor') continue;
        expect(value, `${selector} → ${value}`).toMatch(/color-mix\(|var\(--fwe-/);
      }
    }
  });
});

describe('Post navigation', () => {
  it('drops the theme card frame and keeps a hairline separator', () => {
    // 主题把上一篇/下一篇包成一张卡片；详情页里它只是正文末尾的一行导航。
    // 改回 box-shadow / border-radius / background 就等于把卡片又装回去了。
    const body = ruleBody(css, "html[data-fwe-mode='enhanced'] #content > .post-navigation {");
    expect(body).not.toBe('');
    expect(declaration(body, 'max-width')).toBe('none');
    expect(declaration(body, 'border-top')).toBe('1px solid var(--fwe-line)');
    expect(body).not.toContain('box-shadow');
    expect(body).not.toContain('border-radius');
    expect(declaration(body, 'background')).toBe('');
  });

  it('clamps the title (not the label) to two lines by wrapping it in .fwe-nav-title', () => {
    // 标签与标题必须分块：clamp 落在整个 <a> 上时，标签白占第 1 行，标题只剩 1 行
    // 就被截断（用户报的「文字遮挡」）。改成标题包 .fwe-nav-title，clamp 只作用于它，
    // 标题独占 2 行；<a> 只负责 flex 排布，不再限高。
    const link = ruleBody(
      css,
      "html[data-fwe-mode='enhanced'] #content > .post-navigation .nav-links a {",
    );
    expect(link).not.toBe('');
    expect(link).not.toContain('-webkit-line-clamp');
    expect(link).not.toContain('overflow: hidden');

    const title = ruleBody(
      css,
      "html[data-fwe-mode='enhanced'] #content > .post-navigation .nav-links .fwe-nav-title {",
    );
    expect(title).not.toBe('');
    expect(declaration(title, '-webkit-line-clamp')).toBe('2');
    expect(title).toContain('-webkit-box-orient: vertical');
    expect(title).toContain('overflow: hidden');
  });
});

describe('Listing density', () => {
  it('keeps four filmstrip frames visible in the collapsed gallery', () => {
    const collapsed = ruleBody(
      css,
      "html[data-fwe-mode='enhanced'] .fwe-game-card .fwe-media:not([open]) .fwe-media__gallery",
    );
    expect(collapsed).not.toBe('');
    expect(declaration(collapsed, 'grid-template-columns')).toContain('repeat(4');
    // prettier 会把长选择器折成多行，故压掉空白再比对
    expect(css.replace(/\s+/g, ' ')).toContain(
      '.fwe-media:not([open]) .fwe-media__gallery > :nth-child(n + 5)',
    );
  });

  it('gives the card cover a fixed 3:4 box instead of drifting min/max heights', () => {
    const cover = ruleBody(css, "html[data-fwe-mode='enhanced'] .fwe-game-card .fwe-cover");
    expect(declaration(cover, 'aspect-ratio')).toBe('3 / 4');
    expect(cover).not.toContain('max-height');
    expect(cover).not.toContain('min-height');
  });

  it('keeps painting the collapsed filmstrip instead of the native blank box', () => {
    // Chromium 用 `::details-content { content-visibility: hidden }` 表达关闭的
    // <details>，不显式放开，折叠态的 4 格缩略图会被整块跳过绘制。
    const content = ruleBody(
      css,
      "html[data-fwe-mode='enhanced'] .fwe-game-card .fwe-media::details-content",
    );
    expect(declaration(content, 'content-visibility')).toBe('visible');
  });
});

describe('Footer popular grid', () => {
  it('scopes the footer popular grid to smaller single-row tiles', () => {
    const wide = ruleBody(
      css,
      "html[data-fwe-mode='enhanced'] .fwe-extras-block--wide .fwe-directory-grid",
    );
    expect(wide).not.toBe('');
    expect(declaration(wide, 'grid-template-columns')).toContain('minmax(6.5rem, 1fr)');
    // 目录页自己的网格保持原样
    expect(
      declaration(
        ruleBody(css, "html[data-fwe-mode='enhanced'] .fwe-directory-grid"),
        'grid-template-columns',
      ),
    ).toContain('minmax(9rem, 1fr)');
  });
});
