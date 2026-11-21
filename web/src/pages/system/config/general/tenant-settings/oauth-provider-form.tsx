import { QuestionCircleOutlined } from '@ant-design/icons';
import { Divider, Form, Input, Modal, Select, Switch } from 'antd';
import type { FormInstance } from 'antd';
import type { TenantOAuth2Provider } from '@/api/tenant-oauth';
import {
  buildFieldGroups,
  buildFieldRules,
  channelOptions,
  DEFAULT_CHANNEL,
  DEFAULT_PROVIDER_ID,
  getFieldMeta,
  isFieldVisible,
  normalizeChannelForProvider,
  OAUTH_PROVIDER_OPTIONS,
  type OAuthProviderFieldKey,
  type OAuthProviderFieldMeta,
  type OAuthProviderFormContext,
  type OAuthProviderFormValues,
} from './oauth-provider-form-helpers';

/** 字段说明图标：短说明挂 tooltip，读屏用户也能听到具体是哪个参数的说明。 */
function fieldTooltip(meta: OAuthProviderFieldMeta) {
  return { title: meta.tooltip, icon: <QuestionCircleOutlined aria-label={`${meta.label}字段说明`} /> };
}

interface OAuthProviderFormModalProps {
  readonly form: FormInstance<OAuthProviderFormValues>;
  readonly open: boolean;
  readonly editing: TenantOAuth2Provider | null;
  readonly saving: boolean;
  readonly onCancel: () => void;
  readonly onSubmit: (values: OAuthProviderFormValues) => void;
}

/** 企业 OAuth2 配置弹窗：按 Provider + 渠道只展示有效字段，必填与校验随启用状态变化。 */
export function OAuthProviderFormModal({
  form,
  open,
  editing,
  saving,
  onCancel,
  onSubmit,
}: OAuthProviderFormModalProps) {
  const providerId = Form.useWatch('providerId', form) ?? DEFAULT_PROVIDER_ID;
  const channel = normalizeChannelForProvider(providerId, Form.useWatch('channel', form) ?? DEFAULT_CHANNEL);
  // 新增配置默认启用；编辑时以记录值为准。
  const enabled = Form.useWatch('enabled', form) ?? true;
  const hasStoredSecret = editing?.hasClientSecret === true;
  const context: OAuthProviderFormContext = { providerId, channel, enabled, hasStoredSecret };
  const groups = buildFieldGroups(providerId, channel);

  const handleSubmit = async () => {
    try {
      onSubmit(await form.validateFields());
    } catch {
      // 校验失败时 antd 已在字段旁展示错误，保持弹窗与用户输入。
    }
  };

  const renderControl = (key: OAuthProviderFieldKey, meta: OAuthProviderFieldMeta) => {
    switch (key) {
      case 'providerId':
        return <Select aria-label="Provider" options={[...OAUTH_PROVIDER_OPTIONS]} placeholder={meta.placeholder} />;
      case 'channel':
        return <Select aria-label="渠道" options={[...channelOptions(providerId)]} placeholder={meta.placeholder} />;
      case 'enabled':
        return <Switch aria-label="启用" checkedChildren="已启用" unCheckedChildren="未启用" />;
      case 'clientSecret':
        return <Input.Password autoComplete="new-password" placeholder={meta.placeholder} />;
      default:
        return <Input autoComplete="off" placeholder={meta.placeholder} />;
    }
  };

  return (
    <Modal
      title={editing ? '编辑 OAuth2 配置' : '新增 OAuth2 配置'}
      open={open}
      width={760}
      okText="保存"
      cancelText="取消"
      confirmLoading={saving}
      forceRender
      onOk={() => void handleSubmit()}
      onCancel={onCancel}
    >
      <Form<OAuthProviderFormValues>
        form={form}
        layout="vertical"
        disabled={saving}
        initialValues={{ providerId: DEFAULT_PROVIDER_ID, channel: DEFAULT_CHANNEL, enabled: true }}
        onValuesChange={(changed: Partial<OAuthProviderFormValues>) => {
          // Provider 与渠道联动：切到 GitHub 时把小程序渠道纠正为 Web，不残留非法组合。
          if (!('providerId' in changed)) return;
          const nextProvider = changed.providerId ?? DEFAULT_PROVIDER_ID;
          const nextChannel = normalizeChannelForProvider(nextProvider, form.getFieldValue('channel'));
          if (nextChannel !== form.getFieldValue('channel')) {
            form.setFieldValue('channel', nextChannel);
          }
        }}
      >
        {groups.map((group) => {
          const visibleFields = group.fields.filter((field) => isFieldVisible(field, providerId, channel));
          if (visibleFields.length === 0) return null;

          return (
            <div key={group.key}>
              <Divider titlePlacement="start" className="!my-2">{group.title}</Divider>
              <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                {visibleFields.map((field) => {
                  const meta = getFieldMeta(field, context);
                  return (
                    <Form.Item
                      key={field}
                      name={field}
                      label={meta.label}
                      tooltip={fieldTooltip(meta)}
                      extra={meta.extra}
                      valuePropName={field === 'enabled' ? 'checked' : 'value'}
                      rules={buildFieldRules(field, context)}
                    >
                      {renderControl(field, meta)}
                    </Form.Item>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Form>
    </Modal>
  );
}
