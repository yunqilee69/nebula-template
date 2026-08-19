# Project Coding Guidelines

## Project Overview

Nebula Web is a **React middle-platform template project** built on Ant Design and React Router. Projects fork this repository directly and develop on top of it, similar to Ant Design Pro's template approach.

### Development Workflow

1. **Fork this repository** to start a new project
2. **Add pages and components** in the appropriate directories
3. **Modify business features** as needed (services, types, pages)
4. **Pull upstream updates** when the template is enhanced

---

## Directory Organization Principles

### Layer Architecture

The `src/` directory is organized by functional layers. Understanding these layers helps you know what to modify and what to preserve:

```
src/
├── [Framework Layer]     # Core infrastructure - rarely modified
│   ├── request/          # HTTP client
│   ├── route/            # Router & menu system
│   ├── i18n/             # Internationalization
│   ├── stores/           # Global state stores (Zustand)
│   ├── hooks/            # Shared React hooks
│   ├── providers/        # Top-level provider composition
│   │   ├── nebula-provider.tsx
│   │   ├── theme-provider.tsx
│   │   ├── login-badge-provider.tsx
│   │   ├── brand-context.tsx
│   │   ├── notice.tsx
│   │   ├── themes.ts
│   │   └── tokens.ts
│   └── utils/            # Shared utility functions
│       ├── permissions.ts
│       ├── icons.tsx
│       └── auth/
│
├── [Application Layer]   # Business features - freely modified
│   ├── pages/            # Route pages
│   ├── services/         # API services
│   ├── components/       # Shared components (including Access, SessionExpiredModal)
│   ├── layouts/          # Layout components
│   ├── types/            # Type definitions (including auth.ts)
│   ├── constants/        # Business constants
│   ├── enums/            # Business enums
│   └── assets/           # Static assets
│       └── icons/svg/    # SVG icon files
│
└── [Development Layer]   # Dev-only files
    ├── test/             # Test utilities
    └── styles/           # Global CSS entry
```

### Framework Layer (Core Infrastructure)

These directories provide foundational capabilities. **Modify only when necessary**:

| Directory | Purpose | When to Modify |
|-----------|---------|----------------|
| `request/` | HTTP client with token refresh, error handling | Change auth flow, add interceptors |
| `route/` | Router creation, menu-route mapping | Add route guards, change routing strategy |
| `i18n/` | Internationalization | Add new locales |
| `stores/` | Zustand state stores (auth, theme, locale) | Add new global state |
| `hooks/` | Shared React hooks | Add new shared hooks |
| `providers/` | Top-level provider composition (NebulaProvider, ThemeProvider, brand, notice) | Customize provider behavior |
| `utils/` | Shared utility functions (permissions, icons, auth helpers) | Add new utilities |

### Application Layer (Business Features)

These directories contain business logic. **Freely modify based on project needs**:

| Directory | Purpose | Typical Modifications |
|-----------|---------|----------------------|
| `pages/` | Route page components | Add/remove/modify pages |
| `services/` | API service modules | Add/remove API methods |
| `components/` | Cross-page reusable components (including `<Access>`, `<SessionExpiredModal>`) | Add/remove/modify components |
| `layouts/` | Page layout components | Customize layouts |
| `types/` | Shared type definitions (including `auth.ts`) | Add/remove/modify types |
| `constants/` | Business constants | Add/remove constants |
| `enums/` | Business enums | Add/remove enums |
| `assets/` | Static assets (SVG icons, images, fonts) | Add/remove assets |

### Development Layer

| Directory | Purpose |
|-----------|---------|
| `test/` | Test utilities, mocks - not part of production build |
| `styles/` | Global CSS entry - bundled into final output |

---

## Files at `src/` Root

Keep root files minimal:

- `index.ts` - Public API exports (can be removed if not needed as library)
- `main.tsx` - Development app entry (`npm run dev`)
- `index.tsx` - Development HTML mount point
- `*.test.ts(x)` - Test files for root modules

**Do NOT place configuration files at root** (see Environment Configuration below).

---

## React Hooks Organization

When adding or moving React hooks, keep hook placement intentional and consistent:

- Put shared, cross-page hooks in `src/hooks/`.
  - Examples: `useTheme`, `useLocale`, `useMediaQuery`, `useMounted`, `useDebounce`.
- Put feature-specific hooks next to the feature that owns them.
  - Example: `src/pages/user/hooks/use-user-profile.ts` for user-profile-only logic.
- Do not place business-only hooks in the global hooks directory just because they are hooks.
- Theme switching and language switching are app-wide concerns, so their hooks should live in `src/hooks/`.
- If a hook is a small wrapper around a provider or context, keep the provider and hook paired by purpose:
  - Provider: `src/providers/theme-provider.tsx`
  - Hook: `src/hooks/use-theme.ts`
- Prefer kebab-case file names and camelCase hook exports:
  - File: `src/hooks/use-theme.ts`
  - Export: `useTheme`

Before creating a new hook, check whether a shared hook already exists in `src/hooks/` or a page-level `hooks/` directory. Reuse or extend existing hooks when it preserves clear ownership.

### Hook Comments

Keep hook comments sparse and purposeful:

