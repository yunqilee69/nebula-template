import { Skeleton, Space, Tag, Typography } from 'antd';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { SiteMessageResp } from '@/types/notify';

export interface SiteMessageDetailProps {
  readonly message: SiteMessageResp | undefined;
}

/** 站内信正文：标题、类别、时间、已读状态与内容。面板与全文页共用。 */
export function SiteMessageDetail({ message }: SiteMessageDetailProps) {
  const { t } = useNebulaI18n();

  if (!message) {
    return <Skeleton active paragraph={{ rows: 4 }} title={false} />;
  }

  const categoryName = message.categoryName ?? message.categoryCode;

  return (
    <article>
      <header className="flex items-start justify-between gap-4">
        <div>
          <Typography.Title level={4}>{message.title}</Typography.Title>
          <Space size="small" wrap>
            {categoryName ? <Tag>{categoryName}</Tag> : null}
            <Typography.Text type="secondary">
              {message.createTime ?? t('siteMessage.message.unknownTime')}
            </Typography.Text>
            {message.readTime ? (
              <Typography.Text type="secondary">
                {t('siteMessage.message.readAt')} {message.readTime}
              </Typography.Text>
            ) : null}
          </Space>
        </div>
        <Tag color={message.readStatus ? 'default' : 'blue'} variant="filled">
          {message.readStatus ? t('siteMessage.message.read') : t('siteMessage.message.unread')}
        </Tag>
      </header>
      <Typography.Paragraph className="mt-4 whitespace-pre-wrap break-words">
        {message.content}
      </Typography.Paragraph>
    </article>
  );
}
