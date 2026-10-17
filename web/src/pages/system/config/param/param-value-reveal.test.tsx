import { cleanup, render, screen, within } from '@testing-library/react';
import { useCallback } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { notice } from '@/providers/notice';
import type { ParamService } from '@/services/param';
import { DataType, type SystemParamResp } from '@/types/param';
import { createParamService } from './index.test-helpers';
import { useParamValueRenderer } from './param-value-reveal';

const plainRecord: SystemParamResp = {
  id: 'param-1',
  paramKey: 'security.token',
  paramName: 'Security Token',
  dataType: DataType.STRING,
  moduleCode: 'system',
};

const encryptedRecord: SystemParamResp = {
  id: 'param-encrypted',
  paramKey: 'notify.email.password',
  paramName: 'SMTP Password',
  dataType: DataType.STRING,
  moduleCode: 'system',
  encrypted: true,
};

function renderParamValueCell(record: SystemParamResp, service: ParamService = createParamService()) {
  function CellHarness() {
    const { t } = useNebulaI18n();
    const translate = useCallback((key: string) => String(Reflect.apply(t, undefined, [key])), [t]);
    const renderCell = useParamValueRenderer({ service, notice, translate });
    return <div data-testid="param-value-cell">{renderCell(record)}</div>;
  }

  render(<CellHarness />);
  return screen.getByTestId('param-value-cell');
}

describe('useParamValueRenderer', () => {
  afterEach(() => {
    cleanup();
  });

  it('never offers the reveal action for an encrypted row', () => {
    const service = createParamService();
    const scope = renderParamValueCell(encryptedRecord, service);

    expect(within(scope).getByText('加密存储')).toBeInTheDocument();
    expect(within(scope).getByText('****')).toBeInTheDocument();
    expect(within(scope).queryByRole('button')).not.toBeInTheDocument();
    expect(service.getParam).not.toHaveBeenCalled();
    expect(service.getByKey).not.toHaveBeenCalled();
  });

  it('keeps the reveal action for plaintext rows', () => {
    const service = createParamService();
    const scope = renderParamValueCell(plainRecord, service);

    expect(within(scope).getByText('****')).toBeInTheDocument();
    expect(within(scope).getByRole('button', { name: /显示值/ })).toBeInTheDocument();
    expect(service.getParam).not.toHaveBeenCalled();
    expect(service.getByKey).not.toHaveBeenCalled();
  });
});
