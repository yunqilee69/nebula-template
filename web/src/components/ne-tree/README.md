# NeTree

NeTree is a reusable tree panel for selecting hierarchical resources such as organizations, roles, menus, and permission groups. It renders a compact tree with an optional title action area, optional search, and built-in expand/collapse controls for parent nodes.

## When to Use

Use NeTree when a page needs to filter or navigate data by a hierarchy:

- Organization trees beside user or organization tables
- Role trees beside role member or permission assignment views
- Menu/resource trees beside button or permission tables
- Any left-side tree + right-side table CRUD layout

If you only need a raw Ant Design tree with no panel chrome, title, search, or normalized selection callback, use Ant Design's `Tree` directly.

## Supported Props

### `title`

- **Type:** `ReactNode`
- **Required:** No
- **Behavior:** Renders the tree panel title. Pass `null` with `extra={null}` to hide the title row.

### `dataSource`

- **Type:** `NeTreeNode[]`
- **Required:** Yes
- **Behavior:** Provides the tree nodes. Each node supports `key`, `title`, `searchText`, `children`, `disabled`, `icon`, `tag`, and `actions`.

### `selectedKey`

- **Type:** `string`
- **Default:** `undefined`
- **Behavior:** Controls the selected node key from the parent component. When this prop is provided, selection is fully controlled by the caller.

### `defaultSelectedKey`

- **Type:** `string`
- **Default:** `undefined`
- **Behavior:** Sets the initial selected node for uncontrolled usage.

### `expandedKeys`

- **Type:** `string[]`
- **Default:** `undefined`
- **Behavior:** Controls which parent nodes are expanded. When provided, expansion is controlled by the caller.

### `defaultExpandedKeys`

- **Type:** `string[]`
- **Default:** All parent nodes are expanded
- **Behavior:** Sets initial expanded parent nodes for uncontrolled usage.

### `extra`

- **Type:** `ReactNode`
- **Default:** `undefined`
- **Behavior:** Renders content on the right side of the title row, such as a count tag or small action.
- **Note:** Pass `null` with `title={null}` to hide the title row.

### `searchable`

- **Type:** `boolean`
- **Default:** `false`
- **Behavior:** Shows a keyword input above the tree. Search matches `searchText` when provided, otherwise node titles, and keeps matching ancestors visible.

### `searchPlaceholder`

- **Type:** `string`
- **Default:** `搜索`
- **Behavior:** Placeholder text for the search input.

### `emptyText`

- **Type:** `ReactNode`
- **Default:** `暂无数据`
- **Behavior:** Empty state content when no nodes match.

### `className`

- **Type:** `string`
- **Default:** `undefined`
- **Behavior:** Adds a class to the root panel.

### `style`

- **Type:** `CSSProperties`
- **Default:** `undefined`
- **Behavior:** Adds inline style to the root panel.

### `onSelect`

- **Type:** `(key: string, node: NeTreeNode) => void`
- **Default:** `undefined`
- **Behavior:** Called when a selectable node is clicked. Disabled nodes do not fire selection.

### `onExpand`

- **Type:** `(expandedKeys: string[]) => void`
- **Default:** `undefined`
- **Behavior:** Called when a parent node is expanded or collapsed.

## Node Shape

```ts
interface NeTreeNode {
  key: string;
  title: string;
  searchText?: string;
  children?: NeTreeNode[];
  disabled?: boolean;
  icon?: ReactNode;
  tag?: ReactNode;
  actions?: ReactNode;
}
```

## Usage Examples

### Organization filter tree

```tsx
import { Tag } from 'antd';
import { NeTree, type NeTreeNode } from 'nebula-web';

const organizationTree: NeTreeNode[] = [
  {
    key: 'all',
    title: '全部组织',
    tag: <Tag color="blue">全部</Tag>,
    children: [
      {
        key: 'rnd',
        title: '研发中心',
        children: [
          { key: 'platform', title: '平台工程组' },
          { key: 'product', title: '产品体验组' },
        ],
      },
    ],
  },
];

<NeTree
  title="按组织过滤"
  dataSource={organizationTree}
  defaultSelectedKey="all"
  searchable
  searchPlaceholder="搜索组织"
  extra={<Tag>5 个节点</Tag>}
  onSelect={(organizationId) => {
    // Pass organizationId into NeTable request params.
  }}
/>
```

### Controlled role tree

```tsx
import { NeTree } from 'nebula-web';

<NeTree
  title="角色树"
  dataSource={roleTree}
  selectedKey={selectedRoleId}
  expandedKeys={expandedRoleIds}
  onSelect={setSelectedRoleId}
  onExpand={setExpandedRoleIds}
/>
```
