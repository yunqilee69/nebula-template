import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Empty, Flex, Input, Row, Select, Spin, Tag, Tree, Typography } from 'antd';
import type { TreeProps } from 'antd';
import { Access } from '@/components/access';
import { DictLabel, useDictItems } from '@/components/dict-select';
import { PermissionEffectCheckbox } from '@/components/permission-effect-checkbox';
import { SubjectSelector } from '@/components/subject-selector';
import { AUTH_BUTTON_PERMISSION_CODES } from '@/constants/auth-button-codes';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { permissionService as defaultPermissionService } from '@/api/permission';
import type { PermissionService } from '@/api/permission';
import type { ApiResp } from '@/types/api-permission';
import type {
  PermissionApiResource,
  PermissionApiResourceGroup,
  PermissionDraftEffect,
  PermissionGrantResp,
  PermissionSubject,
  PermissionSubjectType,
  SaveSubjectPermissionItem,
} from '@/types/permission';
import {
  getNextPermissionEffect,
  getPermissionEffectMessageKey,
  toPermissionEffects,
} from '@/utils/permission-effect';
import { syncSubjectPermissions } from '@/utils/permission-sync';

export interface ApiPermissionPageProps {
  service?: PermissionService;
}

/** 所属模块复用基础模块（param）已内置的字典。 */
const PARAM_MODULE_DICT_CODE = 'param_module';
const API_EFFECT_I18N_PREFIX = 'auth.apiPermission.effects' as const;
const UNGROUPED_MODULE = '__ungrouped__';

function toApiResource(api: ApiResp): PermissionApiResource {
  return {
    id: api.id,
    type: 'API',
    name: api.name,
    code: api.code,
    module: api.module,
    description: api.remark,
    status: api.status,
  };
}

function toApiResourceGroups(apis: readonly ApiResp[]): PermissionApiResourceGroup[] {
  const grouped = new Map<string, PermissionApiResource[]>();

  for (const api of apis) {
    const module = api.module?.trim() || UNGROUPED_MODULE;
    const bucket = grouped.get(module);
    if (bucket) {
      bucket.push(toApiResource(api));
    } else {
      grouped.set(module, [toApiResource(api)]);
    }
  }

  return [...grouped.entries()].map(([module, resources]) => ({
    key: `module-${module}`,
    name: module,
    module,
    apis: resources,
  }));
}

function collectApis(groups: readonly PermissionApiResourceGroup[]): PermissionApiResource[] {
  return groups.flatMap((group) => group.apis);
}

function filterGroups(
  groups: readonly PermissionApiResourceGroup[],
  keyword: string,
  module: string | undefined,
): PermissionApiResourceGroup[] {
  const normalized = keyword.trim().toLowerCase();

  return groups.flatMap((group) => {
    if (module && group.module !== module) return [];

    const apis = group.apis.filter((api) => (
      !normalized || `${api.name} ${api.code}`.toLowerCase().includes(normalized)
    ));

    return apis.length > 0 ? [{ ...group, apis }] : [];
  });
}

function collectExpandableKeys(groups: readonly PermissionApiResourceGroup[]): string[] {
  return groups.map((group) => `module-${group.module}`);
}

