# DictSelect

字典选择器组件，根据字典编码自动加载字典项数据并渲染为下拉选择器。

## 使用场景

- 表单中选择字典项
- 表格筛选条件中的字典下拉框
- 任何需要从字典数据中选择一个或多个值的场景

## 组件列表

### DictSelect

字典下拉选择器组件。

### DictLabel

字典标签显示组件，根据字典项值显示对应的名称和颜色标签。

### useDictItems

字典数据加载 Hook，用于需要灵活处理字典数据的场景。

## Props

### DictSelect Props

| 属性 | 类型 | 默认值 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `dictCode` | `string` | - | 是 | 字典编码，用于请求字典数据 |
| `mode` | `'single' \| 'multiple'` | `'single'` | 否 | 选择模式，单选或多选 |
| `value` | `string \| string[]` | - | 否 | 当前选中的值（受控模式） |
| `onChange` | `(value: string \| string[] \| undefined) => void` | - | 否 | 值变化时的回调函数 |
| `showDisabled` | `boolean` | `true` | 否 | 是否显示禁用的选项 |
| `flatten` | `boolean` | `true` | 否 | 是否将父子字典项扁平化显示 |
| `placeholder` | `string` | - | 否 | 占位文本 |
| `disabled` | `boolean` | `false` | 否 | 是否禁用 |
| `allowClear` | `boolean` | `true` | 否 | 是否支持清除 |

此外，支持 Ant Design Select 的其他属性透传。

### DictLabel Props

| 属性 | 类型 | 默认值 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `dictCode` | `string` | - | 是 | 字典编码 |
| `value` | `string` | - | 是 | 字典项值 |
| `fallback` | `string` | - | 否 | 值不存在时显示的文本，默认显示原值 |
| `showTag` | `boolean` | `true` | 否 | 是否显示为 Tag 标签 |
| `className` | `string` | - | 否 | 自定义类名 |

### useDictItems 返回值

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `options` | `DictSelectOption[]` | 字典项选项列表（已转换为 Select 选项格式） |
| `items` | `readonly DictItemData[]` | 原始字典项数据 |
| `loading` | `boolean` | 加载状态 |
| `getItemByValue` | `(value: string) => DictItemData \| undefined` | 根据值获取字典项信息 |
| `getLabelByValue` | `(value: string) => string \| undefined` | 根据值获取显示名称 |

## 使用示例

### 基础用法

```tsx
import { DictSelect } from '@/components/dict-select';

function MyForm() {
  return (
    <Form>
      <Form.Item name="module" label="模块">
        <DictSelect dictCode="param_module" placeholder="请选择模块" />
      </Form.Item>
    </Form>
  );
}
```

### 多选模式

```tsx
<DictSelect
  dictCode="status"
  mode="multiple"
  placeholder="请选择状态"
/>
```

### 受控模式

```tsx
function MyComponent() {
  const [value, setValue] = useState<string>();

  return (
    <DictSelect
      dictCode="param_module"
      value={value}
      onChange={setValue}
    />
  );
}
```

### 隐藏禁用项

```tsx
<DictSelect
  dictCode="status"
  showDisabled={false}
/>
```

### 显示字典标签

```tsx
import { DictLabel } from '@/components/dict-select';

function StatusCell({ status }: { status: string }) {
  return <DictLabel dictCode="status" value={status} />;
}
```

### 仅显示文本（不带颜色）

```tsx
<DictLabel dictCode="status" value="active" showTag={false} />
```

### 使用 Hook 自定义处理

```tsx
import { useDictItems } from '@/components/dict-select';

function MyComponent() {
  const { options, loading, getLabelByValue } = useDictItems('status');

  // 自定义渲染逻辑
  const statusName = getLabelByValue('active');

  return (
    <div>
      {loading ? '加载中...' : (
        <select>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
```

## 父子字典项处理

当字典项存在父子关系时：

- `flatten={true}`（默认）：将所有层级的字典项扁平化为选项列表
- `flatten={false}`：仅显示顶级字典项

```tsx
// 扁平显示所有层级的字典项
<DictSelect dictCode="category" flatten />

// 仅显示顶级字典项
<DictSelect dictCode="category" flatten={false} />
```

## 注意事项

1. `dictCode` 为空时，组件不会发起请求，选项列表为空
2. 字典数据会在组件挂载时自动加载，无需手动触发
3. `DictLabel` 组件在加载中时会显示 Spin 加载状态
4. 字典项的 `tagColor` 字段会被映射到 Tag 的 `color` 属性