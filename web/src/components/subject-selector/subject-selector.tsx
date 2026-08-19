import { Card, Empty, Flex, Input, Segmented, Tag, Typography, theme as antdTheme } from 'antd';
import { useMemo } from 'react';
import { OrgTree } from '@/components/org-tree';
import type { OrgTreeResp } from '@/types/auth-management';
import type { PermissionSubject, PermissionSubjectType } from '@/types/permission';
import type { SubjectSelectorProps } from './types';

function toOrgTreeResp(subjects: PermissionSubject[]): OrgTreeResp[] {
  return subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    code: subject.code,
    status: 1 as const,
    type: 'DEPARTMENT' as const,
    children: subject.children ? toOrgTreeResp(subject.children) : undefined,
  }));
}

function flattenSubjects(subjects: PermissionSubject[]): PermissionSubject[] {
  return subjects.flatMap((subject) => [subject, ...flattenSubjects(subject.children ?? [])]);
}

function filterSubjectTree(subjects: PermissionSubject[], keyword: string): PermissionSubject[] {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return subjects;

  return subjects.flatMap((subject) => {
    const children = filterSubjectTree(subject.children ?? [], keyword);
    const matched = `${subject.name} ${subject.code} ${subject.description ?? ''}`.toLowerCase().includes(normalized);
    if (!matched && children.length === 0) return [];
    return [{ ...subject, children }];
  });
}

function filterSubjects(subjects: PermissionSubject[], keyword: string): PermissionSubject[] {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return subjects;
  return subjects.filter((subject) =>
    `${subject.name} ${subject.code} ${subject.description ?? ''}`.toLowerCase().includes(normalized),
  );
}

export function SubjectSelector({
  activeType,
  keyword,
  orgSubjects,
  roleSubjects,
  userSubjects,
  selectedSubject,
  onTypeChange,
  onKeywordChange,
  onSelect,
}: SubjectSelectorProps) {
  const { token } = antdTheme.useToken();

  const flatOrgs = useMemo(() => flattenSubjects(orgSubjects), [orgSubjects]);
  const filteredOrgTree = useMemo(() => filterSubjectTree(orgSubjects, keyword), [orgSubjects, keyword]);

  const currentSubjects = activeType === 'ROLE' ? roleSubjects : activeType === 'USER' ? userSubjects : flatOrgs;
  const filteredSubjects = filterSubjects(currentSubjects, keyword);

  const orgTreeData = useMemo(
    () => toOrgTreeResp(filteredOrgTree),
    [filteredOrgTree],
  );

  const segmentOptions = useMemo(() => [
    { value: 'ORG', label: '组织' },
    { value: 'ROLE', label: '角色' },
    { value: 'USER', label: '用户' },
  ], []);

  const searchPlaceholder = activeType === 'ORG' ? '搜索组织' : activeType === 'ROLE' ? '搜索角色' : '搜索用户';

  return (
    <Card
      styles={{
        body: {
          padding: token.paddingMD,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        },
      }}
      style={{ height: '100%' }}
    >
      <Flex vertical gap={token.marginSM}>
        <Segmented
          block
          options={segmentOptions}
          value={activeType}
          onChange={(value) => onTypeChange(value as PermissionSubjectType)}
        />

        <Input.Search
          placeholder={searchPlaceholder}
          value={keyword}
          allowClear
          onChange={(event) => onKeywordChange(event.target.value)}
        />
      </Flex>

      <div style={{ flex: 1, minHeight: 0, marginTop: token.marginSM }}>
        {activeType === 'ORG' ? (
          <OrgTree
            dataSource={orgTreeData}
            selectedKey={selectedSubject?.id}
            showStatusTags={false}
            searchable={false}
            title={null}
            extra={null}
            style={{
              border: 'none',
              padding: 0,
              background: 'transparent',
              minHeight: 'auto',
            }}
            onSelect={(orgId) => {
              const subject = flatOrgs.find((item) => item.id === orgId);
              if (subject) onSelect(subject);
            }}
          />
        ) : (
          filteredSubjects.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={activeType === 'ROLE' ? '暂无角色数据' : '暂无用户数据'}
              style={{ marginTop: 40 }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: token.marginXXS,
                maxHeight: 'calc(100vh - 320px)',
                overflow: 'auto',
              }}
            >
              {filteredSubjects.map((subject) => {
                const isSelected = subject.id === selectedSubject?.id;
                return (
                  <Flex
                    key={subject.id}
                    align="center"
                    justify="space-between"
                    onClick={() => onSelect(subject)}
                    style={{
                      padding: `${token.paddingXS}px ${token.paddingSM}px`,
                      borderRadius: token.borderRadius,
                      cursor: 'pointer',
                      background: isSelected ? token.colorPrimaryBg : undefined,
                      border: `1px solid ${isSelected ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = token.colorFillAlter;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <Flex vertical gap={0}>
                      <Typography.Text strong={isSelected}>{subject.name}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                        {subject.code}{subject.description ? ` · ${subject.description}` : ''}
                      </Typography.Text>
                    </Flex>
                    {isSelected && (
                      <Tag color="processing">已选中</Tag>
                    )}
                  </Flex>
                );
              })}
            </div>
          )
        )}
      </div>
    </Card>
  );
}