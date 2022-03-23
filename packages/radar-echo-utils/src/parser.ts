import { throwFileParserError } from './error';
import type { Block } from './type';

export const parseBuffer = (buffer: ArrayBuffer): Block => {
  const check1 = new Uint16Array(buffer, 176, 1)[0];

  const check2 = new Int16Array(buffer, 178, 1)[0];

  if (check1 !== 19532 || check2 !== 2) {
    throwFileParserError();
  }
  const dataname = [...new Uint8Array(buffer, 0, 128)].join('');
  const varname = [...new Uint8Array(buffer, 128, 32)].join('');
  const unitname = [...new Uint8Array(buffer, 160, 16)].join('');

  const slat = new Float32Array(buffer, 180, 1)[0];
  const wlon = new Float32Array(buffer, 184, 1)[0];
  const nlat = new Float32Array(buffer, 188, 1)[0];
  const elon = new Float32Array(buffer, 192, 1)[0];
  const clat = new Float32Array(buffer, 196, 1)[0];
  const clon = new Float32Array(buffer, 200, 1)[0];

  const rows = new Int32Array(buffer, 204, 1)[0];
  const cols = new Int32Array(buffer, 208, 1)[0];
  const dlat = new Float32Array(buffer, 212, 1)[0];
  const dlon = new Float32Array(buffer, 216, 1)[0];

  const nodata = new Float32Array(buffer, 220, 1)[0];
  const levelbyte = new Int32Array(buffer, 224, 1)[0];
  const levelnum = new Int16Array(buffer, 228, 1)[0];

  const amp = new Int16Array(buffer, 230, 1)[0];
  const compmode = new Int16Array(buffer, 232, 1)[0];

  const dates = new Uint16Array(buffer, 234, 1)[0];
  const seconds = new Int32Array(buffer, 236, 1)[0];

  const min_value = new Int16Array(buffer, 240, 1)[0];
  const max_value = new Int16Array(buffer, 242, 1)[0];

  const reversed = new Int16Array(buffer, 244, 6);

  const data = new Int16Array(buffer, 256);

  return {
    meta: {
      dataname,
      varname,
      unitname,
      dates,
      seconds,
    },

    pos: {
      slat,
      wlon,
      nlat,
      elon,
      clat,
      clon,
      dlat,
      dlon,
    },

    rows,
    cols,

    level: {
      nodata,
      levelbyte,
      levelnum,
    },

    scale: {
      amp,
      min_value,
      max_value,
    },

    data: {
      data,
      isComposed: compmode === 1,
    },
    reversed,
  };
};

type StateMachineContext = {
  row: number | null;
  col: number | null;
  size: number | null;
  count: number;

  onEach: (value: number, row: number, col: number) => void;
  onError: (e: Error, value: number, row: number, col: number) => void;
};

const readRow = (v: number, ctx: StateMachineContext) => {
  ctx.row = v;
  return readCol;
};

const readCol = (v: number, ctx: StateMachineContext) => {
  ctx.col = v;
  return readSize;
};

const readSize = (v: number, ctx: StateMachineContext) => {
  ctx.size = v;
  return readData;
};

const readData = (v: number, ctx: StateMachineContext) => {
  const { col, row, size, count } = ctx;
  try {
    ctx.onEach(v!, row!, col! + count);
  } catch (e) {
    ctx.onError(e as any, v!, row!, col! + count);
  }
  ctx.count += 1;
  if (ctx.count >= size!) {
    ctx.row = null;
    ctx.col = null;
    ctx.size = null;
    ctx.count = 0;
    return readRow;
  }
  return readData;
};

/**
 *	在数据压缩存储时，读取文件
 * */
export const StateMachine = {
  first: readRow,
  createCtx: (
    onEach: StateMachineContext['onEach'],
    onError: StateMachineContext['onError'],
  ): StateMachineContext => ({
    row: null,
    col: null,
    size: null,
    count: 0,
    onEach,
    onError,
  }),
};
