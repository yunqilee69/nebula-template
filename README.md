# Nebula Web

Nebula Web is a React middle-platform shell package built on Ant Design and React Router. Consumers wrap their app with `NebulaProvider`, then render either `NebulaLayout` directly or a router created by `createNebulaRouter`.

## Brand configuration

Brand information is an app startup concern. Package consumers should provide overrides through `NebulaProvider` before rendering the app:

```tsx
import { NebulaProvider, createNebulaRouter } from 'nebula-web';
import { RouterProvider } from 'react-router-dom';
import { AcmeLogo } from './acme-logo';

const router = createNebulaRouter({
  routes,
  menuItems,
});

export function App() {
  return (
    <NebulaProvider
      brand={{
        name: 'Acme Console',
        title: 'Acme Console',
        logo: <AcmeLogo />,
        faviconHref: '/favicon.svg',
      }}
    >
      <RouterProvider router={router} />
    </NebulaProvider>
  );
}
```

### Brand fields

| Field | Purpose | Fallback |
| --- | --- | --- |
| `name` | Brand name shown by `NebulaLayout` when no local `title` is provided. | `Nebula Web` |
| `title` | Browser tab title synchronized by `NebulaProvider`. | `name` |
| `logo` | Brand logo shown by `NebulaLayout` when no local `logo` is provided. | Built-in placeholder icon |
| `faviconHref` | Browser favicon link href synchronized by `NebulaProvider`. | Existing page favicon remains unchanged |

`createNebulaRouter` does not accept brand configuration. It only owns route and menu creation. The `NebulaLayout` rendered by the router reads brand defaults from the surrounding `NebulaProvider` context.

## Local layout overrides

For one-off shells, `NebulaLayout` can still override the provider defaults locally:

```tsx
<NebulaProvider brand={{ name: 'Acme Console', logo: <AcmeLogo /> }}>
  <NebulaLayout title="Operations Console" logo={<OpsLogo />} menuItems={menuItems}>
    <Routes>{/* pages */}</Routes>
  </NebulaLayout>
</NebulaProvider>
```

Use local `title` and `logo` only when that layout instance should intentionally differ from the app-wide startup brand.

## Minimal provider setup

```tsx
import { NebulaProvider } from 'nebula-web';

export function AppRoot() {
  return (
    <NebulaProvider>
      <App />
    </NebulaProvider>
  );
}
```

Without `brand`, Nebula Web uses its built-in defaults.
