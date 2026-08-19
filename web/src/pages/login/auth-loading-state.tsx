import { Alert, Flex, Skeleton, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';

const configStartupHintDelayMs = 3000;

export function AuthLoadingState() {
  const [startupHintVisible, setStartupHintVisible] = useState(false);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setStartupHintVisible(true);
    }, configStartupHintDelayMs);

    return () => window.clearTimeout(timerId);
  }, []);

  return (
    <Flex vertical align="center" justify="center" gap="middle" className="py-10" aria-busy="true" aria-live="polite">
      <Spin size="large" />
      <Flex vertical align="center" gap="small">
        <Typography.Text strong>正在加载登录方式</Typography.Text>
      </Flex>
      <div className="w-full" aria-hidden="true">
        <Skeleton active title={false} paragraph={{ rows: 3, width: ['100%', '100%', '64%'] }} />
      </div>
      {startupHintVisible ? (
        <Alert
          type="warning"
          title="后端服务未启动"
          description="登录初始化接口超过 3 秒未返回，请确认后端服务已启动。"
          showIcon
          className="w-full"
        />
      ) : null}
    </Flex>
  );
}
