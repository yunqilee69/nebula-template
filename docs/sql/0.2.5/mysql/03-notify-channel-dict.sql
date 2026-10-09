-- ============================================================================
-- Nebula 升级脚本（MySQL，未发版）：补「移动推送」通知渠道字典项
--
-- 背景：PUSH 早已是正式发送渠道（模板变体、发送记录、订阅偏好判定都用到），
--       但 NOTIFY_CHANNEL_TYPE 字典里一直没有它的字典项。后果是静默的：
--       模板的 PUSH 变体页签与 PUSH 发送记录，渠道标签渲染为空白，
--       模板变体页签还会退化成「变体 6」这类没有意义的占位文案。
--
-- 本脚本补一条字典项（排序 6，排在钉钉群机器人之后）。
--
-- 幂等：按 id upsert，可重复执行。
-- 影响：只新增/更新该字典项，不改动其它数据。
-- ============================================================================

INSERT INTO sys_dict_item (
    id, dict_code, name, item_value, sort, is_enabled, tag_color, remark, create_time, update_time
) VALUES
    ('019cf114a0007000800000000000004b', 'NOTIFY_CHANNEL_TYPE', '移动推送', 'PUSH', 6, 1, NULL, '移动端推送通知渠道', NOW(), NOW())
AS new_values ON DUPLICATE KEY UPDATE
    dict_code = new_values.dict_code,
    name = new_values.name,
    item_value = new_values.item_value,
    sort = new_values.sort,
    is_enabled = new_values.is_enabled,
    tag_color = new_values.tag_color,
    remark = new_values.remark,
    update_time = new_values.update_time;
