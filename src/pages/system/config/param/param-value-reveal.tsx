import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { Button, Space, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import type { NoticeApi } from '@/providers/notice';
import type { ParamService } from '@/services/param';
import type { SystemParamDetailResp, SystemParamResp } from '@/types/param';
import { PARAM_MASKED_VALUE, formatParamCellText, getParamRevealKey, paramI18n } from './param-page-helpers';

interface ParamValueRevealConfig {
  readonly service: ParamService;
  readonly notice: NoticeApi;
  readonly translate: (key: string) => string;
}

function loadParamDetail(service: ParamService, record: SystemParamResp): Promise<SystemParamDetailResp> | undefined {
  if (record.id) return service.getParam(record.id);
  if (record.paramKey) return service.getByKey(record.paramKey);
  return undefined;
}

export function useParamValueRenderer({ service, notice, translate }: ParamValueRevealConfig): (record: SystemParamResp) => ReactNode {
  const [revealedValueKeys, setRevealedValueKeys] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [revealingValueKeys, setRevealingValueKeys] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [revealedParamDetails, setRevealedParamDetails] = useState<ReadonlyMap<string, SystemParamDetailResp>>(() => new Map<string, SystemParamDetailResp>());

  const toggleParamValue = useCallback(async (record: SystemParamResp) => {
    const revealKey = getParamRevealKey(record);
    if (!revealKey) return;

    if (revealedValueKeys.has(revealKey)) {
      setRevealedValueKeys((current) => {
        const next = new Set(current);
        next.delete(revealKey);
        return next;
      });
      return;
    }

    if (!revealedParamDetails.has(revealKey)) {
      const detailRequest = loadParamDetail(service, record);
      if (!detailRequest) return;

      setRevealingValueKeys((current) => new Set(current).add(revealKey));
      try {
        const detail = await detailRequest;
        setRevealedParamDetails((current) => new Map(current).set(revealKey, detail));
      } catch (error: unknown) {
        if (error instanceof Error) {
          notice.error(translate(paramI18n.feedback.detailLoadFailed));
          return;
        }
        throw error;
      } finally {
        setRevealingValueKeys((current) => {
          const next = new Set(current);
          next.delete(revealKey);
          return next;
        });
      }
    }

    setRevealedValueKeys((current) => new Set(current).add(revealKey));
  }, [notice, revealedParamDetails, revealedValueKeys, service, translate]);

  return useCallback((record: SystemParamResp) => {
    const revealKey = getParamRevealKey(record);
    const revealed = revealKey ? revealedValueKeys.has(revealKey) : false;
    const detail = revealKey ? revealedParamDetails.get(revealKey) : undefined;
    const text = revealed && detail ? formatParamCellText(detail.paramValue) : PARAM_MASKED_VALUE;

    return (
      <Space size="small">
        <Typography.Text code>{text}</Typography.Text>
        {revealKey ? (
          <Button
            type="link"
            size="small"
            loading={revealingValueKeys.has(revealKey)}
            icon={revealed ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => void toggleParamValue(record)}
          >
            {translate(revealed ? paramI18n.actions.hideValue : paramI18n.actions.revealValue)}
          </Button>
        ) : null}
      </Space>
    );
  }, [revealedParamDetails, revealedValueKeys, revealingValueKeys, toggleParamValue, translate]);
}
