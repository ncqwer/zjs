import { fmap } from '../type';
import { Lens_ } from './lens';

export const lensProp = <S, K extends keyof S = keyof S>(
  key: K,
): Lens_<S, S[K]> => {
  return (toFunctor) => (source) =>
    fmap((focus) => ({ ...source, [key]: focus }), toFunctor(source[key]));
};
