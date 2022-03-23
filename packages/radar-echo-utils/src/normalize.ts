import type { Block, ImageInfo } from './type';
import { StateMachine } from './parser';
import { NormalizeError } from './error';

export const normalizeBlocks = (
  ...blocks: Block[]
): {
  min_value: number;
  max_value: number;
  rows: number;
  cols: number;
  infos: ImageInfo[];
} => {
  const lcm_amp = blocks
    .map((v) => v.scale.amp)
    .reduce((lhs, rhs) => lcm(lhs, rhs));
  let max_value = -Infinity;
  let min_value = Infinity;

  const bs = blocks.map(({ scale, data, ...others }) => {
    const tweak = lcm_amp / scale.amp;
    if (max_value < scale.max_value * tweak) {
      max_value = scale.max_value * tweak;
    }

    if (min_value > scale.min_value * tweak) {
      min_value = scale.min_value * tweak;
    }

    return {
      scale,
      ...others,
      forEach: (f, onError = NormalizeError.each) => {
        const { data: d, isComposed } = data;
        const ctx = StateMachine.createCtx(f, onError);
        let handler = StateMachine.first;

        if (isComposed) {
          d.forEach((v) => {
            handler = handler(v, ctx);
          });
        } else {
          onError(new Error('当前遍历格式暂不支持'));
        }
      },
    } as ImageInfo;
  });

  return {
    max_value,
    min_value,
    rows: bs[0].rows,
    cols: bs[0].cols,
    infos: bs,
  };
};

export const isSeriesHasSameSize = (...blocks: Block[]) => {
  if (!isSameSize()) NormalizeError.position();

  return true;

  function isSameSize() {
    let rows = null;
    let cols = null;

    for (const block of blocks) {
      if (rows === null && cols === null) {
        rows = block.rows;
        cols = block.cols;
        continue;
      }
      if (rows !== block.rows || cols !== block.cols) return false;
    }
    return true;
  }
};

const gcd = (lhs: number, rhs: number) => {
  [lhs, rhs] = lhs < rhs ? [rhs, lhs] : [lhs, rhs];
  while (rhs !== 0) {
    let temp = rhs;
    rhs = lhs % rhs;
    lhs = temp;
  }
  return lhs;
};

const lcm = (lhs: number, rhs: number) => {
  return (lhs * rhs) / gcd(lhs, rhs);
};
