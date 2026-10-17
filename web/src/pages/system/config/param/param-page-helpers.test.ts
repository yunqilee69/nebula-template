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

  it('omits paramValue when an encrypted value keeps its current value', () => {
    const req = toUpdateParamReq({
      paramKey: 'notify.email.password',
      paramName: 'SMTP Password',
      dataType: DataType.STRING,
      encryptedValue: { kind: 'keep' },
    });

    expect(req).toEqual({ paramName: 'SMTP Password', dataType: DataType.STRING });
    expect(req).not.toHaveProperty('paramValue');
    expect(req).not.toHaveProperty('encrypted');
  });

  it('submits the new plaintext verbatim when an encrypted value is set', () => {
    expect(toUpdateParamReq({
      paramKey: 'notify.email.password',
      paramName: 'SMTP Password',
      dataType: DataType.STRING,
      encryptedValue: { kind: 'set', value: ' new-secret ' },
    }).paramValue).toBe(' new-secret ');
  });

  it('submits an empty paramValue when an encrypted value is cleared', () => {
    expect(toUpdateParamReq({
      paramKey: 'notify.email.password',
      paramName: 'SMTP Password',
      dataType: DataType.STRING,
      encryptedValue: { kind: 'clear' },
    }).paramValue).toBe('');
  });

  it('treats an empty encrypted draft as no change rather than a clear', () => {
    expect(toUpdateParamReq({
      paramKey: 'notify.email.password',
      paramName: 'SMTP Password',
      dataType: DataType.STRING,
      encryptedValue: { kind: 'set', value: '' },
    })).not.toHaveProperty('paramValue');
  });

  it('carries the encrypted flag on create only when it is checked', () => {
    const baseValues = {
      paramKey: 'notify.email.password',
      paramName: 'SMTP Password',
      dataType: DataType.STRING,
      paramValue: 'plain-secret',
    };

    expect(toCreateParamReq(baseValues)).toEqual({
      paramKey: 'notify.email.password',
      paramName: 'SMTP Password',
      dataType: DataType.STRING,
      paramValue: 'plain-secret',
    });
    expect(toCreateParamReq({ ...baseValues, encrypted: true }).encrypted).toBe(true);
  });

  it('drops the null paramValue of an encrypted detail', () => {
    const values = toParamFormValues({
      id: 'param-1',
      paramKey: 'notify.email.password',
      paramName: 'SMTP Password',
      dataType: DataType.STRING,
      encrypted: true,
      configured: true,
      paramValue: null,
    });

    expect(values).not.toHaveProperty('paramValue');
    expect(values.paramName).toBe('SMTP Password');
  });
});
