import { describe, expect, it } from 'vitest';
import { DataType } from '@/types/param';
import { toCreateParamReq, toParamFormValues, toUpdateParamReq } from './param-page-helpers';

const removedContractFields = [
  'minValue',
  'maxValue',
  'minLength',
  'maxLength',
  'defaultValue',
  'validatorRegex',
  'validatorMessage',
  'renderEnabled',
  'placeholder',
  'sensitive',
  'editable',
  'visible',
  'displayOrder',
] as const;

describe('parameter page request helpers', () => {
  it('normalizes create payload text and MULTIPLE values for the API', () => {
    const legacyValues = {
      paramKey: '  site.features  ',
      paramName: '  Site Features  ',
      dataType: DataType.MULTIPLE,
      paramValue: ['  alpha  ', 'beta', ''],
      description: '  Enabled feature switches  ',
      moduleCode: '  system  ',
      optionCode: '  FEATURE_FLAG  ',
      renderEnabled: true,
      sensitive: true,
      editable: true,
      visible: true,
      minValue: 1,
      maxValue: 9,
      minLength: 2,
      maxLength: 32,
      defaultValue: 'alpha',
      validatorRegex: '^[A-Za-z]+$',
      validatorMessage: 'letters only',
      placeholder: 'choose features',
      displayOrder: 3,
    };

    const req = toCreateParamReq(legacyValues);

    expect(req).toEqual({
      paramKey: 'site.features',
      paramName: 'Site Features',
      description: 'Enabled feature switches',
      dataType: DataType.MULTIPLE,
      paramValue: '["alpha","beta"]',
      optionCode: 'FEATURE_FLAG',
      moduleCode: 'system',
    });
    for (const field of removedContractFields) {
      expect(req).not.toHaveProperty(field);
    }
  });

  it('normalizes update payloads without carrying immutable param keys', () => {
    const legacyValues = {
      paramKey: '  ignored.key  ',
      paramName: '  Retry Count  ',
      dataType: DataType.INT,
      paramValue: ' 5 ',
      description: '  retry budget  ',
      optionCode: '  RETRY_OPTIONS  ',
      moduleCode: '  system  ',
      renderEnabled: false,
      sensitive: false,
      editable: true,
      visible: false,
      minValue: 1,
      maxValue: 9,
      minLength: 2,
      maxLength: 32,
      defaultValue: '3',
      validatorRegex: '^\\d+$',
      validatorMessage: 'digits only',
      placeholder: 'retry count',
      displayOrder: 4,
    };

    const req = toUpdateParamReq(legacyValues);

    expect(req).toEqual({
      paramName: 'Retry Count',
      description: 'retry budget',
      dataType: DataType.INT,
      paramValue: '5',
      moduleCode: 'system',
    });
    expect(req).not.toHaveProperty('paramKey');
    expect(req).not.toHaveProperty('optionCode');
    for (const field of removedContractFields) {
      expect(req).not.toHaveProperty(field);
    }
  });

  it('maps detail records to retained form values only', () => {
    expect(toParamFormValues({
      paramKey: 'site.title',
      paramName: 'Site Title',
      description: 'Homepage title',
      dataType: DataType.STRING,
      paramValue: 'Nebula',
      optionCode: 'TITLE_OPTIONS',
      moduleCode: 'site',
    })).toEqual({
      paramKey: 'site.title',
      paramName: 'Site Title',
      description: 'Homepage title',
      dataType: DataType.STRING,
      paramValue: 'Nebula',
      optionCode: 'TITLE_OPTIONS',
      moduleCode: 'site',
    });
  });
});
