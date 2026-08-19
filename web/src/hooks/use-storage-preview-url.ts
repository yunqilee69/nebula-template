import { useEffect, useRef, useState } from 'react';
import { parseStorageDownloadUrl } from '@/api/storage';
import { request } from '@/request/request';

function normalizeOptionalText(value: string | undefined) {
  const nextValue = value?.trim();
  return nextValue ? nextValue : undefined;
}

function revokeObjectUrl(objectUrl: string) {
  if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(objectUrl);
}

export function useStoragePreviewUrl(url: string | undefined) {
  const [previewUrl, setPreviewUrl] = useState<string>();
  const activeObjectUrlRef = useRef<string>();

  const replaceActiveObjectUrl = (nextObjectUrl: string | undefined) => {
    const previousObjectUrl = activeObjectUrlRef.current;
    activeObjectUrlRef.current = nextObjectUrl;
    if (previousObjectUrl && previousObjectUrl !== nextObjectUrl) {
      revokeObjectUrl(previousObjectUrl);
    }
  };

  useEffect(() => () => {
    if (activeObjectUrlRef.current) revokeObjectUrl(activeObjectUrlRef.current);
  }, []);

  useEffect(() => {
    const normalizedUrl = normalizeOptionalText(url);
    if (!normalizedUrl) {
      replaceActiveObjectUrl(undefined);
      setPreviewUrl(undefined);
      return;
    }

    const downloadParams = parseStorageDownloadUrl(normalizedUrl);
    if (!downloadParams) {
      replaceActiveObjectUrl(undefined);
      setPreviewUrl(normalizedUrl);
      return;
    }

    if (typeof URL.createObjectURL !== 'function') {
      return;
    }

    let active = true;
    let objectUrl: string | undefined;

    request<Blob>({
      url: normalizedUrl,
      method: 'GET',
      responseType: 'blob',
    })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) {
          replaceActiveObjectUrl(objectUrl);
          setPreviewUrl(objectUrl);
          return;
        }
        revokeObjectUrl(objectUrl);
      })
      .catch((error: unknown) => {
        if (error instanceof Error) {
          return;
        }
        throw error;
      });

    return () => {
      active = false;
    };
  }, [url]);

  return previewUrl;
}
