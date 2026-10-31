import { Alert, Flex, Spin } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { personService } from '@/api/person';
import type { PersonSummary } from '@/types/auth';
import { ProfilePanel } from './panels/profile-panel';
import { SecurityPanel } from './panels/security-panel';
import { TenantsPanel } from './panels/tenants-panel';

/**
 * 平台账号面板。
 *
 * 平台账号是跨企业的全局身份，但不再独立登录；这里的数据全部通过当前租户会话读取，
 * 因此用户在企业内就能维护平台资料和已关联企业。
 */
export function PlatformAccountPanel() {
  const [person, setPerson] = useState<PersonSummary>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(undefined);
    try {
      setPerson(await personService.current({ silent: true }));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '平台账号加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading && !person) {
    return (
      <Flex justify="center" style={{ padding: 48 }}>
        <Spin />
      </Flex>
    );
  }

  if (!person) {
    return (
      <Alert
        type="warning"
        showIcon
        title="无法读取平台账号"
        description={loadError ?? '当前登录用户尚未绑定平台账号，请先完成企业绑定。'}
      />
    );
  }

  return (
    <Flex vertical gap={16}>
      <ProfilePanel person={person} onUpdated={setPerson} />
      <SecurityPanel />
      <TenantsPanel />
    </Flex>
  );
}
