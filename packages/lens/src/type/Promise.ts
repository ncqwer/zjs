export default {
  impl: {
    is: (_: any, functor: any) =>
      functor && typeof functor?.then === 'function',
    Functor: {
      fmap: <T, S>(f: (x: T) => S, functor: Promise<T>): Promise<S> => {
        return functor.then(f);
      },
    },
  },
};
