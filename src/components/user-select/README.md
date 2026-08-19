# UserSelect

UserSelect 是一个弹窗式的用户选择组件，支持单选和多选模式。组件左侧显示组织树和角色筛选器，右侧显示带搜索的分页用户表格用于选择。

## 使用场景

- 权限配置页面选择用户
- 任务分配时选择用户
- 表单中选择关联用户
- 任何需要从用户列表中选择一个或多个用户的场景

## 支持的 Props

### `open`

- **类型:** `boolean`
- **必填:** 是
- **说明:** 控制弹窗的显示状态

### `title`

- **类型:** `string`
- **默认值:** 用户管理（从 i18n 获取）
- **说明:** 弹窗标题

### `mode`

- **类型:** `'single' | 'multiple'`
- **默认值:** `'single'`
- **说明:** 选择模式，单选或多选

### `value`

- **类型:** `string | string[]`
- **默认值:** `undefined`
- **说明:** 当前选中的用户 ID（单选时为 string，多选时为 string[]）

### `treeData`

- **类型:** `OrgTreeResp[]`
- **必填:** 是
- **说明:** 组织树数据，用于左侧树形导航和筛选

### `roles`

- **类型:** `RoleOptionResp[]`
- **必填:** 是
- **说明:** 角色列表，用于角色筛选下拉框

### `placeholder`

- **类型:** `string`
- **默认值:** 从 i18n 获取
- **说明:** 输入框占位文本

### `disabled`

- **类型:** `boolean`
- **默认值:** `false`
- **说明:** 是否禁用

### `onChange`

- **类型:** `(value: string | string[] | undefined, users: UserResp[]) => void`
- **默认值:** `undefined`
- **说明:** 选中项变化时的回调函数

### `onClose`

- **类型:** `() => void`
- **必填:** 是
- **说明:** 弹窗关闭时的回调函数

### `service`

- **类型:** `{ pageUsers: (params) => Promise<{ data: UserResp[]; total: number }> }`
- **必填:** 是
- **说明:** 分页查询用户的服务接口

## 使用示例

### 单选模式

```tsx
import { UserSelect } from '@/components/user-select';
import type { OrgTreeResp, RoleOptionResp } from '@/types/auth-management';

function TaskAssign() {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>();
  const [orgTree, setOrgTree] = useState<OrgTreeResp[]>([]);
  const [roles, setRoles] = useState<RoleOptionResp[]>([]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>选择用户</Button>
      <UserSelect
        open={open}
        mode="single"
        value={selectedUserId}
        treeData={orgTree}
        roles={roles}
        service={{
          pageUsers: async (params) => {
            const result = await authService.pageUsers(params);
            return { data: result.data, total: result.total };
          },
        }}
        onChange={(value) => setSelectedUserId(value as string)}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
```

### 多选模式

```tsx
<UserSelect
  open={open}
  mode="multiple"
  value={selectedUserIds}
  treeData={orgTree}
  roles={roles}
  service={userService}
  onChange={(value) => setSelectedUserIds(value as string[])}
  onClose={() => setOpen(false)}
/>
```

## 特性

- 左侧组织树支持搜索和层级导航
- 左侧角色筛选器可按角色过滤用户
- 右侧表格支持用户名搜索
- 支持分页加载，性能优良
- 单选模式使用 Radio，多选模式使用 Checkbox