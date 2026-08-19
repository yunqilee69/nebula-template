import { Form, Input, Modal } from 'antd';
import type { FormInstance } from 'antd';
import { DictSelect } from '@/components/dict-select';
import type { ChannelTargetFormState, ChannelTargetFormValues } from './channel-target-page-helpers';
import { NOTIFY_CHANNEL_TYPE } from './channel-target-page-helpers';

interface ChannelTargetFormModalProps {
  readonly form: FormInstance<ChannelTargetFormValues>;
  readonly formState: ChannelTargetFormState;
  readonly open: boolean;
  readonly submitting: boolean;
  readonly detailLoading: boolean;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
}

export function ChannelTargetFormModal({
  form,
  formState,
  open,
  submitting,
  detailLoading,
  onSubmit,
  onCancel,
}: ChannelTargetFormModalProps) {
  const disabled = submitting || detailLoading;

  return (
    <Modal
      title={formState.mode === 'create' ? '新增渠道目标' : '编辑渠道目标'}
      open={open}
      width={720}
      okText="保存"
      cancelText="取消"
      confirmLoading={submitting}
      loading={detailLoading}
      forceRender
      destroyOnHidden
      onOk={onSubmit}
      onCancel={onCancel}
    >
      <Form<ChannelTargetFormValues> form={form} layout="vertical" disabled={disabled}>
        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item
            name="targetName"
            label="目标名称"
            rules={[{ required: true, whitespace: true, message: '目标名称不能为空' }]}
          >
            <Input placeholder="请输入目标名称" />
          </Form.Item>

          <Form.Item
            name="channelType"
            label="通知渠道"
            rules={[{ required: true, message: '请选择通知渠道' }]}
          >
            <DictSelect dictCode={NOTIFY_CHANNEL_TYPE} placeholder="请选择通知渠道" showDisabled={false} />
          </Form.Item>
        </div>

        <Form.Item
          name="endpointUrl"
          label="目标地址"
          rules={[{ required: true, whitespace: true, message: '目标地址不能为空' }]}
        >
          <Input placeholder="请输入完整 webhook URL 或目标地址" autoComplete="off" />
        </Form.Item>

        <Form.Item name="configJson" label="扩展配置 JSON">
          <Input.TextArea rows={3} placeholder="可选，如 {&quot;rateLimit&quot;:20}" />
        </Form.Item>

        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} placeholder="请输入备注" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
