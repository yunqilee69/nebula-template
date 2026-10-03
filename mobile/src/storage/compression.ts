import type { NormalizedUploadPolicy } from './upload-policy.ts';
import { MB_BYTES } from './upload-policy.ts';

/**
 * 客户端图片压缩策略。
 *
 * <p>服务端<b>不做压缩、无缩略图</b>；图片列表若不压缩则流量与内存都不可控。
 * 这里只计算压缩目标（质量/最大边），真实压缩调用由 App 壳注入的原生能力完成。</p>
 */

export interface CompressionInput {
  /** 原始字节。 */
  sizeBytes: number;
  width?: number;
  height?: number;
  policy: NormalizedUploadPolicy;
}

export interface CompressionTarget {
  /** 0~1。 */
  quality: number;
  /** 最长边像素上限。 */
  maxDimension: number;
}

export interface CompressedImage {
  uri: string;
  sizeBytes: number;
  width: number;
  height: number;
}

/** 原生压缩能力（由 App 壳实现，如 react-native-image-resizer）。 */
export interface ImageCompressor {
  compress(uri: string, target: CompressionTarget): Promise<CompressedImage>;
}

const HARD_MAX_DIMENSION = 1920;

/** 计算压缩目标：超过分片阈值或上限的图片降质量 + 限制最长边。 */
export function computeCompressionTarget(input: CompressionInput): CompressionTarget {
  const longestEdge = Math.max(input.width ?? 0, input.height ?? 0);
  const maxDimension = longestEdge > HARD_MAX_DIMENSION ? HARD_MAX_DIMENSION : longestEdge || HARD_MAX_DIMENSION;

  const thresholdBytes = input.policy.chunkThresholdMB * MB_BYTES;
  const hardLimitBytes = input.policy.maxFileSizeMB * MB_BYTES;

  let quality = 0.8;
  if (input.sizeBytes > hardLimitBytes) quality = 0.5;
  else if (input.sizeBytes > thresholdBytes) quality = 0.65;

  return { quality, maxDimension };
}
