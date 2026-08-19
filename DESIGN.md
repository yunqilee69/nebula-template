# Nebula Web Design System

## 1. Atmosphere & Identity

Nebula Web is an operational middle-platform shell: calm, dense, and predictable, with Ant Design as the interaction language. The signature is token-driven workspace depth: navigation, headers, cards, drawers, and popovers inherit theme-aware Ant Design surfaces while Tailwind handles structural rhythm.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/layout | `--nebula-color-bg-layout` / `token.colorBgLayout` | `#f5f7fb` | AntD dark algorithm | App background |
| Surface/container | `--nebula-color-bg-container` / `token.colorBgContainer` | AntD token | AntD token | Header, sider, panels |
| Surface/elevated | `--nebula-color-bg-elevated` / `token.colorBgElevated` | AntD token | AntD token | Drawers, popovers, floating controls |
| Text/primary | `--nebula-color-text` / `token.colorText` | AntD token | AntD token | Body and labels |
| Text/secondary | `--nebula-color-text-secondary` / `token.colorTextSecondary` | AntD token | AntD token | Hints and metadata |
| Border/subtle | `--nebula-color-border` / `token.colorBorderSecondary` | AntD token | AntD token | Dividers and outlines |
| Accent/primary | `--nebula-color-primary` / `token.colorPrimary` | `#1677ff` | `#3c89ff` | Primary actions and active states |

### Rules
- Ant Design `ConfigProvider` tokens are the source of truth for theme-aware colors.
- `antd-style` consumes tokens directly for component surfaces, text, borders, radius, and shadows.
- CSS Modules may consume the `--nebula-*` aliases exposed on `:root`; do not hardcode theme colors in modules.
- Tailwind color utilities are reserved for non-theme-neutral cases only; prefer AntD tokens for surfaces and text.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| H1 | AntD Typography `level={1}` | AntD token | AntD token | AntD token | Rare page-level hero titles |
| H2 | AntD Typography `level={2}` | AntD token | AntD token | AntD token | Major sections |
| H3 | AntD Typography `level={3}` | AntD token | AntD token | AntD token | Page and card titles |
| Body | `token.fontSize` | 400 | AntD token | 0 | Default UI copy |
| Body/sm | AntD secondary text | 400 | AntD token | 0 | Captions and helper text |

### Font Stack
- Primary: Ant Design default font stack from the active theme.
- Mono: Browser monospace stack only for code-like identifiers.
- Serif: Not used.

### Rules
- Use Ant Design Typography components for semantic text where possible.
- Body text should not fall below the active AntD `fontSize` unless the component API owns the density.

## 4. Spacing & Layout

### Base Unit

All spacing follows Ant Design's 4px-derived token scale (`paddingXXS` through `paddingLG`, `marginXXS` through `marginLG`) and Tailwind's structural utilities.

| Token | Value | Usage |
|-------|-------|-------|
| `token.paddingXS` / `gap-2` | 8px | Tight inline groups |
| `token.paddingSM` / `gap-3` | 12px | Compact rows |
| `token.padding` / `gap-4` | 16px | Default content padding |
| `token.paddingMD` / `gap-5` | 20px | Toolbars and table controls |
| `token.paddingLG` / `gap-6` | 24px | Cards, drawers, page sections |

### Grid
- App shell: fixed sider + fixed header/tabs + scroll-owned content area.
- Height: use `dvh` for viewport shells; avoid `vh`/`h-screen` in full-height app surfaces.
- Breakpoints: Tailwind defaults unless a component requires Ant Design responsive APIs.

### Rules
- Tailwind owns layout primitives: `flex`, `grid`, sizing, min-height, overflow, alignment, and simple spacing.
- `antd-style` owns theme-aware values and token-derived component styling.
- CSS Modules own complex isolated selectors and third-party wrappers that do not need token computation.

## 5. Components

### NebulaProvider Theme Bridge
- **Structure**: `NebulaProvider` → `ConfigProvider` → `StyleProvider` → `antd-style ThemeProvider` → `AntdApp`.
- **Variants**: `light`, `dark`, and consumer-supplied `lightTheme` / `darkTheme` overrides.
- **Spacing**: not visual; exposes global theme aliases.
- **States**: updates when `useThemeStore.mode` changes.
- **Accessibility**: synchronizes `color-scheme` so native controls follow the active theme.
- **Motion**: none.
- **Layout**: global provider boundary.

