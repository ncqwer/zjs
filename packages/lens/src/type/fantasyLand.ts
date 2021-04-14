import { Functor } from '../typeclass/Functor';

export default {
  impl: {
    is: (_: any, functor: any) =>
      functor && typeof functor?.['fantasy-land/map'] === 'function',
    Functor: {
      fmap: <T, S>(f: (x: T) => S, functor: Functor<T>): Functor<S> => {
        return (functor as any)['fantasy-land/map'](f);
      },
    },
  },
};
