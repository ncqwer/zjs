import { getEnv } from './env';
import type { Key } from './index';

export type Context<T> = {
  getValue: () => T;
  create: (nV: T) => Context<T>;
  id: Key;
};

/**
 *
 * @param initialValue 默认值
 * @returns
 */
export const createContext = <T>(initialValue: T): Context<T> => {
  const id = Symbol();
  const creator = (v: T) => ({
    getValue: () => v,
    create: (nV: T) => creator(nV),
    id,
  });
  return creator(initialValue);
};
