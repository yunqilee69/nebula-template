-- ============================================================================
-- Nebula - Upgrade Script
-- 目标版本：待定（MySQL，自 0.2.1 升级）；本目录为 unreleased，发版时整体更名为新版本号
-- Purpose: 新增微信登录提供商开关参数 login.oauth2.provider.wechat.enabled
-- Notes:
--   1. 可重复执行（INSERT 使用 ON DUPLICATE KEY UPDATE）。
--   2. 该参数是微信登录的运行时开关（提供商级，同时覆盖网站应用与小程序两个渠道），默认关闭；开启前请先通过环境变量配置
--      NEBULA_AUTH_WECHAT_MINI_APP_ID / NEBULA_AUTH_WECHAT_MINI_APP_SECRET（小程序渠道）或 NEBULA_AUTH_WECHAT_WEB_APP_ID / NEBULA_AUTH_WECHAT_WEB_APP_SECRET / NEBULA_AUTH_WECHAT_WEB_REDIRECT_URI（网站应用扫码渠道）。
--   3. OAuth2 总开关 login.oauth2.enabled 需同时为 true，微信登录才会生效。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 新增微信登录提供商开关
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
    ('01959f0aa4d37c0d91a7d9af9c7d1025', 'login.oauth2.provider.wechat.enabled', '微信登录开关', '微信登录提供商开关，覆盖网站应用（扫码）与小程序两个渠道', 'false', 'BOOLEAN', NULL, 'auth', 1, NOW(), NOW())
AS new_values ON DUPLICATE KEY UPDATE
    param_name = new_values.param_name,
    description = new_values.description,
    param_value = new_values.param_value,
    data_type = new_values.data_type,
    option_code = new_values.option_code,
    module_code = new_values.module_code,
    is_builtin = new_values.is_builtin,
    update_time = new_values.update_time;
