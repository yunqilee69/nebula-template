# NebulaProTable

`NebulaProTable` is the Nebula adapter around Ant Design ProComponents `ProTable`.

Use it for backend paginated Nebula pages. Its `request` receives Nebula backend pagination fields:

- `pageNum`
- `pageSize`
- `orderName`
- `orderType`

The adapter maps ProTable `current`, `pageSize`, search params, and sorter into that backend shape, then maps Nebula `PageResp<T> { data, total }` back into ProTable `{ data, total, success }`.

```tsx
<NebulaProTable<UserResp, UserQuery>
  columns={columns}
  request={(params) => userService.pageUsers(params)}
/>
```

## Toolbar

By default, `NebulaProTable` keeps ProTable's built-in toolbar actions enabled:

- Custom buttons returned from `toolBarRender` are shown on the left.
- Built-in actions such as reload, density, fullscreen, and column settings are shown on the right.

When a table is embedded inside a form or another compact surface, pass `toolbar={false}` to hide the entire toolbar:

```tsx
<NebulaProTable<UserResp, UserQuery>
  toolbar={false}
  columns={columns}
  request={(params) => userService.pageUsers(params)}
/>
```
