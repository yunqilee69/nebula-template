import { Empty } from 'antd';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';

export function EmptyModule() {
  const { t } = useNebulaI18n();
  return <Empty description={t('common.empty.noModules')} />;
}
