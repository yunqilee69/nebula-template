import { QuestionCircleOutlined } from '@ant-design/icons';
import { Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import type { FormInstance } from 'antd';
import type { CategoryFormState, CategoryFormValues } from './category-page-helpers';
import { DEFAULT_CATEGORY_SORT, NOTIFY_USER_CHANNEL_OPTIONS } from './category-page-helpers';

/** 字段说明图标：给表单字段挂 tooltip，并让读屏用户听到具体是哪个参数的说明。 */
function fieldTooltip(title: string, field: string) {
  return { title, icon: <QuestionCircleOutlined aria-label={`${field}参数说明`} /> };
}

interface CategoryFormModalProps {
  readonly form: FormInstance<CategoryFormValues>;
  readonly formState: CategoryFormState;
  readonly open: boolean;
  readonly submitting: boolean;
  readonly detailLoading: boolean;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
}

export function CategoryFormModal({
  form,
  formState,
  open,
  submitting,
  detailLoading,
  onSubmit,
  onCancel,
}: CategoryFormModalProps) {
  const disabled = submitting || detailLoading;
  const editing = formState.mode === 'update';

  return (
    <Modal
      title={editing ? '编辑通知类别' : '新增通知类别'}
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
      <Form<CategoryFormValues> form={form} layout="vertical" disabled={disabled}>
        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item
            name="code"
            label="类别编码"
            tooltip={fieldTooltip('编码是模板、发送记录与用户偏好共同引用的唯一键，创建后不可修改；内置类别的编码不可改。', '类别编码')}
            extra={editing ? '编码是模板与用户偏好引用的键，创建后不可修改' : '仅支持字母、数字与下划线，且以字母开头'}
            normalize={(value: string | undefined) => value?.trim()}
            rules={editing ? [] : [
              { required: true, whitespace: true, message: '类别编码不能为空' },
              { pattern: /^[A-Za-z][A-Za-z0-9_]*$/, message: '类别编码只能包含字母、数字和下划线，且以字母开头' },
              { max: 32, message: '类别编码长度不能超过 32' },
            ]}
          >
            <Input placeholder="如 ORDER_REMINDER" disabled={editing} autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="name"
            label="类别名称"
            tooltip={fieldTooltip('展示在消息设置页，供用户识别这类通知包含什么内容。', '类别名称')}
            rules={[{ required: true, whitespace: true, message: '类别名称不能为空' }, { max: 50, message: '类别名称长度不能超过 50' }]}
          >
            <Input placeholder="如 订单提醒" />
          </Form.Item>
        </div>

        <Form.Item
          name="allowedChannels"
          label="允许渠道"
          tooltip={fieldTooltip('类别只在这些渠道上参与用户偏好判定并发送；不在名单内的渠道一律不发送、也不出现在消息设置页。站内信是兜底通道，建议每个类别都保留。', '允许渠道')}
          extra="类别只在这些渠道上参与用户偏好判定；不在名单内的渠道一律不发送"
          rules={[{ required: true, message: '请至少选择一个渠道' }]}
        >
          <Select
            mode="multiple"
            allowClear
            aria-label="允许渠道"
            placeholder="请选择允许渠道"
            options={[...NOTIFY_USER_CHANNEL_OPTIONS]}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="类别说明"
          tooltip={fieldTooltip('展示在消息设置页，帮助用户判断要不要关闭这类通知。', '类别说明')}
          rules={[{ max: 200, message: '类别说明长度不能超过 200' }]}
        >
          <Input.TextArea rows={2} placeholder="展示在消息设置页，说明这类通知的用途" />
        </Form.Item>

        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item
            name="mandatory"
            label="强制类别"
            tooltip={fieldTooltip('开启后忽略用户偏好、始终放行，消息设置页整组置灰不可关闭；仅账号安全类提醒应开启。', '强制类别')}
            valuePropName="checked"
          >
            <Switch aria-label="强制类别" checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          <Form.Item
            name="defaultEnabled"
            label="默认开启"
            tooltip={fieldTooltip('用户尚未保存过该类别开关时的初始值；用户保存过之后以用户自己的设置为准。', '默认开启')}
            valuePropName="checked"
          >
            <Switch aria-label="默认开启" checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          <Form.Item
            name="enabled"
            label="启用"
            tooltip={fieldTooltip('停用后不出现在消息设置页，也不能被新模板选中；存量模板仍按原类别判定，不受影响。内置类别不可删除，只能停用。', '启用')}
            valuePropName="checked"
          >
            <Switch aria-label="启用" checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
          <Form.Item
            name="sort"
            label="排序号"
            tooltip={fieldTooltip('决定消息设置页与类别列表的展示顺序；留空按默认 100 处理。', '排序号')}
            extra="值越小越靠前"
          >
            <InputNumber min={0} max={9999} step={10} className="w-full" placeholder={String(DEFAULT_CATEGORY_SORT)} />
          </Form.Item>
        </div>

        <Form.Item
          name="remark"
          label="备注"
          tooltip={fieldTooltip('仅管理端可见的备忘信息，不会展示给用户。', '备注')}
          rules={[{ max: 500, message: '备注长度不能超过 500' }]}
        >
          <Input.TextArea rows={2} placeholder="请输入备注" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
