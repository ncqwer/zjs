import { createShared } from './react18';

export type DeepPartial<T> = T extends number
  ? number
  : T extends string
  ? string
  : T extends any[]
  ? T
  : {
      [k in keyof T]?: DeepPartial<T[k]>;
    };

export type { SharedApi } from './react18/react/shareApi';
export type { Middleware } from './react18/';

export { createShared };

export { microBundled, macroBundled } from './react18/schedule';
