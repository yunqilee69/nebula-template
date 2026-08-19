import { message } from 'antd';
import type { ArgsProps, ConfigOptions, MessageInstance, MessageType } from 'antd/es/message/interface';
import { useEffect, type PropsWithChildren, type ReactNode } from 'react';

export type NoticeOptions = Omit<ArgsProps, 'content' | 'type'>;
export type NoticeConfig = Pick<ConfigOptions, 'duration' | 'maxCount' | 'pauseOnHover' | 'stack' | 'top'>;

export interface NoticeApi {
  error: (content: ReactNode, options?: NoticeOptions) => MessageType | undefined;
  warning: (content: ReactNode, options?: NoticeOptions) => MessageType | undefined;
  success: (content: ReactNode, options?: NoticeOptions) => MessageType | undefined;
}

interface NoticeProviderProps extends PropsWithChildren {
  options?: NoticeConfig;
}

let activeApi: MessageInstance | null = null;

function openNotice(type: keyof NoticeApi, content: ReactNode, options?: NoticeOptions) {
  return activeApi?.[type]({ content, ...options });
}

export const notice: NoticeApi = {
  error: (content, options) => openNotice('error', content, options),
  warning: (content, options) => openNotice('warning', content, options),
  success: (content, options) => openNotice('success', content, options),
};

export function setNoticeApi(api: MessageInstance | null) {
  activeApi = api;
}

export function NoticeProvider({ children, options }: NoticeProviderProps) {
  const [messageApi, contextHolder] = message.useMessage(options);

  useEffect(() => {
    setNoticeApi(messageApi);
    return () => setNoticeApi(null);
  }, [messageApi]);

  return (
    <>
      {contextHolder}
      {children}
    </>
  );
}