### App Shell
- **Structure**: Ant Design `Layout` with sticky sider, header, route tabs, and scroll-owned content.
- **Variants**: expanded/collapsed sider, editable route tabs, content-only layout.
- **Spacing**: AntD token padding plus Tailwind structural utilities.
- **States**: hover/focus/active states come from Ant Design components and token styles.
- **Accessibility**: `navigation`, `main`, breadcrumb labels, tab labels, and explicit collapse button labels.
- **Motion**: Ant Design component motion only.
- **Layout**: fixed shell with `100dvh`, `min-height: 0`, and content scroll ownership.

### Auth Shell
- **Structure**: centered full-height container with Ant Design `Card` and brand heading.
- **Variants**: login, register, loading, fallback alert states.
- **Spacing**: Tailwind centering plus AntD token padding/margins.
- **States**: form states owned by Ant Design controls.
- **Accessibility**: semantic form controls, visible heading, native color scheme.
- **Motion**: Ant Design feedback only.
- **Layout**: `min-h-dvh` centered cluster.

### External Iframe Page
- **Structure**: isolated CSS Module wrapping a full-size iframe.
- **Variants**: consumer-provided title and source.
- **Spacing**: CSS Module intrinsic sizing only.
- **States**: none.
- **Accessibility**: required iframe title.
- **Motion**: none.
- **Layout**: CSS Module isolation for third-party content.

### NebulaProTable
- **Structure**: Nebula wrapper around ProComponents `ProTable`, scoped by `.nebula-pro-table-wrapper` so native Ant Design tables keep their own sizing.
- **Variants**: backend-paginated list tables with optional toolbar, built-in options, search, horizontal scroll, and pagination.
- **Spacing**: inherits Ant Design ProTable/Card spacing; layout CSS only establishes flex fill and scroll ownership.
- **States**: loading, empty, short-data, and long-data states remain Ant Design-owned.
- **Accessibility**: row-area scrolling must stay inside the table body so shell header, filters, toolbar, and pagination remain reachable and predictable.
- **Motion**: Ant Design component motion only.
- **Layout**: fills the remaining shell content height with `min-height: 0`; the table body owns vertical scrolling while pagination stays fixed at the bottom of the table region.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | AntD motion token | AntD easing token | Button, radio, menu, tab feedback |
| Standard | AntD motion token | AntD easing token | Drawer and dropdown transitions |
| Custom | Avoid unless documented here first | GPU-composited only | Future shell-specific interactions |

### Rules
- Prefer Ant Design component motion.
- New custom motion must animate only `transform`, `opacity`, or `filter` and respect `prefers-reduced-motion`.
- Do not add decorative motion without a state or navigation purpose.

## 7. Depth & Surface

### Strategy

Mixed, token-driven depth.

| Level | Token | Usage |
|-------|-------|-------|
| Subtle border | `token.colorBorderSecondary` / `--nebula-color-border` | Sider, header, tabs, lists |
| Container fill | `token.colorBgContainer` / `--nebula-color-bg-container` | Primary panels |
| Elevated fill | `token.colorBgElevated` / `--nebula-color-bg-elevated` | Drawers, popovers, floating controls |
| Secondary shadow | `token.boxShadowSecondary` / `--nebula-shadow-secondary` | Cards and floating controls |

## 8. Accessibility Constraints & Accepted Debt

### Constraints
- WCAG target: 2.2 AA for contrast, keyboard reachability, visible focus states, and screen-reader labels.
- Theme switching must update Ant Design tokens, antd-style styles, document `color-scheme`, and `data-nebula-theme` together.
- Native controls must follow the active theme through `color-scheme`.
- Route/page styles must not rely on color alone to communicate status.

### Accepted Debt

| Item | Location | Why accepted | Owner / Exit |
|------|----------|--------------|--------------|
| Inline token styles remain in some legacy components | `src/components/ne-table`, `src/components/ne-tree`, auth pages | Existing behavior is token-based and safe, but should be migrated incrementally to `antd-style` when touched | Next component-level refactor |
