import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Empty, Flex, Input, Row, Spin, Tag, Tree, Typography, theme as antdTheme } from 'antd';
import type { TreeProps } from 'antd';
import { Access } from '@/components/access';
import { AUTH_BUTTON_PERMISSION_CODES } from '@/constants/auth-button-codes';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { permissionService as defaultPermissionService } from '@/api/permission';
import type { PermissionService } from '@/api/permission';
import type { ButtonResp, MenuTreeResp } from '@/types/menu';
import type {
  PermissionButtonResource,
  PermissionDraftEffect,
  PermissionGrantResp,
  PermissionMenuResource,
  PermissionResourceGroup,
  PermissionSubject,
  PermissionSubjectType,
  SaveSubjectPermissionItem,
} from '@/types/permission';
import { SubjectSelector } from '@/components/subject-selector';
import { syncSubjectPermissions } from '@/utils/permission-sync';

export interface ButtonPermissionPageProps {
  service?: PermissionService;
}

type ButtonsByMenuId = ReadonlyMap<string, readonly ButtonResp[]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getOptionalNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' ? value : undefined;
}

function mapButtonResource(button: unknown, menuId: string): PermissionButtonResource | undefined {
  if (!isRecord(button)) return undefined;
  const id = getOptionalString(button, 'id');
  const name = getOptionalString(button, 'name');
  const code = getOptionalString(button, 'code');
  if (!id || !name || !code) return undefined;

  return {
    id,
    type: 'BUTTON',
    name,
    code,
    description: getOptionalString(button, 'description') ?? getOptionalString(button, 'remark'),
    menuId: getOptionalString(button, 'menuId') ?? menuId,
    status: getOptionalNumber(button, 'status'),
  };
}

function getEmbeddedMenuButtons(menu: MenuTreeResp): unknown[] {
  if (!('buttons' in menu) || !Array.isArray(menu.buttons)) return [];
  return menu.buttons;
}

function getMenuButtons(menu: MenuTreeResp, buttonsByMenuId: ButtonsByMenuId): PermissionButtonResource[] {
  return [...getEmbeddedMenuButtons(menu), ...(buttonsByMenuId.get(menu.id) ?? [])].flatMap((button) => {
    const resource = mapButtonResource(button, menu.id);
    return resource ? [resource] : [];
  });
}

function mapMenuResource(menu: MenuTreeResp, buttonsByMenuId: ButtonsByMenuId): PermissionMenuResource {
  return {
    id: menu.id,
    parentId: menu.parentId,
    type: 'MENU',
    name: menu.name,
    code: menu.code,
    path: menu.path,
    description: menu.remark,
    status: menu.status,
    buttons: getMenuButtons(menu, buttonsByMenuId),
    children: menu.children?.map((child) => mapMenuResource(child, buttonsByMenuId)),
  };
}

function toButtonResourceGroups(menus: MenuTreeResp[], buttonsByMenuId: ButtonsByMenuId): PermissionResourceGroup[] {
  return [{
    key: 'menus',
    name: '菜单资源',
    menus: menus.map((menu) => mapMenuResource(menu, buttonsByMenuId)),
  }];
}

function collectMenuIds(menus: readonly MenuTreeResp[]): string[] {
  return menus.flatMap((menu) => [menu.id, ...collectMenuIds(menu.children ?? [])]);
}

async function loadButtonsByMenuId(service: PermissionService, menus: readonly MenuTreeResp[]): Promise<ButtonsByMenuId> {
  const buttonPages = await Promise.all(
    collectMenuIds(menus).map(async (menuId) => {
      const page = await service.pageButtons({ menuId, pageNum: 1, pageSize: 500 });
      return [menuId, page.data] as const;
    }),
  );
  return new Map(buttonPages);
}

function collectButtons(menus: PermissionMenuResource[]): PermissionButtonResource[] {
  return menus.flatMap((menu) => [
    ...menu.buttons,
    ...collectButtons(menu.children ?? []),
  ]);
}

function filterButtonMenuTree(menus: PermissionMenuResource[], keyword: string): PermissionMenuResource[] {
  const normalized = keyword.trim().toLowerCase();

  return menus.flatMap((menu) => {
    const menuMatches = `${menu.name} ${menu.code} ${menu.path ?? ''}`.toLowerCase().includes(normalized);
    const children = filterButtonMenuTree(menu.children ?? [], menuMatches ? '' : keyword);
    const buttons = menu.buttons.filter((button) => (
      !normalized || menuMatches || `${button.name} ${button.code}`.toLowerCase().includes(normalized)
    ));

    if (buttons.length === 0 && children.length === 0) return [];
    return [{ ...menu, buttons, children }];
  });
}

