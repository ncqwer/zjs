import type { EachF, Color, ImageInfo } from './type';

export type MosaicOption = {
  ignore: (...args: Parameters<EachF>) => boolean;
  iterpolation: (v: number) => Color;
  onError?: (error: Error, value?: number, row?: number, col?: number) => void;
  rows: number;
  cols: number;
  backgroundColor: Color;
};

export const createMosaic =
  ({
    ignore,
    iterpolation,
    rows,
    cols,
    onError,
    backgroundColor,
  }: MosaicOption) =>
  (...each: ImageInfo['forEach'][]) => {
    const buffer = new ArrayBuffer(rows * cols * 4);
    const dst = new Uint32Array(buffer);
    const initialColor = convertColorToUint32(backgroundColor);
    dst.forEach((_, i) => {
      dst[i] = initialColor;
    });

    each.forEach((f) =>
      f((value, row, col) => {
        if (ignore(value, row, col)) return;
        const color = iterpolation(value);
        const currentIndex = row * cols + col;
        dst[currentIndex] = convertColorToUint32(color);
      }, onError),
    );

    return buffer;
  };

export const buffer2png = (
  buffer: ArrayBuffer,
  height: number,
  width: number,
) => {
  if (typeof document !== 'object')
    throw new Error('[buffer2png]的默认实现需要浏览器环境');
  const data = new Uint8ClampedArray(buffer);
  const canvas = document.createElement('canvas');
  canvas.height = height;
  canvas.width = width;
  const ctx = canvas.getContext('2d');
  const imageData = new ImageData(data, width, height);
  ctx!.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

const convertColorToUint32 = (color: Color) => {
  const [red, green, blue, alpha = 255] = color;
  return (alpha << 24) | (blue << 16) | (green << 8) | red;
};
