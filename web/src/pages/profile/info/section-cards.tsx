import { ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Empty, Form, Input, Popconfirm, Space, Tag, theme as antdTheme } from 'antd';
import type { FormInstance } from 'antd';
import { createStyles } from 'antd-style';
import { useMemo } from 'react';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns } from '@/components/nebula-pro-table';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import type { ProfileService } from '@/api/profile';
import type { LoginRecordResp, OAuth2BindingResp } from '@/types/profile';

export interface PasswordFormValues {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const useOAuth2Styles = createStyles(({ token }) => ({
  oauthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: token.marginMD,
  },
}));

function renderProfileValue(value: string | number | undefined, fallback: string) {
  return value ?? fallback;
}

function buildLoginRecordPageReq(params: NebulaPageReq) {
  return {
    pageNum: params.pageNum,
    pageSize: params.pageSize,
  };
}

interface PasswordCardProps {
  readonly form: FormInstance<PasswordFormValues>;
  readonly saving: boolean;
  readonly onSubmit: (values: PasswordFormValues) => void | Promise<void>;
}

export function PasswordCard({ form, saving, onSubmit }: PasswordCardProps) {
  const { t } = useNebulaI18n();

  return (
    <Card title={t('auth.profileInfo.sections.password')}>
      <Form form={form} layout="vertical" onFinish={(values) => void onSubmit(values)} disabled={saving}>
        <Form.Item name="oldPassword" label={t('auth.profileInfo.fields.oldPassword')} htmlFor="profile-old-password" rules={[{ required: true, message: t('auth.profileInfo.validation.oldPasswordRequired') }]}> 
          <Input.Password id="profile-old-password" autoComplete="current-password" placeholder={t('auth.profileInfo.placeholders.oldPassword')} />
        </Form.Item>
        <Form.Item name="newPassword" label={t('auth.profileInfo.fields.newPassword')} htmlFor="profile-new-password" rules={[{ required: true, message: t('auth.profileInfo.validation.newPasswordRequired') }]}> 
          <Input.Password id="profile-new-password" autoComplete="new-password" placeholder={t('auth.profileInfo.placeholders.newPassword')} />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label={t('auth.profileInfo.fields.confirmPassword')}
          htmlFor="profile-confirm-password"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: t('auth.profileInfo.validation.confirmPasswordRequired') },
            ({ getFieldValue }) => ({
              validator(_, value: string | undefined) {
                if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                return Promise.reject(new Error(t('auth.profileInfo.validation.passwordMismatch')));
              },
            }),
          ]}
        >
          <Input.Password id="profile-confirm-password" autoComplete="new-password" placeholder={t('auth.profileInfo.placeholders.confirmPassword')} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>{t('auth.profileInfo.actions.changePassword')}</Button>
      </Form>
    </Card>
  );
}

interface OAuth2BindingsCardProps {
  readonly bindings: OAuth2BindingResp[];
  readonly loading: boolean;
  readonly unbindProviderId?: string;
  readonly bindProviderId?: string;
  readonly onRefresh: () => void | Promise<void>;
  readonly onUnbind: (providerId: string) => void | Promise<void>;
  readonly onBind: (providerId: string) => void | Promise<void>;
}

export function OAuth2BindingsCard({ bindings, loading, unbindProviderId, bindProviderId, onRefresh, onUnbind, onBind }: OAuth2BindingsCardProps) {
  const { t } = useNebulaI18n();
  const { token } = antdTheme.useToken();
  const { styles } = useOAuth2Styles();
  const notProvided = t('auth.profileInfo.empty.notProvided');

  return (
    <Card title={t('auth.profileInfo.sections.oauth2')} loading={loading} extra={<Button icon={<ReloadOutlined />} onClick={() => void onRefresh()}>{t('auth.profileInfo.actions.refresh')}</Button>}>
      {bindings.length > 0 ? (
        <div className={styles.oauthGrid}>
          {bindings.map((binding) => (
            <Card key={binding.providerId} data-testid={`oauth2-provider-${binding.providerId}`} size="small" title={binding.providerName ?? binding.providerId}>
              <Space orientation="vertical" size={token.marginSM} className="w-full">
                <Tag color={binding.bound ? 'success' : 'default'}>{binding.bound ? t('auth.profileInfo.status.bound') : t('auth.profileInfo.status.unbound')}</Tag>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label={t('auth.profileInfo.fields.accountName')}>{renderProfileValue(binding.displayName ?? binding.providerUserId, notProvided)}</Descriptions.Item>
                  <Descriptions.Item label={t('auth.profileInfo.fields.createTime')}>{renderProfileValue(binding.linkedAt, notProvided)}</Descriptions.Item>
                </Descriptions>
                {binding.bound ? (
                  <Popconfirm title={t('auth.profileInfo.confirm.unbindTitle')} onConfirm={() => void onUnbind(binding.providerId)}>
                    <Button danger loading={unbindProviderId === binding.providerId}>{t('auth.profileInfo.actions.unbind')}</Button>
                  </Popconfirm>
                ) : (
                  <Button loading={bindProviderId === binding.providerId} onClick={() => void onBind(binding.providerId)}>{t('auth.profileInfo.actions.bind')}</Button>
                )}
              </Space>
            </Card>
          ))}
        </div>
      ) : (
        <Empty description={t('auth.profileInfo.empty.oauth2')} />
      )}
    </Card>
  );
}

interface LoginRecordsCardProps {
  readonly service: ProfileService;
}

export function LoginRecordsCard({ service }: LoginRecordsCardProps) {
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const notProvided = t('auth.profileInfo.empty.notProvided');
  const columns = useMemo<NebulaProColumns<LoginRecordResp>[]>(() => [
    { title: t('auth.profileInfo.columns.loginType'), dataIndex: 'loginType', render: (_, record) => renderProfileValue(record.loginType, notProvided) },
    { title: t('auth.profileInfo.columns.loginIp'), dataIndex: 'loginIp', render: (_, record) => renderProfileValue(record.loginIp, notProvided) },
    { title: t('auth.profileInfo.columns.deviceInfo'), dataIndex: 'deviceInfo', render: (_, record) => renderProfileValue(record.deviceInfo, notProvided) },
    { title: t('auth.profileInfo.columns.loginTime'), dataIndex: 'loginTime', render: (_, record) => renderProfileValue(record.loginTime, notProvided) },
    {
      title: t('auth.profileInfo.columns.success'),
      key: 'success',
      render: (_, record) => {
        const success = record.loginResult === 'SUCCESS';
        return <Tag color={success ? 'success' : 'error'}>{success ? t('auth.profileInfo.status.success') : t('auth.profileInfo.status.failed')}</Tag>;
      },
    },
    { title: t('auth.profileInfo.columns.failReason'), dataIndex: 'failReason', render: (_, record) => renderProfileValue(record.failReason, notProvided) },
  ], [notProvided, t]);

  return (
    <Card title={t('auth.profileInfo.sections.loginRecords')}>
      <NebulaProTable<LoginRecordResp>
        columns={columns}
        rowKey={(record) => [record.loginTime, record.loginAccount, record.loginType, record.loginIp].filter((value) => value !== undefined && value !== '').join('-')}
        search={false}
        request={(params) => service.pageLoginRecords(buildLoginRecordPageReq(params))}
        onRequestError={(error) => {
          notice.error(t('auth.profileInfo.feedback.loginRecordsLoadFailed'));
          const message = error instanceof Error ? error.message : String(error);
          console.error('Failed to load login records', message);
        }}
        locale={{ emptyText: t('auth.profileInfo.empty.loginRecords') }}
      />
    </Card>
  );
}
