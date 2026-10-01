-- ============================================================================
-- Nebula - Upgrade Script
-- 目标版本：0.2.1（MySQL，自 0.2.0 升级）
-- Purpose: 移除无效的 spring.servlet.multipart.* 参数，新增 storage.upload.* 上传策略参数
-- Notes:
--   1. 可重复执行（DELETE 幂等，INSERT 使用 ON DUPLICATE KEY UPDATE）。
--   2. spring.servlet.multipart.* 是启动期装配项，写在参数中心不会生效
--      （容器在请求解析阶段就已限流），改由 application.yml 静态配置。
--   3. 升级后请同步检查 application.yml：
--        spring.servlet.multipart.max-file-size  >= storage.upload.max-file-size
--      nebula-storage 启动时会自检该口径，不满足将直接启动失败。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 清理已废弃参数
-- ----------------------------------------------------------------------------
DELETE FROM sys_param
WHERE param_key IN (
    'spring.servlet.multipart.max-file-size',
    'spring.servlet.multipart.max-request-size'
);

-- ----------------------------------------------------------------------------
-- 2. 新增上传策略参数
-- ----------------------------------------------------------------------------
INSERT INTO sys_param (
    id,
    param_key,
    param_name,
    description,
    param_value,
    data_type,
    option_code,
    module_code,
    is_builtin,
    create_time,
    update_time
) VALUES
    ('01959f0aa4d37c0d91a7d9af9c7d1033', 'storage.upload.max-file-size', '单文件大小上限(MB)', '单个文件上传大小上限，单位 MB；必须不大于 application.yml 中 spring.servlet.multipart.max-file-size 的静态传输口径，否则请求会被容器提前以 413 拒绝；不变式 chunk-size <= chunk-threshold <= max-file-size', '100', 'INT', NULL, 'storage', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1034', 'storage.upload.chunk-threshold', '分片上传阈值(MB)', '文件超过该值必须走分片上传，单位 MB；不变式 chunk-size <= chunk-threshold <= max-file-size', '10', 'INT', NULL, 'storage', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1035', 'storage.upload.chunk-size', '分片大小(MB)', '分片上传的单片大小，单位 MB；不变式 chunk-size <= chunk-threshold <= max-file-size，且不超过 2047（超过会溢出 Integer 字节数）', '5', 'INT', NULL, 'storage', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1036', 'storage.upload.allowed-extensions', '允许的扩展名', '允许上传的文件扩展名，逗号分隔，可带或不带前导点（jpg,png 与 .jpg,.png 等价），大小写不敏感，留空表示不限制', '', 'STRING', NULL, 'storage', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1037', 'storage.upload.temp-retention-days', '临时任务保留天数', '临时上传任务及其临时文件的保留天数，超期由定时清理任务删除', '14', 'INT', NULL, 'storage', 1, NOW(), NOW())
AS new_values ON DUPLICATE KEY UPDATE
    param_name = new_values.param_name,
    description = new_values.description,
    param_value = new_values.param_value,
    data_type = new_values.data_type,
    option_code = new_values.option_code,
    module_code = new_values.module_code,
    is_builtin = new_values.is_builtin,
    update_time = new_values.update_time;
