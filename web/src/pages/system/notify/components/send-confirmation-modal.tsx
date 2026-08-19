import { Descriptions, Modal, Space, Tag, Typography } from 'antd';
import type { ValidSendPlan } from './send-page-helpers';

export type SendConfirmationModalProps = {
  readonly open: boolean;
  readonly plan: ValidSendPlan | undefined;
  readonly confirming: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
};

export function SendConfirmationModal({
  open,
  plan,
  confirming,
  onConfirm,
  onCancel,
}: SendConfirmationModalProps) {
  return (
    <Modal
      title="确认发送"
      aria-label="确认发送"
      open={open}
      okText="确认发送"
      cancelText="取消"
      confirmLoading={confirming}
      onOk={onConfirm}
      onCancel={onCancel}
    >
      {plan ? (
        <Space orientation="vertical" size="middle" className="w-full">
          <Typography.Text>
            请核对渠道与接收人数。确认后将以一次请求提交全部投递。
          </Typography.Text>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="渠道">
              <Space wrap>
                {plan.request.channelTypes.map((channel) => <Tag key={channel}>{channel}</Tag>)}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="渠道数">
              <span data-count="channels">{plan.counts.channelCount}</span>
            </Descriptions.Item>
            <Descriptions.Item label="合并后用户数">
              <span data-count="selected-users">{plan.counts.selectedUserCount}</span>
            </Descriptions.Item>
            <Descriptions.Item label="站内信接收人数">
              <span data-count="site-recipients">{plan.counts.siteRecipientCount}</span>
            </Descriptions.Item>
            <Descriptions.Item label="邮件接收人数">
              <span data-count="email-recipients">{plan.counts.emailRecipientCount}</span>
            </Descriptions.Item>
            <Descriptions.Item label="无邮箱排除人数">
              <span data-count="email-excluded">{plan.counts.emailExcludedCount}</span>
            </Descriptions.Item>
            <Descriptions.Item label="企业微信群目标数">
              <span data-count="wecom-targets">{plan.counts.wecomTargetCount}</span>
            </Descriptions.Item>
            <Descriptions.Item label="飞书群目标数">
              <span data-count="feishu-targets">{plan.counts.feishuTargetCount}</span>
            </Descriptions.Item>
            <Descriptions.Item label="钉钉群目标数">
              <span data-count="dingtalk-targets">{plan.counts.dingtalkTargetCount}</span>
            </Descriptions.Item>
          </Descriptions>
        </Space>
      ) : null}
    </Modal>
  );
}
