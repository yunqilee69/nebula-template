# SiteMessageList

站内信列表（含筛选工具栏）与消息正文，站内信面板与 `/notify/inbox` 全文页共用同一份实现。

## 何时使用

- 站内信面板（`layouts/components/notification-panel.tsx`）的列表视图与详情视图。
- 通知收件箱全文页（`pages/notify/inbox`）。

两处必须复用本组件：列表与筛选行为一旦分叉，同一份数据在两个入口会呈现不同结果。

## 文件

| 文件 | 说明 |
|---|---|
| `site-message-list.tsx` | 列表本体：分段筛选、类别下拉、全部已读、分页加载、单条动作 |
| `site-message-detail.tsx` | 消息正文（标题 / 类别 / 时间 / 已读状态 / 内容） |
| `site-message-list.types.ts` | Props 与注入的 service 契约 |

## SiteMessageList Props

| Prop | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `service` | `SiteMessageListService` | 是 | — | 分页、类别聚合、全部已读、单条已读/未读、删除，注入以便测试替换 |
| `receiverUserId` | `string \| undefined` | 是 | — | 当前登录用户；为空时不发请求并展示空态 |
| `onSelect` | `(message) => void` | 是 | — | 点击消息；由使用方决定切详情视图还是弹窗 |
| `selectedMessageId` | `string` | 否 | — | 高亮选中项 |
| `pageSize` | `number` | 否 | `10` | 每页条数 |
| `showMessageActions` | `boolean` | 否 | `false` | 显示单条「标记未读 / 删除」；面板空间窄默认关闭，全文页开启 |
| `selectable` | `boolean` | 否 | `false` | 显示行勾选框与工具栏「全选」；仅全文页的多选批量操作需要 |
| `renderBatchActions` | `(selected, clearSelection) => ReactNode` | 否 | — | 批量操作区内容，仅在 `selectable` 且有选中项时渲染；列表不管具体动作 |
| `reloadToken` | `number` | 否 | `0` | 值变化即从第一页重新拉取，供使用方主动刷新 |
| `onDataLoaded` | `(messages) => void` | 否 | — | 列表数据变化时回调，供使用方派生「当前选中消息」等 |

## 行为说明

- **已读联动**：点击某条未读消息会立即调用单条已读接口并让 `useNotifyStore` 未读数减一；
  失败则回滚本地状态并提示。同一条消息不会重复发起已读请求。
  注意这只覆盖"用户点击行"的路径；URL 深链直接打开详情时没有点击事件，由使用方自行补标记。
- **全部已读**：带 `Popconfirm` 二次确认，把当前类别筛选作为范围传给服务端，
  用服务端返回的受影响条数修正未读数（不是简单清零或减一）。
- **类别下拉**：选项来自 `GET /api/notify/site-messages/categories`（当前用户实际有消息的类别），
  未读数大于 0 时在名称后追加计数。该接口失败只是降级为「全部类别」，不影响看消息。
- **加载更多**：追加到已有列表，不做整页替换；`messages.length >= total` 时隐藏。

## SiteMessageDetail Props

| Prop | 类型 | 必填 | 说明 |
|---|---|---|---|
| `message` | `SiteMessageResp \| undefined` | 是 | 为空时渲染骨架屏 |

## 用法

```tsx
<SiteMessageList
  service={notifyService}
  receiverUserId={currentUserId}
  selectedMessageId={activeMessageId}
  onSelect={(message) => setActiveMessage({ id: message.id, message })}
/>

<SiteMessageDetail message={activeMessage} />
```

全文页的多选批量形态：

```tsx
<SiteMessageList
  service={notifyService}
  receiverUserId={currentUserId}
  selectable
  showMessageActions
  onSelect={openDetail}
  renderBatchActions={(selected, clearSelection) => (
    <Space>
      <Button onClick={() => markRead(selected, clearSelection)}>标记为已读</Button>
      <Button onClick={() => markUnread(selected, clearSelection)}>标记为未读</Button>
    </Space>
  )}
/>
```

## 测试

```bash
npx vitest run src/components/site-message-list
```
