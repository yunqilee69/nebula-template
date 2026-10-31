import { QuestionCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Descriptions, Divider, Modal, Table, Typography } from 'antd';
import { createStyles } from 'antd-style';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import {
  DINGTALK_WEBHOOK_HELP_LINK,
  FEISHU_WEBHOOK_HELP_LINK,
  SYSTEM_TEMPLATE_VARIABLE_GROUPS,
  WECOM_WEBHOOK_HELP_LINK,
  htmlTemplateVariableUsage,
  textTemplateVariableUsage,
} from './template-page-helpers';
import { HelpIcon } from '@/components/help-icon';
import type { TemplateVariable } from '@/types/notify';

const builtinVariableColumns: ColumnsType<TemplateVariable> = [
  {
    title: '变量名',
    dataIndex: 'name',
    width: 230,
    render: (name: string) => <Typography.Text code copyable>{name}</Typography.Text>,
  },
  {
    title: '说明',
    dataIndex: 'description',
    width: 220,
    render: (description: string | undefined) => description ?? '-',
  },
  {
    title: '纯文本写法',
    key: 'textUsage',
    width: 280,
    render: (_value, record) => (
      <Typography.Text code copyable>{textTemplateVariableUsage(record.name)}</Typography.Text>
    ),
  },
  {
    title: 'HTML 写法',
    key: 'htmlUsage',
    width: 300,
    render: (_value, record) => (
      <Typography.Text code copyable style={{ wordBreak: 'break-all' }}>
        {htmlTemplateVariableUsage(record.name)}
      </Typography.Text>
    ),
  },
];

interface BuiltinVariableGuideModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

function BuiltinVariableGuideModal({ open, onClose }: BuiltinVariableGuideModalProps) {
  return (
    <Modal
      title="内置变量与模板语法"
      open={open}
      width={1000}
      footer={null}
      destroyOnHidden
      onCancel={onClose}
    >
      <Typography.Paragraph type="secondary">
        下列变量由系统在发送时自动注入，不需要在「参数定义」中声明，也不会出现在发送参数里；变量名区分大小写。
      </Typography.Paragraph>
      {SYSTEM_TEMPLATE_VARIABLE_GROUPS.map((group) => (
        <div key={group.key} className="mb-4">
          <Typography.Text strong>{group.title}</Typography.Text>
          <Table<TemplateVariable>
            className="mt-2"
            columns={builtinVariableColumns}
            dataSource={[...group.variables]}
            pagination={false}
            rowKey="name"
            size="small"
            scroll={{ x: 'max-content' }}
          />
        </div>
      ))}
      <Divider />
      <Typography.Title level={5}>模板写法</Typography.Title>
      <Descriptions bordered size="small" column={1}>
        <Descriptions.Item label="引用自定义参数">
          纯文本 <Typography.Text code>{'[(${orderNo})]'}</Typography.Text>；HTML{' '}
          <Typography.Text code>{'th:text="${orderNo}"'}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="引用内置变量">
          纯文本 <Typography.Text code>{'[(${notify.currentDate})]'}</Typography.Text>；HTML{' '}
          <Typography.Text code>{'th:text="${notify.currentDate}"'}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="条件内容">
          纯文本 <Typography.Text code>{'[# th:if="${orderNo}"]有订单号时显示[/]'}</Typography.Text>；HTML{' '}
          <Typography.Text code>{'<p th:if="${orderNo}">有订单号时显示</p>'}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="HTML 转义">
          HTML 模板使用 <Typography.Text code>th:text</Typography.Text> 时默认自动转义变量，避免注入；确需输出原始 HTML 时使用 <Typography.Text code>th:utext</Typography.Text>，并确保内容可信。
        </Descriptions.Item>
        <Descriptions.Item label="群机器人">
          内容模板会作为完整 JSON 发送；变量应放在 JSON 字符串值中，双引号需要转义。
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
}

interface BuiltinVariableHelpProps {
  readonly link?: boolean;
}

export function BuiltinVariableHelp({ link = false }: BuiltinVariableHelpProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {link ? (
        <Button type="link" size="small" className="h-auto p-0" onClick={() => setOpen(true)}>
          查看内置变量
        </Button>
      ) : (
        <Button
          type="text"
          size="small"
          icon={<QuestionCircleOutlined />}
          aria-label="查看系统内置变量"
          className="text-[var(--nebula-color-text-secondary)]"
          onClick={() => setOpen(true)}
        />
      )}
      <BuiltinVariableGuideModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function TemplateUsageGuide() {
  return (
    <Alert
      type="info"
      showIcon
      title="模板使用说明"
      description={(
        <div className="space-y-1 text-sm">
          <div>
            <Typography.Text strong>自定义参数：</Typography.Text>
            先在「参数定义」中声明字段编码（如 orderNo），再在模板中引用：纯文本{' '}
            <Typography.Text code>{'[(${orderNo})]'}</Typography.Text>，HTML{' '}
            <Typography.Text code>{'th:text="${orderNo}"'}</Typography.Text>。
          </div>
          <div>
            <Typography.Text strong>内置变量：</Typography.Text>
            发送时自动注入，无需声明，如 <Typography.Text code>{'[(${notify.currentDate})]'}</Typography.Text>、
            <Typography.Text code>{'[(${notify.receiverEmail})]'}</Typography.Text>。<BuiltinVariableHelp link />
          </div>
          <div>
            <Typography.Text strong>条件内容：</Typography.Text>
            纯文本 <Typography.Text code>{'[# th:if="${orderNo}"]...[/]'}</Typography.Text>，HTML{' '}
            <Typography.Text code>{'<p th:if="${orderNo}">...</p>'}</Typography.Text>。
          </div>
          <div>
            <Typography.Text strong>渠道差异：</Typography.Text>
            站内信/推送使用纯文本；邮件可额外配置 HTML（留空只发纯文本）；群机器人内容必须是完整 JSON。
          </div>
          <div>
            <Typography.Text strong>编码规则：</Typography.Text>
            字段编码只能是字母、数字、下划线，且不能以数字开头；变量区分大小写。
          </div>
        </div>
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
            支持在 JSON 值中使用 {'[(${variableName})]'} 引用模板参数和系统变量。
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
            支持在 JSON 值中使用 {'[(${variableName})]'} 引用模板参数和系统变量。
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
            支持在 JSON 值中使用 {'[(${variableName})]'} 引用模板参数和系统变量。
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
