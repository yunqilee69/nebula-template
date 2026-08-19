import { Input, InputNumber, Select, Switch } from 'antd';
import { createStyles } from 'antd-style';
import { DictSelect } from '@/components/dict-select';
import { DataType, type DataType as ParamDataType } from '@/types/param';

export interface ParamValueEditorProps {
  readonly dataType: ParamDataType;
  readonly optionCode?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

const useStyles = createStyles(() => ({
  editor: {
    width: 'min(100%, 280px)',
  },
  numberEditor: {
    width: 'min(100%, 200px)',
  },
}));

function parseMultipleValue(value: string): string[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch (error: unknown) {
    if (error instanceof SyntaxError) return [];
    throw error;
  }
}

export function ParamValueEditor({ dataType, optionCode, value, onChange }: ParamValueEditorProps) {
  const { styles } = useStyles();

  switch (dataType) {
    case DataType.BOOLEAN: {
      const checked = value === 'true' || value === '1';
      return (
        <Switch
          checked={checked}
          checkedChildren="开启"
          unCheckedChildren="关闭"
          onChange={(next) => onChange(String(next))}
        />
      );
    }
    case DataType.INT:
    case DataType.DOUBLE: {
      const parsedValue = dataType === DataType.INT ? parseInt(value, 10) : parseFloat(value);
      const numberValue = Number.isNaN(parsedValue) ? 0 : parsedValue;

      return (
        <InputNumber<number>
          precision={dataType === DataType.INT ? 0 : undefined}
          min={0}
          className={styles.numberEditor}
          value={numberValue}
          onChange={(next) => onChange(next != null ? String(next) : '0')}
        />
      );
    }
    case DataType.SINGLE:
      return (
        <DictSelect
          dictCode={optionCode ?? ''}
          allowClear
          className={styles.editor}
          value={value || undefined}
          onChange={(next) => onChange(typeof next === 'string' ? next : '')}
        />
      );
    case DataType.MULTIPLE:
      return (
        <DictSelect
          dictCode={optionCode ?? ''}
          mode="multiple"
          allowClear
          className={styles.editor}
          value={parseMultipleValue(value)}
          onChange={(next) => onChange(Array.isArray(next) ? JSON.stringify(next) : '')}
        />
      );
    case DataType.STRING:
      if (optionCode === 'password') {
        return (
          <Input.Password
            className={styles.editor}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        );
      }
      if (optionCode === 'notify_email_security') {
        return (
          <Select
            className={styles.editor}
            value={value || undefined}
            options={[
              { label: 'NONE', value: 'NONE' },
              { label: 'STARTTLS', value: 'STARTTLS' },
              { label: 'SSL', value: 'SSL' },
            ]}
            onChange={(next) => onChange(next)}
          />
        );
      }
      return (
        <Input
          className={styles.editor}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}
