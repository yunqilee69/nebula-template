import { Button, Card, Typography } from 'antd';
import { createStyles } from 'antd-style';
import type { AdvanceParamItem, AdvanceTab, ParamGroup } from '../advance-config-data';
import { ParamValueEditor } from './param-value-editor';

const { Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  paramRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: token.margin,
    paddingBlock: token.paddingSM,
    paddingInline: token.padding,
    borderBlockEnd: `1px solid ${token.colorBorderSecondary}`,
    transition: `background ${token.motionDurationMid} ${token.motionEaseOut}`,
    '&:last-child': { borderBlockEnd: 0 },
    '&:hover': { background: token.colorFillQuaternary },
  },
  paramMeta: {
    display: 'flex',
    minWidth: 0,
    flex: 1,
    flexDirection: 'column',
    gap: token.marginXXS,
  },
  paramKey: {
    color: token.colorTextTertiary,
    fontFamily: token.fontFamilyCode,
    fontSize: token.fontSizeSM,
  },
  paramControls: {
    display: 'flex',
    flexShrink: 0,
    alignItems: 'center',
    gap: token.marginSM,
  },
  groupCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: token.controlHeightSM,
    paddingInline: token.paddingXS,
    borderRadius: token.borderRadiusSM,
    background: token.colorFillQuaternary,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    fontWeight: token.fontWeightStrong,
    lineHeight: token.lineHeightSM,
  },
  groupDot: {
    width: token.sizeXXS,
    height: token.sizeXXS,
    borderRadius: token.borderRadiusXS,
    background: token.colorPrimary,
  },
  groupCard: {
    boxShadow: token.boxShadowSecondary,
  },
  batchBar: {
    position: 'sticky',
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: token.margin,
    marginInline: -token.padding,
    marginBlockEnd: -token.padding,
    paddingBlock: token.paddingSM,
    paddingInline: token.paddingLG,
    borderBlockStart: `1px solid ${token.colorBorderSecondary}`,
    borderEndStartRadius: token.borderRadiusLG,
    borderEndEndRadius: token.borderRadiusLG,
    background: token.colorBgElevated,
    boxShadow: token.boxShadowTertiary,
  },
}));

interface ParamRowProps {
  readonly param: AdvanceParamItem;
  readonly dirtyValue: string | undefined;
  readonly onValueChange: (value: string) => void;
}

function ParamRow({ param, dirtyValue, onValueChange }: ParamRowProps) {
  const { styles } = useStyles();
  const currentValue = dirtyValue ?? param.paramValue;

  return (
    <div className={styles.paramRow}>
      <div className={styles.paramMeta}>
        <Text className="text-sm font-medium">{param.paramName}</Text>
        <Text type="secondary" className="text-xs">{param.description}</Text>
        <span className={styles.paramKey}>{param.paramKey}</span>
      </div>
      <div className={styles.paramControls}>
        <ParamValueEditor
          dataType={param.dataType}
          optionCode={param.optionCode}
          value={currentValue}
          onChange={onValueChange}
        />
      </div>
    </div>
  );
}

interface GroupCardProps {
  readonly group: ParamGroup;
  readonly dirtyMap: Record<string, string>;
  readonly onValueChange: (paramKey: string, value: string) => void;
  readonly onTestEmail: () => void;
}

function GroupCard({ group, dirtyMap, onValueChange, onTestEmail }: GroupCardProps) {
  const { styles } = useStyles();
  if (group.params.length === 0) return null;

  return (
    <Card
      title={(
        <div className="flex items-center gap-2">
          <span className={styles.groupDot} />
          <Text strong>{group.groupName}</Text>
          <span className={styles.groupCount}>{group.params.length}</span>
        </div>
      )}
      className={styles.groupCard}
      extra={group.groupName === '邮件配置' ? (
        <Button type="primary" size="small" onClick={onTestEmail}>
          测试邮件配置
        </Button>
      ) : undefined}
      styles={{ body: { padding: 0 } }}
    >
      {group.params.map((param) => (
        <ParamRow
          key={param.paramKey}
          param={param}
          dirtyValue={dirtyMap[param.paramKey]}
          onValueChange={(value) => onValueChange(param.paramKey, value)}
        />
      ))}
    </Card>
  );
}

export interface TabPanelProps {
  readonly tab: AdvanceTab;
  readonly onDirtyUpdate: (paramKey: string, value: string) => void;
  readonly onBatchSave: () => Promise<void>;
  readonly onTestEmail: () => void;
  readonly dirtyMap: Record<string, string>;
  readonly hasChanges: boolean;
  readonly batchSaving: boolean;
}

export function TabPanel({ tab, dirtyMap, onDirtyUpdate, onBatchSave, onTestEmail, hasChanges, batchSaving }: TabPanelProps) {
  const { styles } = useStyles();

  return (
    <div className="flex flex-col gap-5">
      {tab.groups.map((group) => (
        <GroupCard
          key={group.groupName}
          group={group}
          dirtyMap={dirtyMap}
          onValueChange={onDirtyUpdate}
          onTestEmail={onTestEmail}
        />
      ))}
      {hasChanges && (
        <div className={styles.batchBar}>
          <Text type="secondary">
            <Text strong>{Object.keys(dirtyMap).length}</Text> 项未保存的更改
          </Text>
          <Button type="primary" loading={batchSaving} onClick={() => void onBatchSave()}>
            批量保存全部更改
          </Button>
        </div>
      )}
    </div>
  );
}
