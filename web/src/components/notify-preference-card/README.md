# NotifyPreferenceCard

消息订阅管理组件：按「通知类别 × 渠道」逐项开关，支持保存与恢复系统默认。

## 何时使用

- 站内信面板的「订阅管理」视图（当前唯一使用方）。
- 任何需要让用户自助调整通知渠道开关的位置。

## Props

| Prop | 类型 | 必填 | 说明 |
|---|---|---|---|
| `service` | `NotifyPreferenceService` | 是 | 偏好读写服务，注入以便测试替换。默认实现见 `@/api/notify-preference`。 |

## 行为说明

- 挂载即拉取偏好；`GET /api/notify/preferences/current` 返回的 `categories[].channels[].editable`
  是唯一权威的置灰依据，组件**不自行推断** `mandatory`。
- 保存只提交 `editable === true` 的项（强制类别与站内信渠道不落库）。
- 「恢复默认」走 `Popconfirm` 二次确认，确认后调用 reset 接口并用返回结果覆盖本地状态。
- 不自带标题与外框：它固定嵌在面板视图内，标题栏由使用方提供。

## 用法

```tsx
import { notifyPreferenceService } from '@/api/notify-preference';
import { NotifyPreferenceCard } from '@/components/notify-preference-card/notify-preference-card';

<NotifyPreferenceCard service={notifyPreferenceService} />
```

## 测试

```bash
npx vitest run src/components/notify-preference-card
```
