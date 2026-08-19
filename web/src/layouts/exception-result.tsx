import { Result } from 'antd';

type ExceptionStatus = '403' | '404' | '500';

interface ExceptionResultProps {
  status: ExceptionStatus;
  title?: string;
  subTitle?: string;
}

export function ExceptionResult({ status, title = status, subTitle }: ExceptionResultProps) {
  return <Result status={status} title={title} subTitle={subTitle} />;
}
