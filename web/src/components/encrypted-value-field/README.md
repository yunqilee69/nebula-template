# EncryptedValueField

`EncryptedValueField` 用于编辑「加密存储」的参数值。它只呈现「是否已配置」，密文与已存明文都不会进入输入框。

## 使用场景

- 参数中心编辑 `encrypted` 为真的参数值（`sys_param.is_encrypted = 1`）。
- 任何「服务端只回传已配置布尔值、明文只写不读」的机密字段表单。

## 数据流

组件不持有任何服务端值，只持有用户本次新输入的明文：

```
后端详情接口 ──► { encrypted, configured }        （密文/明文都不下发）
                     │
                     ▼
              EncryptedValueField ──► onChange({ kind, value? })
                     │                        │
        value={{ configured }}                 └──► 表单层翻译为请求体
                                                       keep  ⇒ 省略 paramValue（不修改）
                                                       set   ⇒ 提交新明文
                                                       clear ⇒ 提交空串
```

- `encrypted: true` 时详情接口的 `paramValue` 为 `null`，前端无从构造密文，因此也不存在「回显密文」的路径。
- 组件内部只保存用户输入：进入编辑态时输入框永远从空开始。

## 状态机

| 状态 | 条件 | 展示 |
| --- | --- | --- |
| 未配置 | `configured` 为假且未进入编辑态 | `未配置` + 「设置」按钮 |
| 已配置（只读） | `configured` 为真且未进入编辑态 | `已配置` + `****`（固定四位，不回显密文也不泄露长度） |
| 编辑中 | 点击「设置」/「修改」 | 空密码框 + 「留空则不修改」提示（未配置时不显示该提示） |
| 已输入 | 密码框非空 | 密码框带显隐切换，输入即上抛 `set` |
| 清除待确认 | 点击「清除」 | `Popconfirm` 二次确认后才上抛 `clear` |

`editing` 为假时只读展示：不渲染设置/修改/清除入口。

## Supported Props

| Prop | Type | Description |
| --- | --- | --- |
| `value` | `{ configured: boolean }` | 后端回传的「是否已配置」。只读，不含密文与明文。 |
| `editing` | `boolean` | 表单是否处于编辑态。默认 `false`，此时只读展示，不提供任何操作入口。 |
| `disabled` | `boolean` | 禁用输入与操作按钮。默认 `false`。 |
| `onChange` | `(e: EncryptedValueChange) => void` | 编辑意图变更时回调，见下。 |

`EncryptedValueChange`：

| 字段 | Type | Description |
| --- | --- | --- |
| `kind` | `'keep' \| 'set' \| 'clear'` | `keep` 表示不修改；`set` 表示提交新明文；`clear` 表示清除已配置的值。 |
| `value` | `string \| undefined` | 仅 `kind === 'set'` 时携带新的明文值。 |

回调时机：输入框内容非空 → `set`；输入框被清空或点击「取消」→ `keep`；二次确认清除 → `clear`。`keep` 与 `clear` 都不携带 `value`。

## 词条

组件文案取自参数中心词条（`system.config.param.*`），中英文键由 `NebulaParamMessages` 强约束：

`encrypted.label`、`encrypted.configured`、`encrypted.unconfigured`、`encrypted.keepHint`、`encrypted.clearConfirm`、`encrypted.set`、`encrypted.modify`、`encrypted.clear`，以及复用的 `inputs.value`、`placeholders.value`、`actions.cancel`。

## Examples

### 直接使用

```tsx
const [intent, setIntent] = useState<EncryptedValueChange>({ kind: 'keep' });

<EncryptedValueField editing value={{ configured }} onChange={setIntent} />
```

`intent` 即表单要提交的三态意图；未发生编辑时保持 `{ kind: 'keep' }`（或 `undefined`），保存时省略字段即可。

### 参数中心接入

参数页通过 `ParamValueInput` 的加密分支渲染本组件，`Form.Item name="encryptedValue"` 存的就是 `EncryptedValueChange`：

```tsx
<Form.Item name="encryptedValue" label={translate(paramI18n.fields.paramValue)}>
  <ParamValueInput dataType={dataType} encrypted encryptedConfigured={encryptedConfigured} />
</Form.Item>
```

`toUpdateParamReq` 负责把三态翻译为请求体：keep ⇒ 无 `paramValue`；set ⇒ 新明文；clear ⇒ `''`。

### 只读展示

```tsx
<EncryptedValueField value={{ configured: true }} />
```
