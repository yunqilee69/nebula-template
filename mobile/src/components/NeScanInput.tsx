/**
 * 扫码输入组件：相机扫码与蓝牙扫码枪共用同一处理入口。
 *
 * <p>依赖 React Native 运行时，未在无 RN 工具链的环境编译（见功能说明书交付边界）。
 * 去重/分类逻辑由 `components/scan.ts` 承担并被单测覆盖，本组件只负责输入与回调。</p>
 */
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { createScanHandler, type ScanSource } from './scan.ts';

export interface NeScanInputProps {
  onScan: (value: string, source: ScanSource) => void;
  placeholder?: string;
  dedupeWindowMs?: number;
}

export function NeScanInput({ onScan, placeholder = '扫描或输入条码', dedupeWindowMs }: NeScanInputProps) {
  const [value, setValue] = useState('');
  const [handler] = useState(() =>
    createScanHandler(dedupeWindowMs === undefined ? { onScan } : { onScan, dedupeWindowMs }),
  );

  const commit = (raw: string): void => {
    // 扫码枪以回车结束，相机扫码直接回填；两者都进同一 handler。
    handler.handle(raw, 'GUN');
    setValue('');
  };

  return (
    <View>
      <TextInput
        value={value}
        placeholder={placeholder}
        onChangeText={setValue}
        onSubmitEditing={() => commit(value)}
        autoFocus
      />
    </View>
  );
}
