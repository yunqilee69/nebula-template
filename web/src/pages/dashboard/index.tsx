import { BarChartOutlined, CheckCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { Flex, Statistic, Tag, Typography, theme as antdTheme } from 'antd';
import { createStyles } from 'antd-style';

const dashboardStats = [
  { title: 'Active Sessions', value: 128, icon: <TeamOutlined /> },
  { title: 'Healthy Services', value: 24, icon: <CheckCircleOutlined /> },
  { title: 'Daily Events', value: 4820, icon: <BarChartOutlined /> },
];

const useStyles = createStyles(({ token }) => ({
  title: {
    marginBlock: 0,
  },
  statCard: {
    flex: '1 1 180px',
    minWidth: 180,
    padding: token.paddingLG,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorFillQuaternary,
  },
  statHeader: {
    color: token.colorPrimary,
  },
}));

export function DashboardPage() {
  const { token } = antdTheme.useToken();
  const { styles } = useStyles();

  return (
    <>
      <Flex vertical gap={token.marginLG}>
        <Flex align="center" justify="space-between" gap={token.marginMD} wrap="wrap">
          <div>
            <Typography.Title level={3} className={styles.title}>
              Operations Overview
            </Typography.Title>
            <Typography.Text type="secondary">Core business workspace for Nebula Web.</Typography.Text>
          </div>
          <Tag color="processing">Live</Tag>
        </Flex>

        <Flex gap={token.marginLG} wrap="wrap">
          {dashboardStats.map((item) => (
            <Flex
              key={item.title}
              vertical
              gap={token.marginSM}
              className={styles.statCard}
            >
              <Flex align="center" gap={token.marginSM} className={styles.statHeader}>
                {item.icon}
                <Typography.Text type="secondary">{item.title}</Typography.Text>
              </Flex>
              <Statistic value={item.value} />
            </Flex>
          ))}
        </Flex>
      </Flex>
    </>
  );
}

export default DashboardPage;
