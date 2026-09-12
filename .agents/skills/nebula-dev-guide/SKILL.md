# Nebula 开发指导入口

编排 Nebula 功能开发完整流程。用户只需调用此 skill，自动引导从需求分析到功能书编写再到归档的全过程。

## 调用方式

```
/nebula-dev-guide 我需要开发一个{功能描述}
```

---

## 工作流

### Phase 1: 功能分析

**调用**: `/nebula-feature-analysis`

与用户问答确认：
- 功能描述
- 功能点清单
- 涉及模块
- 技术方案

**完成条件**: 用户对每个功能点确认"是"或"确认"

---

### Phase 2: 查看可复用模块（按需）

**调用**: `/nebula-module-guide`

识别可复用的 Nebula 模块：
- `storage` → 文件上传、存储
- `auth` → 用户认证、权限
- `dict` → 数据字典
- `param` → 系统参数
- `notify` → 通知公告
- `scheduler` → 任务调度
- `audit` → 审计日志

**完成条件**: 明确哪些模块可复用

---

### Phase 3: 编写功能书

**调用**: `/nebula-feature-spec`

输出功能说明书：
- 位置: `docs/dev/{yyyy-MM-dd}-{功能说明}.md`
- 内容: 功能概述、接口设计、编码要求、测试用例（TDD）、用例

期间**按需调用** `/nebula-specification` 确保示例代码符合规范。

**完成条件**: 功能书编写完成，展示给用户

---

### Phase 4: 用户确认

展示功能书，用户确认：
- 回复 "确认，可以开发" → 进入开发阶段
- 回复 "需要修改" → 返回 Phase 1 或 Phase 3

**完成条件**: 用户确认"可以开发"

---

### Phase 5: 开发实施

告知用户可以使用 agent 基于功能书开发：

```
功能书已确认。开发流程：
1. 先编写测试用例（TDD）- 参考 /tdd skill
2. 实现功能
3. 运行测试验证

完成后回复"开发完成"进行归档。
```

**完成条件**: 用户回复"开发完成"

---

### Phase 6: 归档

完成开发后自动归档：

1. **更新功能书状态**:
   - 头部状态: `已完成`
   - 填写完成时间
   - 所有功能点状态: `已完成`

2. **重命名文件**:
   - 原文件: `docs/dev/{date}-{feature}.md`
   - 新文件: `docs/dev/{date}-{feature}.done.md`

**完成条件**: 归档完成，告知用户

---

## 流程图

```
/nebula-dev-guide "开发xxx功能"
        │
        ▼
[Phase 1] /nebula-feature-analysis → 功能分析（问答确认）
        │
        ▼
[Phase 2] /nebula-module-guide → 查看可复用模块（按需）
        │
        ▼
[Phase 3] /nebula-feature-spec → 编写功能书
        │         │
        │         └─→ /nebula-specification（按需）确保规范
        │
        ▼
[Phase 4] 用户确认功能书
        │
        ▼
[Phase 5] 开发实施（agent 基于功能书）
        │
        ▼
[Phase 6] 归档 → 更新状态 + 重命名 .done.md
```

---

## 禁止行为

- ❌ 用户未确认功能点就编写功能书
- ❌ 功能书未确认就告知用户可以开发
- ❌ 开发未完成就执行归档
- ❌ 归档时只更新状态不重命名文件