# OrgSelect

OrgSelect 是一个弹窗式的组织选择组件，支持单选和多选模式。组件左侧显示组织树用于导航，右侧显示带搜索的分页表格用于选择。

## 使用场景

- 用户管理页面按组织筛选用户
- 权限配置页面选择组织范围
- 表单中选择所属组织
- 任何需要从组织列表中选择一个或多个组织的场景

## 支持的 Props

### `open`

- **类型:** `boolean`
- **必填:** 是
- **说明:** 控制弹窗的显示状态

### `title`

- **类型:** `string`
- **默认值:** 组织管理（从 i18n 获取）
- **说明:** 弹窗标题

### `mode`

- **类型:** `'single' | 'multiple'`
- **默认值:** `'single'`
- **说明:** 选择模式，单选或多选

### `value`

- **类型:** `string | string[]`
- **默认值:** `undefined`
- **说明:** 当前选中的组织 ID（单选时为 string，多选时为 string[]）

### `treeData`

- **类型:** `OrgTreeResp[]`
- **必填:** 是
- **说明:** 组织树数据，用于左侧树形导航

### `orgList`

- **类型:** `OrgOptionResp[]`
- **必填:** 是
- **说明:** 组织列表，用于显示选中项名称

### `placeholder`

- **类型:** `string`
- **默认值:** 从 i18n 获取
- **说明:** 输入框占位文本

### `disabled`

- **类型:** `boolean`
- **默认值:** `false`
- **说明:** 是否禁用

### `onChange`

- **类型:** `(value: string | string[] | undefined, orgs: OrgResp[] | OrgOptionResp[]) => void`
- **默认值:** `undefined`
- **说明:** 选中项变化时的回调函数

### `onClose`

- **类型:** `() => void`
- **必填:** 是
- **说明:** 弹窗关闭时的回调函数

### `service`

- **类型:** `{ pageOrgs: (params) => Promise<{ data: OrgResp[]; total: number }> }`
- **必填:** 是
- **说明:** 分页查询组织的服务接口

## 使用示例

### 单选模式

```tsx
import { OrgSelect } from '@/components/org-select';
import type { OrgTreeResp, OrgOptionResp } from '@/types/auth-management';

function UserFilter() {
  const [open, setOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>();
  const [orgTree, setOrgTree] = useState<OrgTreeResp[]>([]);
  const [orgs, setOrgs] = useState<OrgOptionResp[]>([]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>选择组织</Button>
      <OrgSelect
        open={open}
        mode="single"
        value={selectedOrgId}
        treeData={orgTree}
        orgList={orgs}
        service={{
          pageOrgs: async (params) => {
            const result = await authService.pageOrgs(params);
            return { data: result.data, total: result.total };
          },
        }}
        onChange={(value) => setSelectedOrgId(value as string)}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
```

### 多选模式

```tsx
<OrgSelect
  open={open}
  mode="multiple"
  value={selectedOrgIds}
  treeData={orgTree}
  orgList={orgs}
  service={orgService}
  onChange={(value) => setSelectedOrgIds(value as string[])}
  onClose={() => setOpen(false)}
/>
```

### 在 ProTable 搜索表单中使用

```tsx
const columns = [
  {
    title: '组织',
    dataIndex: 'orgId',
    renderFormItem: () => (
      <Space.Compact style={{ width: '100%' }}>
        <Input
          readOnly
          placeholder="选择组织"
          value={selectedOrgName}
          onClick={() => setOrgSelectOpen(true)}
        />
        {selectedOrgId && (
          <Button onClick={() => setSelectedOrgId(undefined)}>
            清除
          </Button>
        )}
      </Space.Compact>
    ),
  },
];
```