- Do not comment obvious React or store operations, such as simple selectors, setters, or returned fields.
- Add comments only when they explain a non-obvious boundary, compatibility decision, browser/runtime constraint, or business rule.
- Prefer clear names over comments. If a comment only repeats the function name or implementation, remove it.
- For compatibility re-exports, a short comment is acceptable only when developers need migration context.

---

## Page and Business Resource Organization

Keep route pages, page-private components, and reusable business resources separated by ownership.

### Pages

- Put route pages under `src/pages/`.
- Route pages must use directory entries with `index.tsx`; do not put route page components directly in `src/pages/*.tsx`.
- Page directory paths map directly to hash routes:
  - `src/pages/dashboard/index.tsx` -> `host/#/dashboard`
  - `src/pages/auth/user/index.tsx` -> `host/#/auth/user`
- Keep the page test beside the route entry as `index.test.tsx`.
  - Example: `src/pages/login/index.tsx` and `src/pages/login/index.test.tsx`.
- Put page-private components under the owning page directory.
  - Example: `src/pages/auth/user/components/user-table.tsx`
- When a page-private component is an expected replacement boundary, keep it directly beside the page entry instead of burying it under `components/`.
  - Example: `src/pages/auth/role/index.tsx` and `src/pages/auth/role/role-form-modal.tsx`.
  - Use this for page-owned modals, forms, drawers, and panels.
- Do not import private files from another page directory. If something is reused across pages, move it to a shared directory first.

### Components

Keep shared component directories focused on one reusable base component each.

- Put cross-page reusable components in `src/components/`.
- Use one directory per base component.
  - Example: `src/components/data-table/`
- Keep the component props and component-only related types in a separate file inside the component directory.
  - Example: `src/components/data-table/data-table.types.ts`
- If a type is reused globally or shared across business domains, define it in `src/types/` instead of the component directory.
- Add a `README.md` to every component directory. The README should explain:
  - What the component does and when to use it.
  - All supported props.
  - The purpose and behavior of each prop.
  - Usage examples that cover common scenarios.
- Add tests for every shared component. Cover the important usage scenarios, prop combinations, and edge cases so the documented behavior and actual behavior stay aligned.

### Styling and Theme Support

All UI styles must support light/dark theme switching through Ant Design tokens.

- Treat Ant Design `ConfigProvider` theme tokens as the source of truth for colors, shadows, radius, typography, and component-aware spacing.
- Use `antd-style` for component styles that depend on theme tokens.
  - Prefer `createStyles(({ token }) => ({ ... }))` over hardcoded color, background, border, shadow, or radius values.
  - Do not duplicate light/dark branching in component code when the same result can come from tokens.
- Use Tailwind CSS utilities for structural layout and common spacing only.
  - Good: `flex`, `grid`, `h-full`, `min-h-0`, `items-center`, `justify-center`.
  - Avoid Tailwind hardcoded color utilities for surfaces/text that should follow Ant Design theme tokens.
- Use CSS Modules for component-local style isolation, especially for complex selectors, iframe/canvas wrappers, pseudo states, or non-token structural CSS.
  - File names must be `*.module.css` and colocated with the owning component.
- Avoid new broad global CSS. The global stylesheet should stay limited to Tailwind import, document/root defaults, and unavoidable app-wide resets.
- Avoid new inline `style={{ ... }}` for theme-aware styles. Inline styles are acceptable only for one-off dynamic geometry or third-party component APIs where class/style extraction would reduce clarity.

### Business Resources

Place reusable business resources in directories that are siblings of `src/pages/`, not inside page directories:

```text
src/
├── pages/          # Route pages; paths map to hash routes
├── services/       # Business and page API requests
├── types/          # Shared business type definitions
├── enums/          # Shared business enums
├── constants/      # Shared business constants
├── components/     # Cross-page reusable components
├── hooks/          # Cross-page reusable hooks
└── utils/          # Shared utilities
```

- Put API request modules in `src/services/`, grouped by business domain.
  - Example: `src/services/user.ts`
- Put shared business types in `src/types/`.
  - Example: `src/types/user.ts`
- Put shared enums in `src/enums/`.
  - Example: `src/enums/user.ts`
- Put shared constants in `src/constants/`.
  - Example: `src/constants/user.ts`
- Keep page directories focused on rendering and page-specific composition. Cross-module API methods, enums, constants, and types belong in the shared sibling directories above.

---

## Environment Configuration

### Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| `.env` | Project root | Default environment variables |
| `.env.local` | Project root | Local overrides (git-ignored) |

### Target Structure

```
nebula-web/
├── .env                    # Default environment variables
├── .env.local              # Local overrides (git-ignored)
├── vite.config.ts
├── src/
│   └── ... (no config files)
```

### Environment Variables

Use `.env` files for all configurable values, including development proxy:

```env
# .env
VITE_API_BASE_URL=http://localhost:9999
```

In `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:9999',
        changeOrigin: true,
      },
    },
  },
  // ...
});
```

### Rules for Configuration Files

1. **All config** → project root, not `src/`
2. **Environment variables** → `.env` files (VITE_ prefix for Vite)
3. **Build config** → project root (e.g., `vite.config.ts`, `tsconfig.json`)
4. **Never mix config with source code** under `src/`

### What NOT to Put in `src/`

- Environment configuration files (`.env`, `.env.local`)
- Development server configuration
- Build tool configuration
- CI/CD configuration
- Editor configuration
- Any file not part of the application source code