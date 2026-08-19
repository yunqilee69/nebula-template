import { useCallback, useMemo } from 'react';
import { useDictItems } from '@/components/dict-select';
import type { DictSelectOption } from '@/components/dict-select';

const AUDIT_ACTION_DICT_CODE = 'audit_action';

export interface AuditActionDictionary {
  readonly options: readonly DictSelectOption[];
  readonly loading: boolean;
  readonly getLabel: (action: string) => string;
}

export function useAuditActionDictionary(): AuditActionDictionary {
  const { options, loading } = useDictItems(AUDIT_ACTION_DICT_CODE);
  const enabledOptions = useMemo(
    () => options.filter((option) => !option.disabled),
    [options],
  );
  const labelByAction = useMemo(
    () => new Map(enabledOptions.map((option) => [option.value, option.label])),
    [enabledOptions],
  );
  const getLabel = useCallback(
    (action: string) => labelByAction.get(action) ?? action,
    [labelByAction],
  );

  return useMemo(
    () => ({ options: enabledOptions, loading, getLabel }),
    [enabledOptions, getLabel, loading],
  );
}
