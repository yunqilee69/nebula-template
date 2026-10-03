import { ReloadOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons';
import { Button, Card, Divider, Empty, Popconfirm, Space, Switch, Tag, Typography, theme as antdTheme } from 'antd';
import { createStyles } from 'antd-style';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import type { NotifyPreferenceService } from '@/api/notify-preference';
import type { NotifyPreferenceResp } from '@/types/notify';
import { buildUpdatePayload, listChannelToggles, toggleChannel } from './notify-preference-helpers';
import type { NotifyChannelToggle } from './notify-preference-helpers';

export interface NotifyPreferenceCardProps {
  readonly service: NotifyPreferenceService;
}

const useNotifyPreferenceStyles = createStyles(({ token }) => ({
  group: {
    marginBottom: token.marginMD,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: token.marginSM,
  },
  hint: {
    marginTop: token.marginXS,
    marginBottom: 0,
  },
}));

interface CategoryGroup {
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly mandatory: boolean;
  readonly channels: readonly {
    readonly channel: string;
    readonly toggle?: NotifyChannelToggle;
  }[];
}

export function NotifyPreferenceCard({ service }: NotifyPreferenceCardProps) {
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const { token } = antdTheme.useToken();
  const { styles } = useNotifyPreferenceStyles();

  const [preference, setPreference] = useState<NotifyPreferenceResp>();
  const [toggles, setToggles] = useState<NotifyChannelToggle[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const applyPreference = useCallback((next: NotifyPreferenceResp) => {
    setPreference(next);
    setToggles(listChannelToggles(next));
  }, []);

  const loadPreference = useCallback(async () => {
    setLoading(true);
    try {
      applyPreference(await service.getPreference());
    } catch (error: unknown) {
      notice.error(t('auth.profileInfo.notifyPreference.feedback.loadFailed'));
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to load notify preference', message);
    } finally {
      setLoading(false);
    }
  }, [applyPreference, notice, service, t]);

  useEffect(() => {
    void loadPreference();
  }, [loadPreference]);

  const savePreference = useCallback(async () => {
    setSaving(true);
    try {
      applyPreference(await service.updatePreference(buildUpdatePayload(toggles)));
      notice.success(t('auth.profileInfo.notifyPreference.feedback.saveSuccess'));
    } catch (error: unknown) {
      notice.error(t('auth.profileInfo.notifyPreference.feedback.saveFailed'));
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to save notify preference', message);
    } finally {
      setSaving(false);
    }
  }, [applyPreference, notice, service, t, toggles]);

  const resetPreference = useCallback(async () => {
    setResetting(true);
    try {
      applyPreference(await service.resetPreference());
      notice.success(t('auth.profileInfo.notifyPreference.feedback.resetSuccess'));
    } catch (error: unknown) {
      notice.error(t('auth.profileInfo.notifyPreference.feedback.resetFailed'));
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to reset notify preference', message);
    } finally {
      setResetting(false);
    }
  }, [applyPreference, notice, service, t]);

  const channelLabels = useMemo<Record<string, string>>(() => ({
    SITE: t('auth.profileInfo.notifyPreference.channel.site'),
    EMAIL: t('auth.profileInfo.notifyPreference.channel.email'),
    PUSH: t('auth.profileInfo.notifyPreference.channel.push'),
  }), [t]);

  const categoryGroups = useMemo<CategoryGroup[]>(() => {
    const toggleMap = new Map(toggles.map((toggle) => [`${toggle.categoryCode}|${toggle.channel}`, toggle]));
    return (preference?.categories ?? []).map((category) => ({
      code: category.code,
      name: category.name ?? category.code,
      description: category.description,
      mandatory: category.mandatory === true,
      channels: (category.channels ?? []).map((channel) => ({
        channel: channel.channel,
        toggle: toggleMap.get(`${category.code}|${channel.channel}`),
      })),
    }));
  }, [preference, toggles]);

  const disabled = saving || resetting;

  return (
    <Card
      title={t('auth.profileInfo.sections.notifyPreference')}
      loading={loading}
      extra={<Button icon={<ReloadOutlined />} onClick={() => void loadPreference()}>{t('auth.profileInfo.actions.refresh')}</Button>}
    >
      {categoryGroups.length === 0 ? (
        <Empty description={t('auth.profileInfo.notifyPreference.empty')} />
      ) : (
        <Space orientation="vertical" size={token.marginMD} className="w-full">
          <Typography.Paragraph type="secondary" className={styles.hint}>
            {t('auth.profileInfo.notifyPreference.description')}
          </Typography.Paragraph>

          {categoryGroups.map((group) => (
            <div key={group.code} className={styles.group} data-testid={`notify-pref-group-${group.code}`}>
              <Space size={token.marginXS}>
                <Typography.Text strong>{group.name}</Typography.Text>
                {group.mandatory ? <Tag color="warning">{t('auth.profileInfo.notifyPreference.mandatoryTag')}</Tag> : null}
              </Space>
              {group.description ? (
                <Typography.Paragraph type="secondary" className={styles.hint}>{group.description}</Typography.Paragraph>
              ) : null}
              <Space orientation="vertical" size={token.marginXS} className="w-full">
                {group.channels.map((item) => {
                  const label = channelLabels[item.channel] ?? item.channel;
                  return (
                    <div key={item.channel} className={styles.row}>
                      <Typography.Text>{label}</Typography.Text>
                      <Switch
                        checked={item.toggle?.enabled === true}
                        disabled={item.toggle?.editable !== true || disabled}
                        onChange={(checked) => setToggles((previous) => toggleChannel(previous, group.code, item.channel, checked))}
                        aria-label={`${group.name} ${label}`}
                      />
                    </div>
                  );
                })}
              </Space>
            </div>
          ))}

          <Divider className={styles.hint} />

          <Space size={token.marginSM}>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={resetting} onClick={() => void savePreference()}>
              {t('auth.profileInfo.notifyPreference.actions.save')}
            </Button>
            <Popconfirm
              title={t('auth.profileInfo.notifyPreference.actions.resetConfirmTitle')}
              description={t('auth.profileInfo.notifyPreference.actions.resetConfirmContent')}
              onConfirm={() => void resetPreference()}
            >
              <Button danger icon={<UndoOutlined />} loading={resetting} disabled={saving}>
                {t('auth.profileInfo.notifyPreference.actions.reset')}
              </Button>
            </Popconfirm>
          </Space>
        </Space>
      )}
    </Card>
  );
}
