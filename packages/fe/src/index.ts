import type { Hooks } from './hooks';

export * from './hooks';
export * from './run';
export * from './mock';
export * from './context';

export const fe = <F extends Func>(f: FETypeImpl<F>): FEType<F> => {
  const id = Symbol();
  const ret = (...args: any[]) => (f as any)(...args);
  (ret as any).id = id;
  return ret as any;
};

export type Key = Symbol | number | string;

export type Func = (...args: any[]) => any;
export type CallType = <F extends Func>(
  fn: F,
  ...args: Parameters<F>
) => ReturnType<F>;

type FETypeImpl<F extends Func> = (
  handlers: {
    call: CallType;
    trigger: TriggerType;
    getEnvId: () => Key;
  } & Hooks,
) => F;
export type FEType<F extends Func> = FETypeImpl<F> & {
  id: Symbol;
};

export type TriggerType = <F extends Func>(
  fe: FEType<F>,
  ...args: Parameters<F>
) => ReturnType<F>;
