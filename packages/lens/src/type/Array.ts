export default {
  impl: {
    is: (_: any, functor: any) => functor && Array.isArray(functor),
    Functor: {
      fmap: <T, S>(f: (x: T) => S, functor: T[]): S[] => {
        return functor.map(f);
      },
    },
  },
};
