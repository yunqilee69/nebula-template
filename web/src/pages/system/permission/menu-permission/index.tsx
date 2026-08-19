import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Empty, Flex, Input, Row, Spin, Switch, Tree, Tag, Typography, theme as antdTheme } from 'antd';
import type { TreeProps } from 'antd';
import { Access } from '@/components/access';
import { AUTH_BUTTON_PERMISSION_CODES } from '@/constants/auth-button-codes';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { permissionService as defaultPermissionService } from '@/api/permission';
import type { PermissionService } from '@/api/permission';
import type { MenuTreeResp } from '@/types/menu';
import type {
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

export interface MenuPermissionPageProps {
  service?: PermissionService;
}

function collectMenus(menus: PermissionMenuResource[]): PermissionMenuResource[] {
  return menus.flatMap((menu) => [menu, ...collectMenus(menu.children ?? [])]);
}

function buildMenuTree(menus: PermissionMenuResource[]): PermissionMenuResource[] {
  if (menus.some((menu) => (menu.children ?? []).length > 0)) {
    return menus.map((menu) => ({
      ...menu,
      children: buildMenuTree(menu.children ?? []),
    }));
  }

  const nodes = new Map<string, PermissionMenuResource>();
  menus.forEach((menu) => nodes.set(menu.id, { ...menu, children: [] }));
  const roots: PermissionMenuResource[] = [];

  menus.forEach((menu) => {
    const node = nodes.get(menu.id);
    const parent = menu.parentId ? nodes.get(menu.parentId) : undefined;
    if (!node || !parent) {
      if (node) roots.push(node);
      return;
    }
    parent.children = [...(parent.children ?? []), node];
  });

  return roots;
}

function filterMenuTree(menus: PermissionMenuResource[], keyword: string): PermissionMenuResource[] {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return menus;

  return menus.flatMap((menu) => {
    const children = filterMenuTree(menu.children ?? [], keyword);
    const matches = `${menu.name} ${menu.code} ${menu.path ?? ''}`.toLowerCase().includes(normalized);
    if (!matches && children.length === 0) return [];
    return [{ ...menu, children: matches ? menu.children : children }];
  });
}

function collectExpandableKeys(menus: PermissionMenuResource[]): string[] {
  return menus.flatMap((menu) => {
    const children = menu.children ?? [];
    return children.length > 0 ? [menu.id, ...collectExpandableKeys(children)] : [];
  });
}

function getNextPermissionEffect(effect: PermissionDraftEffect): PermissionDraftEffect {
  if (effect === 'none') return 'Allow';
  if (effect === 'Allow') return 'Deny';
  return 'none';
}

function getPermissionStateLabel(effect: PermissionDraftEffect) {
  if (effect === 'Allow') return '授权权限';
  if (effect === 'Deny') return '拒绝权限';
  return '未设置权限';
}

function toPermissionEffects(grants: PermissionGrantResp[]): Record<string, PermissionDraftEffect> {
  return Object.fromEntries(grants.map((grant) => [grant.resourceId, grant.effect]));
}

function mapMenuResource(menu: MenuTreeResp): PermissionMenuResource {
  return {
    id: menu.id,
    parentId: menu.parentId,
    type: 'MENU',
    name: menu.name,
    code: menu.code,
    path: menu.path,
    description: menu.remark,
    status: menu.status,
    buttons: [],
    children: menu.children?.map(mapMenuResource),
  };
}

function toMenuResourceGroups(menus: MenuTreeResp[]): PermissionResourceGroup[] {
  return [{
    key: 'menus',
    name: '菜单资源',
    menus: menus.map(mapMenuResource),
  }];
}

export function MenuPermissionPage({ service: serviceProp }: MenuPermissionPageProps) {
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
  const [associateChildren, setAssociateChildren] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    let mounted = true;

    Promise.all([service.listSubjects(), service.listMenuTree()])
      .then(([subjects, menus]) => {
        if (!mounted) return;
        const groups = toMenuResourceGroups(menus);
        setOrgs(subjects.orgs);
        setRoles(subjects.roles);
        setUsers(subjects.users);
        setResources(groups);
        setSelectedSubject(subjects.orgs[0] ?? subjects.roles[0] ?? subjects.users[0]);
        setExpandedKeys(groups.flatMap((group) => [
          `group-${group.key}`,
          ...collectExpandableKeys(buildMenuTree(group.menus ?? [])),
        ]));
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
      .pageSubjectPermissions({ subjectType: selectedSubject.type, subjectId: selectedSubject.id, resourceType: 'MENU' })
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

  const handleSave = useCallback(async () => {
    if (!selectedSubject) return;

    setSaving(true);
    try {
      const permissions = resources.flatMap((group) =>
        collectMenus(buildMenuTree(group.menus ?? [])).flatMap((menu) => {
          const effect = permissionEffects[menu.id] ?? 'none';
          if (effect === 'none') return [];
          return [{
            resourceType: 'MENU' as const,
            resourceId: menu.id,
            effect,
            scope: 'ALL',
          } satisfies SaveSubjectPermissionItem];
        }),
      );

      const nextPermissions = await syncSubjectPermissions({
        service,
        subject: selectedSubject,
        existingPermissions: loadedPermissions,
        desiredPermissions: permissions,
      });
      setLoadedPermissions(nextPermissions);
      setPermissionEffects(toPermissionEffects(nextPermissions));
      notice.success(t('auth.permissionConfig.feedback.saveSuccess'));
    } catch (error) {
      notice.error('保存失败');
      console.error('Failed to save permissions:', error);
    } finally {
      setSaving(false);
    }
  }, [selectedSubject, service, resources, permissionEffects, loadedPermissions, notice, t]);

  const handleToggleMenuEffect = useCallback((menu: PermissionMenuResource) => {
    setPermissionEffects((prev) => {
      const nextEffect = getNextPermissionEffect(prev[menu.id] ?? 'none');
      const targetMenuIds = associateChildren
        ? collectMenus([menu]).map((item) => item.id)
        : [menu.id];
      const next = { ...prev };
      targetMenuIds.forEach((menuId) => {
        if (nextEffect === 'none') {
          delete next[menuId];
        } else {
          next[menuId] = nextEffect;
        }
      });
      return next;
    });
  }, [associateChildren]);

  const allMenus = useMemo(
    () => resources.flatMap((group) => collectMenus(buildMenuTree(group.menus ?? []))),
    [resources],
  );

  const filteredGroups = useMemo(
    () => resources.flatMap((group) => {
      const menus = filterMenuTree(buildMenuTree(group.menus ?? []), resourceKeyword);
      return menus.length > 0 ? [{ group, menus }] : [];
    }),
    [resources, resourceKeyword],
  );

  const treeData = useMemo(() => filteredGroups.map(({ group, menus }) => {
    const toTreeNodes = (items: PermissionMenuResource[]): NonNullable<TreeProps['treeData']> => items.map((menu) => ({
      title: (
        <Flex align="center" gap={8}>
          <button
            type="button"
            role="checkbox"
            aria-checked={(permissionEffects[menu.id] ?? 'none') === 'Allow' ? 'true' : (permissionEffects[menu.id] ?? 'none') === 'Deny' ? 'mixed' : 'false'}
            aria-label={`${menu.name} ${getPermissionStateLabel(permissionEffects[menu.id] ?? 'none')}`}
            data-permission-effect={permissionEffects[menu.id] ?? 'none'}
            onClick={(event) => {
              event.stopPropagation();
              handleToggleMenuEffect(menu);
            }}
            style={{
              width: 16,
              height: 16,
              padding: 0,
              borderRadius: 4,
              border: `1px solid ${(permissionEffects[menu.id] ?? 'none') === 'Allow'
                ? token.colorPrimary
                : (permissionEffects[menu.id] ?? 'none') === 'Deny'
                  ? token.colorError
                  : token.colorBorder}`,
              background: (permissionEffects[menu.id] ?? 'none') === 'Allow'
                ? token.colorPrimary
                : (permissionEffects[menu.id] ?? 'none') === 'Deny'
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
            {(permissionEffects[menu.id] ?? 'none') === 'Allow' ? '✓' : (permissionEffects[menu.id] ?? 'none') === 'Deny' ? '×' : ''}
          </button>
          <span>
            {menu.name} {menu.path && <Tag color="blue">{menu.path}</Tag>}
            <Tag color={(permissionEffects[menu.id] ?? 'none') === 'Allow' ? 'green' : (permissionEffects[menu.id] ?? 'none') === 'Deny' ? 'red' : 'default'}>
              {getPermissionStateLabel(permissionEffects[menu.id] ?? 'none')}
            </Tag>
          </span>
        </Flex>
      ),
      key: menu.id,
      children: toTreeNodes(menu.children ?? []),
    }));

    return {
      title: group.name,
      key: `group-${group.key}`,
      selectable: false,
      children: toTreeNodes(menus),
    };
  }), [filteredGroups, handleToggleMenuEffect, permissionEffects, token.colorBgContainer, token.colorBorder, token.colorError, token.colorPrimary, token.colorTextLightSolid]);

  useEffect(() => {
    if (!resourceKeyword.trim()) return;
    setExpandedKeys(filteredGroups.flatMap(({ group, menus }) => [
      `group-${group.key}`,
      ...collectExpandableKeys(menus),
    ]));
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
          title="菜单权限"
          extra={
            <Access permission={AUTH_BUTTON_PERMISSION_CODES} mode="any" fallback={null}>
              <Button type="primary" loading={saving} onClick={handleSave}>
                保存
              </Button>
            </Access>
          }
          styles={{ body: { padding: 14, maxHeight: 'calc(100vh - 280px)', overflow: 'auto' } }}
        >
          <Flex wrap="wrap" gap={8} style={{ marginBottom: 12 }}>
            <Input.Search
              placeholder="搜索菜单"
              value={resourceKeyword}
              onChange={(e) => setResourceKeyword(e.target.value)}
              style={{ width: 280 }}
            />
            <Flex align="center" gap={6} style={{ paddingInline: 4 }}>
              <Switch
                size="small"
                aria-label="关联子级"
                checked={associateChildren}
                onChange={setAssociateChildren}
              />
              <Typography.Text type="secondary">关联子级</Typography.Text>
            </Flex>
            <Button disabled={saving} onClick={() => setPermissionEffects(Object.fromEntries(allMenus.map((menu) => [menu.id, 'Allow' as const])))}>
              全部授权
            </Button>
            <Button
              disabled={saving}
              onClick={() => setPermissionEffects(Object.fromEntries(allMenus.map((menu) => [menu.id, 'Deny' as const])))}
            >
              全部拒绝
            </Button>
            <Button disabled={saving} onClick={() => setPermissionEffects({})}>
              全部取消
            </Button>
          </Flex>
          {treeData.length === 0 ? (
            <Empty description="暂无菜单资源" />
          ) : (
            <Tree
              expandedKeys={expandedKeys}
              onExpand={setExpandedKeys}
              treeData={treeData}
              selectable={false}
            />
          )}
        </Card>
      </Col>
    </Row>
  );
}

export default MenuPermissionPage;