export function ApiPermissionPage({ service: serviceProp }: ApiPermissionPageProps) {
  const service = serviceProp ?? defaultPermissionService;
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const { getLabelByValue } = useDictItems(PARAM_MODULE_DICT_CODE);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeType, setActiveType] = useState<PermissionSubjectType>('ORG');
  const [subjectKeyword, setSubjectKeyword] = useState('');
  const [resourceKeyword, setResourceKeyword] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>();
  const [orgs, setOrgs] = useState<PermissionSubject[]>([]);
  const [roles, setRoles] = useState<PermissionSubject[]>([]);
  const [users, setUsers] = useState<PermissionSubject[]>([]);
  const [groups, setGroups] = useState<PermissionApiResourceGroup[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<PermissionSubject>();
  const [permissionEffects, setPermissionEffects] = useState<Record<string, PermissionDraftEffect>>({});
  const [loadedPermissions, setLoadedPermissions] = useState<PermissionGrantResp[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    let mounted = true;

    Promise.all([service.listSubjects(), service.listApis()])
      .then(([subjects, apis]) => {
        if (!mounted) return;
        const nextGroups = toApiResourceGroups(apis);
        setOrgs(subjects.orgs);
        setRoles(subjects.roles);
        setUsers(subjects.users);
        setGroups(nextGroups);
        setSelectedSubject(subjects.orgs[0] ?? subjects.roles[0] ?? subjects.users[0]);
        setExpandedKeys(collectExpandableKeys(nextGroups));
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        notice.error(t('auth.apiPermission.feedback.loadFailed'));
        console.error('Failed to load api permission resources', error);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [service, notice, t]);

  useEffect(() => {
    if (!selectedSubject) return;

    let mounted = true;

    service
      .pageSubjectPermissions({ subjectType: selectedSubject.type, subjectId: selectedSubject.id, resourceType: 'API' })
      .then((page) => {
        if (!mounted) return;
        setLoadedPermissions(page.data);
        setPermissionEffects(toPermissionEffects(page.data));
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        notice.error(t('auth.apiPermission.feedback.loadFailed'));
        console.error('Failed to load permissions:', error);
      });

    return () => {
      mounted = false;
    };
  }, [selectedSubject, service, notice, t]);

  const handleToggleApi = useCallback((apiId: string) => {
    setPermissionEffects((prev) => {
      const next = { ...prev };
      const nextEffect = getNextPermissionEffect(prev[apiId] ?? 'none');
      if (nextEffect === 'none') {
        delete next[apiId];
      } else {
        next[apiId] = nextEffect;
      }
      return next;
    });
  }, []);

  const allApis = useMemo(() => collectApis(groups), [groups]);

  const handleSave = useCallback(async () => {
    if (!selectedSubject) return;

    setSaving(true);
    try {
      const permissions = allApis.flatMap((api) => {
        const effect = permissionEffects[api.id] ?? 'none';
        if (effect === 'none') return [];
        return [{
          resourceType: 'API' as const,
          resourceId: api.id,
          effect,
          scope: 'ALL',
        } satisfies SaveSubjectPermissionItem];
      });

      const nextPermissions = await syncSubjectPermissions({
        service,
        subject: selectedSubject,
        existingPermissions: loadedPermissions,
        desiredPermissions: permissions,
      });
      setLoadedPermissions(nextPermissions);
      setPermissionEffects(toPermissionEffects(nextPermissions));
      notice.success(t('auth.apiPermission.feedback.saveSuccess'));
    } catch (error) {
      notice.error(t('auth.apiPermission.feedback.saveFailed'));
      console.error('Failed to save permissions:', error);
    } finally {
      setSaving(false);
    }
  }, [selectedSubject, service, allApis, permissionEffects, loadedPermissions, notice, t]);

  const handleBulkSet = useCallback((effect: PermissionDraftEffect) => {
    if (effect === 'none') {
      setPermissionEffects({});
      return;
    }
    setPermissionEffects(Object.fromEntries(allApis.map((api) => [api.id, effect])));
  }, [allApis]);

  const moduleOptions = useMemo(
    () => groups.map((group) => ({
      label: group.module === UNGROUPED_MODULE
        ? t('auth.apiPermission.ungroupedModule')
        : (getLabelByValue(group.module) ?? group.module),
      value: group.module,
    })),
    [groups, getLabelByValue, t],
  );

  const filteredGroups = useMemo(
    () => filterGroups(groups, resourceKeyword, moduleFilter),
    [groups, resourceKeyword, moduleFilter],
  );

  const treeData = useMemo(() => {
    const toTreeNodes = (items: PermissionApiResourceGroup[]): NonNullable<TreeProps['treeData']> => (
      items.map((group) => ({
        key: `module-${group.module}`,
        selectable: false,
        title: group.module === UNGROUPED_MODULE
          ? <span>{t('auth.apiPermission.ungroupedModule')}</span>
          : <DictLabel dictCode={PARAM_MODULE_DICT_CODE} value={group.module} />,
        children: group.apis.map((api) => {
          const effect = permissionEffects[api.id] ?? 'none';
          const effectLabel = t(getPermissionEffectMessageKey(effect, API_EFFECT_I18N_PREFIX));

          return {
            key: `api-${api.id}`,
            selectable: false,
            isLeaf: true,
            title: (
              <Flex align="center" gap={8}>
                <PermissionEffectCheckbox
                  name={api.name}
                  effect={effect}
                  effectLabel={effectLabel}
                  onToggle={() => handleToggleApi(api.id)}
                />
                <Typography.Text>{api.name}</Typography.Text>
                <Typography.Text type="secondary">{api.code}</Typography.Text>
                <Tag color={effect === 'Allow' ? 'green' : effect === 'Deny' ? 'red' : 'default'}>
                  {effectLabel}
                </Tag>
              </Flex>
            ),
          };
        }),
      }))
    );

    return toTreeNodes(filteredGroups);
  }, [filteredGroups, handleToggleApi, permissionEffects, t]);

  useEffect(() => {
    if (!resourceKeyword.trim() && !moduleFilter) return;
    setExpandedKeys(collectExpandableKeys(filteredGroups));
  }, [filteredGroups, resourceKeyword, moduleFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spin />
      </div>
    );
  }

  return (
    <Row gutter={16} style={{ height: '100%' }}>
      <Col xs={24} lg={6}>
        <SubjectSelector
          activeType={activeType}
          keyword={subjectKeyword}
          orgSubjects={orgs}
          roleSubjects={roles}
          userSubjects={users}
          selectedSubject={selectedSubject}
          onTypeChange={(type) => {
            setActiveType(type);
            setSubjectKeyword('');
          }}
          onKeywordChange={setSubjectKeyword}
          onSelect={setSelectedSubject}
        />
      </Col>
      <Col xs={24} lg={18}>
        <Card
          title={t('auth.apiPermission.title')}
          extra={
            <Access permission={AUTH_BUTTON_PERMISSION_CODES} mode="any" fallback={null}>
              <Button type="primary" loading={saving} onClick={() => void handleSave()}>
                {t('auth.apiPermission.actions.save')}
              </Button>
            </Access>
          }
          styles={{ body: { padding: 14, maxHeight: 'calc(100vh - 280px)', overflow: 'auto' } }}
        >
          <Flex wrap="wrap" gap={8} style={{ marginBottom: 12 }}>
            <Input.Search
              placeholder={t('auth.apiPermission.searchPlaceholder')}
              value={resourceKeyword}
              onChange={(e) => setResourceKeyword(e.target.value)}
              style={{ width: 280 }}
            />
            <Select
              allowClear
              placeholder={t('auth.apiPermission.modulePlaceholder')}
              value={moduleFilter}
              options={moduleOptions}
              onChange={(value: string | undefined) => setModuleFilter(value)}
              style={{ width: 200 }}
            />
            <Button disabled={saving} onClick={() => handleBulkSet('Allow')}>
              {t('auth.apiPermission.actions.allowAll')}
            </Button>
            <Button disabled={saving} onClick={() => handleBulkSet('Deny')}>
              {t('auth.apiPermission.actions.denyAll')}
            </Button>
            <Button disabled={saving} onClick={() => handleBulkSet('none')}>
              {t('auth.apiPermission.actions.clearAll')}
            </Button>
          </Flex>
          {treeData.length === 0 ? (
            <Empty description={t('auth.apiPermission.emptyText')} />
          ) : (
            <Tree
              expandedKeys={expandedKeys}
              onExpand={setExpandedKeys}
              selectable={false}
              treeData={treeData}
            />
          )}
        </Card>
      </Col>
    </Row>
  );
}

export default ApiPermissionPage;
