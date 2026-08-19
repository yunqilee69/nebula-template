import { Descriptions, Modal, Table, Tabs, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DictLabel } from '@/components/dict-select';
import type { NotifyTemplateDetailResp, NotifyTemplateFieldResp, NotifyTemplateVariantResp } from '@/types/notify';
import { NOTIFY_CHANNEL_TYPE } from './template-page-helpers';
import { BuiltinVariableHelp } from './template-variable-panel';

interface TemplateDetailModalProps {
  readonly open: boolean;
  readonly loading: boolean;
  readonly detail?: NotifyTemplateDetailResp;
  readonly onCancel: () => void;
}

function textOrDash(value: string | undefined): string {
  return value?.trim() || '-';
}

function sectionTitle(title: string) {
  return (
    <div className="flex items-center gap-2">
      <span>{title}</span>
      <BuiltinVariableHelp />
    </div>
  );
}

function variantTabKey(variant: NotifyTemplateVariantResp, index: number): string {
  return variant.id || `${variant.channelType}-${index}`;
}

const fieldColumns: ColumnsType<NotifyTemplateFieldResp> = [
  { title: '字段编码', dataIndex: 'fieldCode', width: 180, render: (value: string) => <Typography.Text code copyable>{value}</Typography.Text> },
  { title: '字段名称', dataIndex: 'fieldName', width: 160 },
  { title: '必填', dataIndex: 'requiredFlag', width: 80, render: (value: boolean | undefined) => value ? '是' : '否' },
  { title: '默认值', dataIndex: 'defaultValue', render: (value: string | undefined) => textOrDash(value) },
  { title: '示例值', dataIndex: 'exampleValue', render: (value: string | undefined) => textOrDash(value) },
  { title: '备注', dataIndex: 'remark', render: (value: string | undefined) => textOrDash(value) },
];

export function TemplateDetailModal({
  open,
  loading,
  detail,
  onCancel,
}: TemplateDetailModalProps) {
  return (
    <Modal
      title="模板详情"
      aria-label="模板详情"
      open={open}
      width={900}
      footer={null}
      loading={loading}
      destroyOnHidden
      onCancel={onCancel}
    >
      {detail ? (
        <div className="space-y-4">
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="模板编码">
              <Typography.Text code copyable>{detail.templateCode}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="模板名称">{detail.templateName}</Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>{textOrDash(detail.remark)}</Descriptions.Item>
          </Descriptions>
          <Table<NotifyTemplateFieldResp>
            title={() => sectionTitle('参数定义')}
            columns={fieldColumns}
            dataSource={[...(detail.fields ?? [])]}
            rowKey="id"
            pagination={false}
            size="small"
            locale={{ emptyText: '暂无参数定义' }}
            scroll={{ x: 'max-content' }}
          />
          <div className="rounded-md border border-solid border-[var(--nebula-color-border)] p-3">
            <div className="flex items-center gap-2">
              <span>渠道变体</span>
            </div>
            {(detail.variants ?? []).length > 0 ? (
              <Tabs
                className="mt-3"
                type="card"
                items={(detail.variants ?? []).map((variant, index) => ({
                  key: variantTabKey(variant, index),
                  label: <DictLabel dictCode={NOTIFY_CHANNEL_TYPE} value={variant.channelType} />,
                  children: (
                    <Descriptions bordered size="small" column={1}>
                      <Descriptions.Item label="主题模板">{textOrDash(variant.subjectTemplate)}</Descriptions.Item>
                      <Descriptions.Item label="内容模板">
                        <Typography.Paragraph className="m-0 whitespace-pre-wrap break-words" copyable>{variant.contentTemplate}</Typography.Paragraph>
                      </Descriptions.Item>
                      <Descriptions.Item label="变体备注">{textOrDash(variant.remark)}</Descriptions.Item>
                    </Descriptions>
                  ),
                }))}
              />
            ) : (
              <Typography.Text type="secondary">暂无渠道变体</Typography.Text>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
