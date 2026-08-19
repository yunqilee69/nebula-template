import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { Button, message } from 'antd';
import { useCallback, useMemo, useState } from 'react';

interface JsonViewerProps {
  readonly json?: string;
  readonly label: string;
}

function formatJson(jsonStr: string | undefined): string {
  if (!jsonStr) return '';
  try {
    const parsed = JSON.parse(jsonStr);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return jsonStr;
  }
}

export function JsonViewer({ json, label }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const formattedJson = useMemo(() => formatJson(json), [json]);

  const handleCopy = useCallback(async () => {
    if (!formattedJson) return;

    try {
      await navigator.clipboard.writeText(formattedJson);
      setCopied(true);
      message.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      message.error('复制失败');
    }
  }, [formattedJson]);

  if (!formattedJson) {
    return (
      <div className="text-gray-400 italic py-4 text-center">
        暂无{label}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10">
        <Button
          size="small"
          icon={copied ? <CheckOutlined /> : <CopyOutlined />}
          onClick={handleCopy}
        >
          {copied ? '已复制' : '复制'}
        </Button>
      </div>
      <pre className="bg-gray-50 dark:bg-gray-800 p-4 pr-24 rounded overflow-auto max-h-96 text-xs font-mono border border-gray-200 dark:border-gray-700">
        <code className="text-gray-800 dark:text-gray-200">{formattedJson}</code>
      </pre>
    </div>
  );
}