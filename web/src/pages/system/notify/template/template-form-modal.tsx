import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Modal, Select, Switch, Tabs, Typography } from 'antd';
import type { FormInstance } from 'antd';
import { DictLabel } from '@/components/dict-select';
import type { NotifyCategoryOption } from '../notify-category-options';
import type { NotifyTemplateFormState, NotifyTemplateFormValues } from './template-page-helpers';
import { ALL_CHANNEL_TYPES, NOTIFY_CHANNEL_TYPE, createDefaultVariants } from './template-page-helpers';
import { BuiltinVariableHelp, WeComWebhookHelp, FeishuWebhookHelp, DingTalkWebhookHelp } from './template-variable-panel';

interface TemplateFormModalProps {
  readonly form: FormInstance<NotifyTemplateFormValues>;
  readonly formState: NotifyTemplateFormState;
  readonly open: boolean;
  readonly submitting: boolean;
  readonly detailLoading: boolean;
  readonly categoryOptions: readonly NotifyCategoryOption[];
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
}

function sectionTitle(title: string) {
  return (
    <div className="flex items-center gap-2">
      <span>{title}</span>
      <BuiltinVariableHelp />
    </div>
  );
}

export function TemplateFormModal({
  form,
  formState,
  open,
  submitting,
  detailLoading,
  categoryOptions,
  onSubmit,
  onCancel,
}: TemplateFormModalProps) {
  const disabled = submitting || detailLoading;

  return (
    <Modal
      title={formState.mode === 'create' ? '新增通知模板' : '编辑通知模板'}
      open={open}
      width={900}
      confirmLoading={submitting}
      okText="保存"
      cancelText="取消"
      forceRender
      destroyOnHidden
      onOk={onSubmit}
      onCancel={onCancel}
    >
      <Form form={form} layout="vertical" disabled={disabled} initialValues={{ fields: [], variants: createDefaultVariants() }}>
        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item
            name="templateCode"
            label="模板编码"
            rules={[{ required: true, whitespace: true, message: '模板编码不能为空' }]}
          >
            <Input disabled={formState.mode === 'update'} placeholder="请输入模板编码" />
          </Form.Item>
          <Form.Item
            name="templateName"
            label="模板名称"
            rules={[{ required: true, whitespace: true, message: '模板名称不能为空' }]}
          >
            <Input placeholder="请输入模板名称" />
          </Form.Item>
          <Form.Item
            name="categoryCode"
            label="通知类别"
            extra="决定用户能否在消息设置里按类别关闭这类通知；不选则归入「其他通知」"
          >
            <Select allowClear placeholder="请选择通知类别" options={[...categoryOptions]} />
          </Form.Item>
        </div>

        <Form.List name="fields">
          {(fieldItems, { add, remove }) => (
            <Card
              size="small"
              title={sectionTitle('参数定义')}
              extra={<Button type="link" icon={<PlusOutlined />} onClick={() => add({ requiredFlag: false })}>新增字段</Button>}
              className="mb-4"
            >
              {fieldItems.length === 0 ? (
                <Typography.Text type="secondary">暂无参数定义，可从变体内容中自动识别变量。</Typography.Text>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr className="text-left text-[var(--nebula-color-text-secondary)]">
                        <th className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 font-medium">字段编码</th>
                        <th className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 font-medium">字段名称</th>
                        <th className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 font-medium">默认值</th>
                        <th className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 font-medium">示例值</th>
                        <th className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 font-medium">必填</th>
                        <th className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 font-medium">备注</th>
                        <th className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fieldItems.map((fieldItem) => (
                        <tr key={fieldItem.key}>
                          <td className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 align-top">
                            <Form.Item name={[fieldItem.name, 'id']} hidden><Input /></Form.Item>
                            <Form.Item
                              name={[fieldItem.name, 'fieldCode']}
                              rules={[{ required: true, whitespace: true, message: '字段编码不能为空' }]}
                              className="mb-0"
                            >
                              <Input aria-label="字段编码" placeholder="如 orderNo" />
                            </Form.Item>
                           </td>
                           <td className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 align-top">
                            <Form.Item
                              name={[fieldItem.name, 'fieldName']}
                              rules={[{ required: true, whitespace: true, message: '字段名称不能为空' }]}
                              className="mb-0"
                            >
                              <Input aria-label="字段名称" placeholder="如 订单号" />
                            </Form.Item>
                          </td>
                          <td className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 align-top">
                            <Form.Item name={[fieldItem.name, 'defaultValue']} className="mb-0">
                              <Input aria-label="默认值" placeholder="可选默认值" />
                            </Form.Item>
                          </td>                          <td className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 align-top">
                            <Form.Item name={[fieldItem.name, 'exampleValue']} className="mb-0">
                              <Input aria-label="示例值" placeholder="可选示例值" />
                            </Form.Item>
                          </td>
                          <td className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 align-top">
                            <Form.Item name={[fieldItem.name, 'requiredFlag']} valuePropName="checked" className="mb-0">
                              <Switch aria-label="是否必填" />
                           </Form.Item>
                          </td>
                          <td className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 align-top">
                            <Form.Item name={[fieldItem.name, 'remark']} className="mb-0">
                             <Input aria-label="备注" placeholder="字段说明" />
                            </Form.Item>
                          </td>
                          <td className="border-b border-solid border-[var(--nebula-color-border)] px-2 py-2 align-top">
                            <Button danger type="link" icon={<DeleteOutlined />} aria-label="删除字段" onClick={() => remove(fieldItem.name)}>删除</Button>
                          </td>
                         </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
           </Card>
          )}
        </Form.List>

        <Card
          size="small"
          title="渠道变体"
          className="mb-4"
        >
          <Tabs
            type="card"
            className="[&_.ant-tabs-tab-active]:!bg-[var(--nebula-color-bg-container)] [&_.ant-tabs-tab]:bg-[var(--nebula-color-bg-layout)] [&_.ant-tabs-nav]:mb-0"
            items={ALL_CHANNEL_TYPES.map((channelType, index) => ({
              key: channelType,
              // 每个渠道的字段都要注册，否则未激活页签的变体会在保存时被丢掉
              forceRender: true,
              label: <DictLabel dictCode={NOTIFY_CHANNEL_TYPE} value={channelType} showTag={false} />,
              children: (
                <div className="rounded-b-md border border-t-0 border-solid border-[var(--nebula-color-border)] p-3">
                  <div className="flex items-center gap-4 mb-3">
                    <Form.Item name={['variants', index, 'channelType']} hidden><Input /></Form.Item>
                    <Form.Item name={['variants', index, 'id']} hidden><Input /></Form.Item>
                    <Form.Item
                      name={['variants', index, 'enabled']}
                      valuePropName="checked"
                      className="mb-0"
                    >
                      <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                    </Form.Item>
                  </div>
                  <Form.Item name={['variants', index, 'subjectTemplate']} label="主题模板">
                    <Input.TextArea rows={2} placeholder="请输入主题模板，可使用 ${variableName} 变量" />
                  </Form.Item>
                  <Form.Item
                    name={['variants', index, 'contentTemplate']}
                    label={<span className="flex items-center gap-2">内容模板 {channelType === 'WECOM_GROUP_WEBHOOK' && <WeComWebhookHelp />}{channelType === 'FEISHU_GROUP_WEBHOOK' && <FeishuWebhookHelp />}{channelType === 'DINGTALK_GROUP_WEBHOOK' && <DingTalkWebhookHelp />}</span>}
                    rules={[{
                      validator: async (_rule, value: string | undefined) => {
                        if (form.getFieldValue(['variants', index, 'enabled']) && !value?.trim()) {
                          throw new Error('启用后内容模板不能为空');
                        }
                      },
                    }]}
                  >
                    <Input.TextArea rows={5} placeholder={"请输入内容模板，可使用 ${variableName} 变量"} />
                  </Form.Item>
                </div>
              ),
            }))}
          />
        </Card>

        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} placeholder="请输入备注" />
        </Form.Item>
      </Form>
</Modal>
  );
}