function collectExpandableKeys(menus: PermissionMenuResource[]): string[] {
  return menus.flatMap((menu) => {
    const children = menu.children ?? [];
    const currentKey = children.length > 0 || menu.buttons.length > 0 ? [`menu-${menu.id}`] : [];
    return [...currentKey, ...collectExpandableKeys(children)];
  });
}

function getNextPermissionEffect(effect: PermissionDraftEffect): PermissionDraftEffect {
  if (effect === 'none') return 'Allow';
  if (effect === 'Allow') return 'Deny';
  return 'none';
}

function toPermissionEffects(grants: PermissionGrantResp[]): Record<string, PermissionDraftEffect> {
  return Object.fromEntries(grants.map((grant) => [grant.resourceId, grant.effect]));
}

function getPermissionEffectMessageKey(effect: PermissionDraftEffect) {
  if (effect === 'Allow') return 'auth.buttonPermission.effects.allow' as const;
  if (effect === 'Deny') return 'auth.buttonPermission.effects.deny' as const;
  return 'auth.buttonPermission.effects.none' as const;
}

export function ButtonPermissionPage({ service: serviceProp }: ButtonPermissionPageProps) {
  const service = serviceProp ?? defaultPermissionService;
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const { token } = antdTheme.useToken();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeType, setActiveType] = useState<PermissionSubjectType>('ORG');
  const [subjectKeyword, setSubjectKeyword] = useState('');
  const [resourceKeyword, setResourceKeyword] = useState('');
  const [orgs, setOrgs] = useState<PermissionSubject[]>([]);
  const [roles, setRoles] = useState<PermissionSubject[]>([]);
  const [users, setUsers] = useState<PermissionSubject[]>([]);
  const [resources, setResources] = useState<PermissionResourceGroup[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<PermissionSubject>();
  const [permissionEffects, setPermissionEffects] = useState<Record<string, PermissionDraftEffect>>({});
  const [loadedPermissions, setLoadedPermissions] = useState<PermissionGrantResp[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    let mounted = true;

    Promise.all([service.listSubjects(), service.listMenuTree()])
      .then(async ([subjects, menus]) => {
        const buttonsByMenuId = await loadButtonsByMenuId(service, menus);
        if (!mounted) return;
        const groups = toButtonResourceGroups(menus, buttonsByMenuId);
        setOrgs(subjects.orgs);
        setRoles(subjects.roles);
        setUsers(subjects.users);
        setResources(groups);
        setSelectedSubject(subjects.orgs[0] ?? subjects.roles[0] ?? subjects.users[0]);
        setExpandedKeys(groups.flatMap((group) => (
          collectExpandableKeys(filterButtonMenuTree(group.menus, ''))
        )));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [service]);

  useEffect(() => {
    if (!selectedSubject) return;

    let mounted = true;

    service
      .pageSubjectPermissions({ subjectType: selectedSubject.type, subjectId: selectedSubject.id, resourceType: 'BUTTON' })
      .then((page) => {
        if (!mounted) return;
        setLoadedPermissions(page.data);
        setPermissionEffects(toPermissionEffects(page.data));
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        notice.error(t('auth.permissionConfig.feedback.loadFailed'));
        console.error('Failed to load permissions:', error);
      });

    return () => {
      mounted = false;
    };
  }, [selectedSubject, service, notice, t]);

  const handleToggleButton = useCallback((buttonId: string) => {
    setPermissionEffects((prev) => {
      const next = { ...prev };
      const nextEffect = getNextPermissionEffect(prev[buttonId] ?? 'none');
      if (nextEffect === 'none') {
        delete next[buttonId];
      } else {
        next[buttonId] = nextEffect;
      }
      return next;
    });
  }, []);

  const allButtons = useMemo(
    () => resources.flatMap((group) => collectButtons(group.menus)),
    [resources],
  );

  const handleSave = useCallback(async () => {
    if (!selectedSubject) return;

    setSaving(true);
    try {
      const permissions = allButtons.flatMap((button) => {
        const effect = permissionEffects[button.id] ?? 'none';
        if (effect === 'none') return [];
        return [{
          resourceType: 'BUTTON' as const,
          resourceId: button.id,
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
      notice.success(t('auth.buttonPermission.feedback.saveSuccess'));
    } catch (error) {
      notice.error(t('auth.buttonPermission.feedback.saveFailed'));
      console.error('Failed to save permissions:', error);
    } finally {
      setSaving(false);
    }
  }, [selectedSubject, service, allButtons, permissionEffects, loadedPermissions, notice, t]);

  const handleBulkSet = useCallback((effect: PermissionDraftEffect) => {
    if (effect === 'none') {
      setPermissionEffects({});
      return;
    }
    setPermissionEffects(Object.fromEntries(allButtons.map((button) => [button.id, effect])));
  }, [allButtons]);

  const filteredGroups = useMemo(
    () => resources.flatMap((group) => {
      const menus = filterButtonMenuTree(group.menus, resourceKeyword);
      return menus.length > 0 ? [{ group, menus }] : [];
    }),
    [resources, resourceKeyword],
  );

  const treeData = useMemo(() => {
    const toTreeNodes = (items: PermissionMenuResource[]): NonNullable<TreeProps['treeData']> => items.map((menu) => ({
      key: `menu-${menu.id}`,
      selectable: false,
      title: (
        <span>
          {menu.name} {menu.path ? <Tag color="blue">{menu.path}</Tag> : null}
        </span>
      ),
      children: [
        ...toTreeNodes(menu.children ?? []),
        ...menu.buttons.map((button) => ({
          key: `button-${button.id}`,
          selectable: false,
          isLeaf: true,
          title: (
            <Flex align="center" gap={8}>
              <button
                type="button"
                role="checkbox"
                aria-checked={(permissionEffects[button.id] ?? 'none') === 'Allow' ? 'true' : (permissionEffects[button.id] ?? 'none') === 'Deny' ? 'mixed' : 'false'}
                aria-label={`${button.name} ${t(getPermissionEffectMessageKey(permissionEffects[button.id] ?? 'none'))}`}
                data-permission-effect={permissionEffects[button.id] ?? 'none'}
                onClick={(event) => {
                  event.stopPropagation();
                  handleToggleButton(button.id);
                }}
                style={{
                  width: 16,
                  height: 16,
                  padding: 0,
                  borderRadius: token.borderRadiusSM,
                  border: `1px solid ${(permissionEffects[button.id] ?? 'none') === 'Allow'
                    ? token.colorPrimary
                    : (permissionEffects[button.id] ?? 'none') === 'Deny'
                      ? token.colorError
                      : token.colorBorder}`,
                  background: (permissionEffects[button.id] ?? 'none') === 'Allow'
                    ? token.colorPrimary
                    : (permissionEffects[button.id] ?? 'none') === 'Deny'
                      ? token.colorError
                      : token.colorBgContainer,
                  color: token.colorTextLightSolid,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  lineHeight: 1,
                }}
              >
                {(permissionEffects[button.id] ?? 'none') === 'Allow' ? '✓' : (permissionEffects[button.id] ?? 'none') === 'Deny' ? '×' : ''}
              </button>
              <Typography.Text>{button.name}</Typography.Text>
              <Typography.Text type="secondary">{button.code}</Typography.Text>
              <Tag color={(permissionEffects[button.id] ?? 'none') === 'Allow' ? 'green' : (permissionEffects[button.id] ?? 'none') === 'Deny' ? 'red' : 'default'}>
                {t(getPermissionEffectMessageKey(permissionEffects[button.id] ?? 'none'))}
              </Tag>
            </Flex>
          ),
        })),
      ],
    }));

    return filteredGroups.flatMap(({ menus }) => toTreeNodes(menus));
  }, [filteredGroups, handleToggleButton, permissionEffects, t, token]);

  useEffect(() => {
    if (!resourceKeyword.trim()) return;
    setExpandedKeys(filteredGroups.flatMap(({ menus }) => collectExpandableKeys(menus)));
  }, [filteredGroups, resourceKeyword]);

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
          title={t('auth.buttonPermission.title')}
          extra={
            <Access permission={AUTH_BUTTON_PERMISSION_CODES} mode="any" fallback={null}>
              <Button type="primary" loading={saving} onClick={handleSave}>
                {t('auth.buttonPermission.actions.save')}
              </Button>
            </Access>
          }
          styles={{ body: { padding: 14, maxHeight: 'calc(100vh - 280px)', overflow: 'auto' } }}
        >
          <Flex wrap="wrap" gap={8} style={{ marginBottom: 12 }}>
            <Input.Search
              placeholder={t('auth.buttonPermission.searchPlaceholder')}
              value={resourceKeyword}
              onChange={(e) => setResourceKeyword(e.target.value)}
              style={{ width: 280 }}
            />
            <Button disabled={saving} onClick={() => handleBulkSet('Allow')}>
              {t('auth.buttonPermission.actions.allowAll')}
            </Button>
            <Button disabled={saving} onClick={() => handleBulkSet('Deny')}>
              {t('auth.buttonPermission.actions.denyAll')}
            </Button>
            <Button disabled={saving} onClick={() => handleBulkSet('none')}>
              {t('auth.buttonPermission.actions.clearAll')}
            </Button>
          </Flex>
          {treeData.length === 0 ? (
            <Empty description={t('auth.buttonPermission.emptyText')} />
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

export default ButtonPermissionPage;
