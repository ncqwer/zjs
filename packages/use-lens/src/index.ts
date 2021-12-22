import { createShared } from './react18';
import { createShared as createShared__old } from './old';

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

export { createShared, createShared__old };

export { startTransition } from './react18/startTranstion';
