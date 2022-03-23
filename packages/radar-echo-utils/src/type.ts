export type Meta = {
  dataname: string;
  varname: string;
  unitname: string;
  dates: number;
  seconds: number;
};

export type Position = {
  slat: number; // 南纬
  wlon: number; // 西经
  nlat: number; // 北纬
  elon: number; // 东经
  clat: number; // 中心点纬度
  clon: number; // 中心点经度
  dlat: number; // 纬度分辨率 （每个像素点指代的纬度范围）
  dlon: number; // 经度分辨率 （每个像素点指代的经度范围）
};

export type BlockLevel = {
  nodata: number;
  levelbyte: number;
  levelnum: number;
};

export type Scale = {
  amp: number;
  min_value: number;
  max_value: number;
};

export type BlockData = {
  data: Int16Array;
  isComposed: boolean;
};

export type Block = {
  meta: Meta;
  pos: Position;
  rows: number;
  cols: number;
  scale: Scale;

  level: BlockLevel;
  data: BlockData;

  reversed: Int16Array;
};

export type EachF = (value: number, row: number, col: number) => void;

export type ImageInfo = Omit<Block, 'level' | 'data' | 'level'> & {
  forEach: (
    f: EachF,
    onError?: (
      error: Error,
      value?: number,
      row?: number,
      col?: number,
    ) => void,
  ) => void;
};

export type Color = [number, number, number] | [number, number, number, number];
