# Theming a site built on @leapsight/vitepress-template/theme

Branding a site never touches the shared theme. Everything happens in
the site's `.vitepress/theme/brand.css`, which loads after the theme's
neutral defaults (`theme/src/styles/vars.css`) and therefore wins.

Both VitePress's built-in components and the shared ones read the same
`--vp-*` custom properties, so overriding tokens re-brands the whole
site consistently — light and dark.

## The tokens that matter

### Brand accent

Used by links, active nav items, buttons, card accents, focus rings.

```css
:root {
  --vp-c-brand-1: #0a6880;   /* primary (text/links on light bg) */
  --vp-c-brand-2: #0891b2;   /* hover */
  --vp-c-brand-3: #084659;   /* solid backgrounds (buttons) */
  --vp-c-brand-soft: rgba(10, 104, 128, 0.14);  /* tinted backgrounds */
}
html.dark {
  --vp-c-brand-1: #06b6d4;   /* brighter variant for dark bg */
  /* ... */
}
```

### Substrate (backgrounds, text, borders)

```css
:root {
  --vp-c-bg / -alt / -elv / -soft / -mute
  --vp-c-text-1 / -2 / -3
  --vp-c-divider / -border / -gutter
}
```

Define both the `:root` (light) and `html.dark` blocks. If you skip
them, the neutral defaults apply.

### Semantic accents

```css
--vp-c-tip-1 / --vp-c-tip-soft          /* ::: tip */
--vp-c-warning-1 / --vp-c-warning-soft  /* ::: warning */
--vp-c-danger-1 / --vp-c-danger-soft    /* ::: danger, DRAFT watermark */
```

### Typography

```css
:root {
  --vp-font-family-base: 'Geist Variable', system-ui, sans-serif;
  --vp-font-family-mono: 'JetBrains Mono Variable', ui-monospace, monospace;
}
```

Font **loading** is the site's job — add `<link>` tags via `head` in
`config.ts` (CDN) or self-host under `public/`. Keep real fallback
stacks so the site stays legible if the webfont fails.

### Navbar logo

```css
:root {
  --vp-nav-logo-height: 48px;  /* default 24px; raise for wordmarks */
}
```

Set `themeConfig.logo` to your mark (`{ light: ..., dark: ... }` for
per-scheme variants) and `siteTitle: false` if the wordmark already
carries the name.

## Beyond tokens

If a site needs structural CSS changes (not just colors/fonts), add
rules to `brand.css` — it's ordinary CSS loaded last. For new
components or layout slots, extend the theme instead of forking it:

```ts
// .vitepress/theme/index.ts
import Theme from '@leapsight/vitepress-template/theme'
import MyWidget from './MyWidget.vue'
import './brand.css'

export default {
  extends: Theme,
  enhanceApp({ app }) {
    app.component('MyWidget', MyWidget)
  }
}
```

Component-level knobs the shared CSS exposes:

- Tabs: add class `code` (`::: tabs code`) for the dark code-panel look.
- Buttons: `.ls-button` + `medium|big` + `brand|alt` combos.
- `<Pill color="...">` overrides the pill background per instance.

## Rules of thumb

- Never copy theme component files into a site to tweak them — extend
  or override with CSS; otherwise the site stops receiving fixes.
- Never hardcode hex colors in content or site CSS; reference tokens
  (`var(--vp-c-brand-1)`) so dark mode stays correct.
- Check both color schemes after changing tokens: the same accent
  rarely has enough contrast on both substrates — use a brighter
  variant in `html.dark`.
