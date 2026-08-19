import { QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Divider, Table, Tooltip, Typography } from 'antd';
import { createStyles } from 'antd-style';
import type { ColumnsType } from 'antd/es/table';
import type { ReactNode } from 'react';
import { WECOM_WEBHOOK_HELP_LINK, FEISHU_WEBHOOK_HELP_LINK, DINGTALK_WEBHOOK_HELP_LINK } from './template-page-helpers';
import type { TemplateVariable } from '@/types/notify';
import { SYSTEM_TEMPLATE_VARIABLES } from './template-page-helpers';

const builtinVariableColumns: ColumnsType<TemplateVariable> = [
  {
    title: '变量名',
    dataIndex: 'name',
    width: 280,
    render: (name: string) => <Typography.Text code copyable>{name}</Typography.Text>,
  },
  {
    title: '说明',
    dataIndex: 'description',
    render: (description: string | undefined) => description ?? '-',
  },
];

interface HelpIconProps {
  readonly title: ReactNode;
  readonly ariaLabel: string;
}

export function HelpIcon({ title, ariaLabel }: HelpIconProps) {
  return (
    <Tooltip placement="bottom" title={title}>
      <Button
        type="text"
        size="small"
        icon={<QuestionCircleOutlined />}
        aria-label={ariaLabel}
        className="text-[var(--nebula-color-text-secondary)]"
      />
    </Tooltip>
  );
}

export function BuiltinVariableHelp() {
  return (
    <HelpIcon
      ariaLabel="查看系统内置变量"
      title={(
        <Table<TemplateVariable>
          columns={builtinVariableColumns}
          dataSource={[...SYSTEM_TEMPLATE_VARIABLES]}
          pagination={false}
          rowKey="name"
          size="small"
          className="min-w-[440px]"
        />
      )}
    />
  );
}

const useWecomStyles = createStyles(({ token, css }) => ({
  tooltipContent: css`
    max-width: 480px;
    font-size: ${token.fontSizeSM}px;
    line-height: ${token.lineHeight};
  `,
  sectionTitle: css`
    display: block;
    font-weight: ${token.fontWeightStrong};
    margin-block-end: ${token.marginXS}px;
  `,
  codeBlock: css`
    margin-block: ${token.marginXS}px ${token.marginSM}px;
    white-space: pre-wrap;
    word-break: break-all;
  `,
  linkRow: css`
    display: inline-block;
    margin-block-start: ${token.marginSM}px;
  `,
  divider: css`
    margin-block: ${token.marginSM}px;
  `,
}));

export function WeComWebhookHelp() {
  const { styles } = useWecomStyles();
  return (
    <HelpIcon
      ariaLabel="查看企业微信群机器人消息格式说明"
      title={(
        <div className={styles.tooltipContent}>
          <Typography.Text strong>企业微信群机器人消息格式</Typography.Text>
          <Typography.Paragraph type="secondary" className={styles.codeBlock}>
            内容模板将作为完整的 JSON 直接发送到 Webhook 地址，请按企业微信消息推送格式填写。
          </Typography.Paragraph>
          <Divider className={styles.divider} />
          <Typography.Text strong className={styles.sectionTitle}>文本消息示例：</Typography.Text>
          <Typography.Paragraph code copyable className={styles.codeBlock}>
            {'{"msgtype":"text","text":{"content":"你好世界","mentioned_list":["@all"]}}'}
          </Typography.Paragraph>
          <Divider className={styles.divider} />
          <Typography.Text strong className={styles.sectionTitle}>Markdown 消息示例：</Typography.Text>
          <Typography.Paragraph code copyable className={styles.codeBlock}>
            {'{"msgtype":"markdown","markdown":{"content":"实时新增 <font color=\\"warning\\">132</font> 个用户"}}'}
          </Typography.Paragraph>
          <Divider className={styles.divider} />
          <Typography.Text strong className={styles.sectionTitle}>图文消息示例：</Typography.Text>
          <Typography.Paragraph code copyable className={styles.codeBlock}>
            {'{"msgtype":"news","news":{"articles":[{"title":"标题","url":"https://xxx","picurl":"https://xxx"}]}}'}
          </Typography.Paragraph>
          <Divider className={styles.divider} />
          <Typography.Text type="secondary">
            支持在 JSON 值中使用 {'${variableName}'} 引用模板参数和系统变量。
          </Typography.Text>
          <br />
          <Typography.Link className={styles.linkRow} href={WECOM_WEBHOOK_HELP_LINK} target="_blank" rel="noopener noreferrer">
            查看企业微信消息推送文档
          </Typography.Link>
        </div>
      )}
    />
  );
}

