# OrgTree

OrgTree is a reusable organization tree component that wraps `NeTree` with organization-specific business logic. It provides a pre-configured tree panel for displaying and selecting organizations with status tags, icons, and search functionality.

## When to Use

Use OrgTree when you need to display an organization hierarchy for filtering or navigation:

- Organization management pages (left-side tree + right-side table layout)
- User management pages (filter users by organization)
- Permission assignment pages (select organization scope)
- Any page that needs organization-based filtering

If you need a generic tree without organization-specific features, use `NeTree` or Ant Design's `Tree` directly.

## Supported Props

### `dataSource`

- **Type:** `OrgTreeResp[]`
- **Required:** Yes
- **Behavior:** Provides the organization tree data from API response.

### `selectedKey`

- **Type:** `string`
- **Default:** `undefined`
- **Behavior:** Controls the selected organization ID from the parent component.

### `defaultSelectedKey`

- **Type:** `string`
- **Default:** `undefined`
- **Behavior:** Sets the initial selected organization for uncontrolled usage.

### `expandedKeys`

- **Type:** `string[]`
- **Default:** `undefined`
- **Behavior:** Controls which parent nodes are expanded.

### `defaultExpandedKeys`

- **Type:** `string[]`
- **Default:** All parent nodes are expanded
- **Behavior:** Sets initial expanded parent nodes for uncontrolled usage.

### `title`

- **Type:** `ReactNode`
- **Default:** Organization tree title from i18n
- **Behavior:** Renders the tree panel title. Pass `null` with `extra={null}` to hide the header row.

### `extra`

- **Type:** `ReactNode`
- **Default:** Root organization count tag
- **Behavior:** Renders content on the right side of the title row. Pass `null` with `title={null}` to hide the header row.

### `extraRootNodes`

- **Type:** `NeTreeNode[]`
- **Default:** `[]`
- **Behavior:** Prepends virtual records before root organizations, such as an unassigned-users entry.

### `renderNodeActions`

- **Type:** `(org: OrgTreeResp, isRoot: boolean) => ReactNode`
- **Default:** `undefined`
- **Behavior:** Renders controls at the right side of each organization node. `isRoot` is true for top-level organizations only.

### `searchable`

- **Type:** `boolean`
- **Default:** `true`
- **Behavior:** Shows a keyword input above the tree.

### `searchPlaceholder`

- **Type:** `string`
- **Default:** Search placeholder from i18n
- **Behavior:** Placeholder text for the search input.

### `emptyText`

- **Type:** `ReactNode`
- **Default:** Empty text from i18n
- **Behavior:** Empty state content when no organizations exist.

### `showStatusTags`

- **Type:** `boolean`
- **Default:** `true`
- **Behavior:** Whether to show status tags (enabled/disabled) for each organization.

### `className`

- **Type:** `string`
- **Default:** `undefined`
- **Behavior:** Adds a class to the root panel.

### `style`

- **Type:** `CSSProperties`
- **Default:** `{ minHeight: 360, height: '100%' }`
- **Behavior:** Adds inline style to the root panel.

### `onSelect`

- **Type:** `(orgId: string, org: OrgTreeResp) => void`
- **Default:** `undefined`
- **Behavior:** Called when an organization or virtual node is selected. `org` is `undefined` for virtual nodes from `extraRootNodes`.

### `onExpand`

- **Type:** `(expandedKeys: string[]) => void`
- **Default:** `undefined`
- **Behavior:** Called when nodes are expanded or collapsed.

## Usage Examples

### Basic organization tree

```tsx
import { OrgTree } from '@/components/org-tree';
import type { OrgTreeResp } from '@/types/auth-management';

function OrganizationPage() {
  const [tree, setTree] = useState<OrgTreeResp[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>();

  return (
    <OrgTree
      dataSource={tree}
      selectedKey={selectedOrgId}
      onSelect={(id) => setSelectedOrgId(id)}
    />
  );
}
```

### Controlled expansion

```tsx
import { OrgTree } from '@/components/org-tree';

<OrgTree
  dataSource={orgTree}
  selectedKey={selectedOrgId}
  expandedKeys={expandedKeys}
  onSelect={handleSelect}
  onExpand={setExpandedKeys}
/>
```

### Without status tags

```tsx
<OrgTree
  dataSource={orgTree}
  showStatusTags={false}
  onSelect={handleSelect}
/>
```

### Custom title and empty state

```tsx
<OrgTree
  dataSource={orgTree}
  title="Select Organization"
  emptyText="No organizations available"
  onSelect={handleSelect}
/>
```
