import { Button, Form, Modal, Space, TreeSelect } from 'antd';
import { useEffect, useMemo } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { OrgTreeResp } from '@/types/auth-management';

interface MoveOrgModalProps {
  readonly open: boolean;
  readonly org: OrgTreeResp | undefined;
  readonly tree: OrgTreeResp[];
  readonly submitting: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (newParentId: string) => void;
}

interface MoveOrgFormValues {
  readonly parentId: string;
}

interface OrgTreeSelectNode {
  readonly value: string;
  readonly title: string;
  readonly children?: OrgTreeSelectNode[];
}

export function filterTreeForMove(items: readonly OrgTreeResp[], excludeId: string): OrgTreeResp[] {
  return items.flatMap((item) => {
    if (item.id === excludeId) return [];
    const nextChildren = item.children ? filterTreeForMove(item.children, excludeId) : [];
    const { children: _children, ...itemWithoutChildren } = item;
    return nextChildren.length > 0 ? [{ ...itemWithoutChildren, children: nextChildren }] : [itemWithoutChildren];
  });
}

export function toTreeSelectData(items: readonly OrgTreeResp[]): OrgTreeSelectNode[] {
  return items.map((item) => {
    const nextChildren = item.children ? toTreeSelectData(item.children) : [];
    return nextChildren.length > 0
      ? { value: item.id, title: item.name, children: nextChildren }
      : { value: item.id, title: item.name };
  });
}

export function MoveOrgModal({ open, org, tree, submitting, onClose, onSubmit }: MoveOrgModalProps) {
  const { t } = useNebulaI18n();
  const [form] = Form.useForm<MoveOrgFormValues>();
  const parentId = Form.useWatch('parentId', form);
  const selectableTree = useMemo(() => toTreeSelectData(org ? filterTreeForMove(tree, org.id) : tree), [org, tree]);

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [form, open]);

  async function submit() {
    const values = await form.validateFields();
    onSubmit(values.parentId);
  }

  return (
    <Modal
      open={open}
      title={t('auth.orgManagement.moveOrg.title')}
      onCancel={onClose}
      destroyOnHidden
      footer={(
        <Space>
          <Button onClick={onClose} disabled={submitting}>
            {t('auth.orgManagement.actions.cancel')}
          </Button>
          <Button type="primary" loading={submitting} disabled={!parentId} onClick={() => void submit()}>
            {t('auth.orgManagement.actions.move')}
          </Button>
        </Space>
      )}
    >
      <Form form={form} layout="vertical" disabled={submitting}>
        <Form.Item
          name="parentId"
          label={t('auth.orgManagement.moveOrg.selectParent')}
          rules={[{ required: true, message: t('auth.orgManagement.moveOrg.placeholder') }]}
        >
          <TreeSelect
            treeData={selectableTree}
            treeDefaultExpandAll
            placeholder={t('auth.orgManagement.moveOrg.placeholder')}
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