export function FeishuWebhookHelp() {
  const { styles } = useWecomStyles();
  return (
    <HelpIcon
      ariaLabel="查看飞书群机器人消息格式说明"
      title={(
        <div className={styles.tooltipContent}>
          <Typography.Text strong>飞书群机器人消息格式</Typography.Text>
          <Typography.Paragraph type="secondary" className={styles.codeBlock}>
            内容模板将作为完整的 JSON 直接发送到 Webhook 地址，请按飞书消息推送格式填写。
          </Typography.Paragraph>
          <Divider className={styles.divider} />
          <Typography.Text strong className={styles.sectionTitle}>文本消息示例：</Typography.Text>
          <Typography.Paragraph code copyable className={styles.codeBlock}>
            {'{"msg_type":"text","content":{"text":"你好世界"}}'}
          </Typography.Paragraph>
          <Divider className={styles.divider} />
          <Typography.Text strong className={styles.sectionTitle}>富文本消息示例：</Typography.Text>
          <Typography.Paragraph code copyable className={styles.codeBlock}>
            {'{"msg_type":"post","content":{"post":{"zh_cn":{"title":"标题","content":[[{"tag":"text","text":"你好世界"}]]}}}}'}
          </Typography.Paragraph>
          <Divider className={styles.divider} />
          <Typography.Text strong className={styles.sectionTitle}>卡片消息示例：</Typography.Text>
          <Typography.Paragraph code copyable className={styles.codeBlock}>
            {'{"msg_type":"interactive","card":{"elements":[{"tag":"div","text":{"tag":"lark_md","content":"你好世界"}}],"header":{"title":{"tag":"plain_text","content":"标题"}}}}'}
          </Typography.Paragraph>
          <Divider className={styles.divider} />
          <Typography.Text type="secondary">
            支持在 JSON 值中使用 {'${variableName}'} 引用模板参数和系统变量。
          </Typography.Text>
          <br />
          <Typography.Link className={styles.linkRow} href={FEISHU_WEBHOOK_HELP_LINK} target="_blank" rel="noopener noreferrer">
            查看飞书消息推送文档
          </Typography.Link>
        </div>
      )}
    />
  );
}

export function DingTalkWebhookHelp() {
  const { styles } = useWecomStyles();
  return (
    <HelpIcon
      ariaLabel="查看钉钉群机器人消息格式说明"
      title={(
        <div className={styles.tooltipContent}>
          <Typography.Text strong>钉钉群机器人消息格式</Typography.Text>
          <Typography.Paragraph type="secondary" className={styles.codeBlock}>
            内容模板将作为完整的 JSON 直接发送到 Webhook 地址，请按钉钉消息推送格式填写。
          </Typography.Paragraph>
          <Divider className={styles.divider} />
          <Typography.Text strong className={styles.sectionTitle}>文本消息示例：</Typography.Text>
          <Typography.Paragraph code copyable className={styles.codeBlock}>
            {'{"msgtype":"text","text":{"content":"你好世界"}}'}
          </Typography.Paragraph>
          <Divider className={styles.divider} />
          <Typography.Text strong className={styles.sectionTitle}>Markdown 消息示例：</Typography.Text>
          <Typography.Paragraph code copyable className={styles.codeBlock}>
            {'{"msgtype":"markdown","markdown":{"title":"标题","text":"你好世界"}}'}
          </Typography.Paragraph>
          <Divider className={styles.divider} />
          <Typography.Text strong className={styles.sectionTitle}>链接消息示例：</Typography.Text>
          <Typography.Paragraph code copyable className={styles.codeBlock}>
            {'{"msgtype":"link","link":{"title":"标题","text":"你好世界","messageUrl":"https://xxx","picUrl":"https://xxx"}}'}
          </Typography.Paragraph>
          <Divider className={styles.divider} />
          <Typography.Text type="secondary">
            支持在 JSON 值中使用 {'${variableName}'} 引用模板参数和系统变量。
          </Typography.Text>
          <br />
          <Typography.Link className={styles.linkRow} href={DINGTALK_WEBHOOK_HELP_LINK} target="_blank" rel="noopener noreferrer">
            查看钉钉消息推送文档
          </Typography.Link>
        </div>
      )}
    />
  );
}
