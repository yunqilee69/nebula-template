import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dictService } from '@/services/dict';
import { useDictCacheStore } from '@/stores/dict-cache-store';
import { DataType, type SystemParamDetailResp, type SystemParamResp } from '@/types/param';
import { createParamPage, createParamService, enabledFeatureItem, featureFlagDictType, getModalByTitle, getPopoverActionButton, getSelectTrigger, getSelectTriggerByName, getTableRowByText, paramDetailRecord, paramRecord, renderParamManagementPage, systemModuleItem } from './index.test-helpers';

vi.mock('@/services/dict', () => ({
  dictService: {
    pageTypes: vi.fn(),
    listItemsByCode: vi.fn(),
  },
}));

const pageTypes = vi.mocked(dictService.pageTypes);
const listItemsByCode = vi.mocked(dictService.listItemsByCode);
const PARAM_MODULE_DICT_CODE = 'param_module';

describe('ParamManagementPage', () => {
  beforeEach(() => {
    useDictCacheStore.getState().reset();
    pageTypes.mockResolvedValue({ data: [featureFlagDictType], total: 1 });
    listItemsByCode.mockImplementation((dictCode) => {
      if (dictCode === PARAM_MODULE_DICT_CODE) return Promise.resolve([systemModuleItem]);
      if (dictCode === featureFlagDictType.code) return Promise.resolve([enabledFeatureItem]);
      return Promise.resolve([]);
    });
  });

  afterEach(() => {
    cleanup();
    pageTypes.mockReset();
    listItemsByCode.mockReset();
  });

  it('renders module code before parameter key in the table headers', async () => {
    renderParamManagementPage();

    await screen.findByText('security.token');

    const headerTexts = within(screen.getByTestId('pro-table'))
      .getAllByRole('columnheader')
      .map((header) => header.textContent?.replace(/\s+/g, '') ?? '')
      .filter(Boolean);

    expect(headerTexts.slice(0, 2)).toEqual(['模块', '参数键']);
  });

  it('loads parameters, submits search filters, and fetches detail before revealing a value', async () => {
    const user = userEvent.setup();
    const service = renderParamManagementPage();

    expect(await screen.findByText('security.token')).toBeInTheDocument();
    expect(screen.getByText('Security Token')).toBeInTheDocument();
    expect(screen.getByText('****')).toBeInTheDocument();
    expect(screen.queryByText('secret-token')).not.toBeInTheDocument();
    expect(service.pageParams).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10 });

    const proTable = screen.getByTestId('pro-table');
    await user.type(within(proTable).getByLabelText('参数键'), ' security ');
    await user.click(getSelectTrigger(proTable, 'dataType'));
    await user.click(await screen.findByText('整数'));
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));

    await waitFor(() => {
      expect(service.pageParams).toHaveBeenLastCalledWith({
        pageNum: 1,
        pageSize: 10,
        paramKey: 'security',
        dataType: DataType.INT,
      });
    });

    expect(service.getParam).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /显示值/ }));

    await waitFor(() => expect(service.getParam).toHaveBeenCalledWith('param-1'));
    expect(service.getByKey).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText('secret-token')).toBeInTheDocument());
  });

  it('loads parameter detail by key when a page-list row has no id', async () => {
    const user = userEvent.setup();
    const keyOnlyRecord: SystemParamResp = {
      paramKey: 'security.key-only',
      paramName: 'Key Only Token',
      dataType: DataType.STRING,
      moduleCode: 'system',
    };
    const keyOnlyDetail: SystemParamDetailResp = {
      ...keyOnlyRecord,
      paramValue: 'key-only-secret',
    };
    const service = createParamService({
      pageParams: vi.fn().mockResolvedValue(createParamPage([keyOnlyRecord])),
      getByKey: vi.fn().mockResolvedValue(keyOnlyDetail),
    });
    renderParamManagementPage(service);

    expect(await screen.findByText('security.key-only')).toBeInTheDocument();
    expect(screen.queryByText('key-only-secret')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /显示值/ }));

    await waitFor(() => expect(service.getByKey).toHaveBeenCalledWith('security.key-only'));
    expect(service.getParam).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText('key-only-secret')).toBeInTheDocument());
  });

  it('keeps the value hidden and shows detail feedback when reveal detail loading fails', async () => {
    const user = userEvent.setup();
    const service = createParamService({ getParam: vi.fn().mockRejectedValue(new Error('detail unavailable')) });
    renderParamManagementPage(service);

    expect(await screen.findByText('security.token')).toBeInTheDocument();
    expect(screen.getByText('****')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /显示值/ }));

    await waitFor(() => expect(service.getParam).toHaveBeenCalledWith('param-1'));
    expect(await screen.findByText('加载参数详情失败')).toBeInTheDocument();
    expect(screen.queryByText('secret-token')).not.toBeInTheDocument();
    expect(screen.getByText('****')).toBeInTheDocument();
  });

  it('keeps revealed parameter values scoped to the selected row', async () => {
    const user = userEvent.setup();
    const secondRecord: SystemParamResp = {
      id: 'param-2',
      paramKey: 'security.backup-token',
      paramName: 'Backup Token',
      dataType: DataType.STRING,
      moduleCode: 'system',
    };
    const secondDetail: SystemParamDetailResp = {
      ...secondRecord,
      paramValue: 'backup-secret-token',
    };
    const service = createParamService({
      pageParams: vi.fn().mockResolvedValue(createParamPage([paramRecord, secondRecord])),
      getParam: vi.fn().mockImplementation((id: string) => Promise.resolve(id === 'param-1' ? paramDetailRecord : secondDetail)),
    });
    renderParamManagementPage(service);

    const firstRow = await waitFor(() => getTableRowByText('security.token'));
    const secondRow = getTableRowByText('security.backup-token');

    await user.click(within(firstRow).getByRole('button', { name: /显示值/ }));

    await waitFor(() => expect(screen.getByText('secret-token')).toBeInTheDocument());
    expect(screen.queryByText('backup-secret-token')).not.toBeInTheDocument();

    await user.click(within(firstRow).getByRole('button', { name: /隐藏值/ }));
    await waitFor(() => expect(screen.queryByText('secret-token')).not.toBeInTheDocument());

    await user.click(within(secondRow).getByRole('button', { name: /显示值/ }));

    await waitFor(() => expect(screen.getByText('backup-secret-token')).toBeInTheDocument());
    expect(screen.queryByText('secret-token')).not.toBeInTheDocument();
  });

  it('creates a parameter with the integer value input path', async () => {
    const user = userEvent.setup();
    const service = renderParamManagementPage();

    await user.click(await screen.findByRole('button', { name: /新增参数/ }));
    await waitFor(() => expect(getModalByTitle('新增参数')).toBeInTheDocument());
    const modal = getModalByTitle('新增参数');

    await user.type(within(modal).getByPlaceholderText('请输入参数键'), ' retry.count ');
    await user.type(within(modal).getByPlaceholderText('请输入参数名'), ' Retry Count ');
    await user.click(getSelectTrigger(modal, 'dataType'));
    await user.click(await screen.findByText('整数'));
    await user.type(await within(modal).findByRole('spinbutton', { name: '参数值' }), '5');
    await user.click(within(modal).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(service.createParam).toHaveBeenCalledWith({
        paramKey: 'retry.count',
        paramName: 'Retry Count',
        dataType: DataType.INT,
        paramValue: '5',
      });
    });
  });

  it('creates a SINGLE parameter by selecting a dictionary code and dictionary value', async () => {
    const user = userEvent.setup();
    const service = renderParamManagementPage();

    await user.click(await screen.findByRole('button', { name: /新增参数/ }));
    await waitFor(() => expect(getModalByTitle('新增参数')).toBeInTheDocument());
    const modal = getModalByTitle('新增参数');

    await user.type(within(modal).getByPlaceholderText('请输入参数键'), ' feature.flag ');
    await user.type(within(modal).getByPlaceholderText('请输入参数名'), ' Feature Flag ');
    await user.click(getSelectTrigger(modal, 'dataType'));
    await user.click(await screen.findByText('单选'));
    await user.click(getSelectTrigger(modal, 'optionCode'));
    await user.click(await screen.findByText('Feature Flag'));

    await waitFor(() => expect(listItemsByCode).toHaveBeenCalledWith('FEATURE_FLAG'));
    await user.click(getSelectTriggerByName(modal, '参数值'));
    await user.click(await screen.findByText('Enabled'));
    await user.click(within(modal).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(service.createParam).toHaveBeenCalledWith({
        paramKey: 'feature.flag',
        paramName: 'Feature Flag',
        dataType: DataType.SINGLE,
        paramValue: 'enabled',
        optionCode: 'FEATURE_FLAG',
      });
    });
    expect(service.createParam).toHaveBeenCalledWith(expect.not.objectContaining({
      renderEnabled: expect.anything(),
      sensitive: expect.anything(),
      minValue: expect.anything(),
      validatorRegex: expect.anything(),
    }));
  });

  it('loads details before editing a parameter', async () => {
    const user = userEvent.setup();
    const detail: SystemParamDetailResp = {
      ...paramRecord,
      paramName: 'Retry Count',
      paramValue: '3',
      dataType: DataType.INT,
    };
    const service = createParamService({ getParam: vi.fn().mockResolvedValue(detail) });
    renderParamManagementPage(service);

    await screen.findByText('security.token');
    await user.click(screen.getByRole('button', { name: /编辑/ }));

    await waitFor(() => expect(service.getParam).toHaveBeenCalledWith('param-1'));
    await waitFor(() => expect(getModalByTitle('编辑参数')).toBeInTheDocument());
    const modal = getModalByTitle('编辑参数');
    await waitFor(() => expect(within(modal).getByDisplayValue('Retry Count')).toBeInTheDocument());

    await user.clear(within(modal).getByPlaceholderText('请输入参数名'));
    await user.type(within(modal).getByPlaceholderText('请输入参数名'), ' Retry Count Edited ');
    await user.clear(within(modal).getByRole('spinbutton', { name: '参数值' }));
    await user.type(within(modal).getByRole('spinbutton', { name: '参数值' }), '4');
    await user.click(within(modal).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(service.updateParam).toHaveBeenCalledWith('param-1', expect.objectContaining({
        paramName: 'Retry Count Edited',
        dataType: DataType.INT,
        paramValue: '4',
      }));
    });
  });

  it('deletes a parameter through confirmation', async () => {
    const user = userEvent.setup();
    const service = renderParamManagementPage();

    await screen.findByText('security.token');
    await user.click(screen.getByRole('button', { name: /删除/ }));
    expect(await screen.findByText('确定删除该参数吗？')).toBeInTheDocument();
    await user.click(getPopoverActionButton(/删\s*除/));

    await waitFor(() => expect(service.deleteParam).toHaveBeenCalledWith('param-1'));
  });

  it('shows required-field validation when a required field is cleared', async () => {
    const user = userEvent.setup();
    const service = renderParamManagementPage();

    await user.click(await screen.findByRole('button', { name: /新增参数/ }));
    await waitFor(() => expect(getModalByTitle('新增参数')).toBeInTheDocument());
    const modal = getModalByTitle('新增参数');
    const paramKeyInput = within(modal).getByPlaceholderText('请输入参数键');
    await user.type(paramKeyInput, 'temporary.key');
    await user.clear(paramKeyInput);

    expect(await screen.findByText('参数键不能为空')).toBeInTheDocument();
    expect(service.createParam).not.toHaveBeenCalled();
  });
});
