import { FunctorImplement, Functor } from '../typeclass/Functor';

const typeToken = 'Const';

export type Const<R, T> = Functor<T> & {
  __type: 'Const';
  getValue: (x: R) => T;
};

// FunctorImplemention.instanceOf(
//   typeToken,
//   <R, T>(_f: (x: R) => T, functor: Const<R, T>): Const<R, T> => {
//     return functor;
//   },
// );

export const Const = <R, T>(v: T) => {
  const functor = {
    getValue: (x: R) => v,
    map: () => functor,
    __type: typeToken,
  } as Const<R, T>;
  return functor;
};

export default {
  impl: {
    is: (_: any, functor: any) => functor?.__type === 'Const',
    Functor: {
      fmap<T, S>(_f: (x: S) => T, functor: Const<any, S>): Const<any, S> {
        return functor;
      },
    },
  },
};
