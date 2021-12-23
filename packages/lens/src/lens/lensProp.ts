import { Lens_, fmap } from './lens';

export const lensProp = <S, K extends keyof S = keyof S>(
  key: K,
): Lens_<S, S[K]> => {
  return (toFunctor) => (source) =>
    fmap((focus: any) => {
      if (focus === source[key]) return source;
      return { ...source, [key]: focus };
    }, toFunctor(source[key]));
};
