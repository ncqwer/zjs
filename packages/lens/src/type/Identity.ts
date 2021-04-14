import { Functor } from '../typeclass/Functor';

const typeToken = 'Identity';

export type Identity<T> = Functor<T> & {
  __type: 'Identity';
  getValue: () => T;
};

export const Identity = <T>(v: T) => {
  const functor = {
    getValue: () => v,
    map: (f) => {
      const nV = f(v);
      if (v === (nV as any)) return functor;
      return Identity(nV);
    },
    __type: typeToken,
  } as Identity<T>;
  return functor;
};

export default {
  impl: {
    is: (_: any, functor: any) => functor?.__type === typeToken,
    Functor: {
      fmap: <T, S>(f: (x: T) => S, functor: Identity<T>): Identity<S> => {
        const v = functor.getValue();
        const nV = f(v);
        if (v === ((nV as any) as T)) return (functor as any) as Identity<S>;
        return Identity(nV);
      },
    },
  },
};
