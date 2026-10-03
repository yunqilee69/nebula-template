/**
 * 鉴权图片组件。
 *
 * <p>服务端无直链、无预览接口：必须走带 token 的 blob 获取再渲染对象 URL，
 * <b>不使用裸图片 URL</b>。依赖 React Native 运行时，未在无 RN 工具链的环境编译
 * （见功能说明书交付边界）；下载/缓存逻辑由 `storage/authenticated-image.ts` 承担并被单测覆盖。</p>
 */
import { useEffect, useState } from 'react';
import { Image, type ImageProps, type ImageStyle, type StyleProp } from 'react-native';
import type { AuthenticatedImageLoader } from './authenticated-image.ts';

export interface AuthenticatedImageProps {
  loader: AuthenticatedImageLoader;
  fileId: string;
  filename?: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageProps['resizeMode'];
}

export function AuthenticatedImage({
  loader,
  fileId,
  filename,
  style,
  resizeMode,
}: AuthenticatedImageProps) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loader
      .load(fileId, filename)
      .then((next) => {
        if (active) setUri(next);
      })
      .catch(() => {
        if (active) setUri(null);
      });
    return () => {
      active = false;
    };
  }, [loader, fileId, filename]);

  if (!uri) return null;
  return <Image source={{ uri }} style={style} resizeMode={resizeMode} />;
}
