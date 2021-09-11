import { Const } from '../type/Const';
import { Identity } from '../type/Identity';
import { Functor } from '../typeclass/Functor';
import { fmap } from '../type';

export const id = <S>(x: S) => x;

export type Lens<S, T, A, B> = (
  toFunctor: (x: A) => Functor<B>,
) => (x: S) => Functor<T>;

export type Getting<S, A> = (
  toFunctor: (x: A) => Const<any, any>,
) => (x: S) => Const<any, A>;

export type Setting<S, T, A, B> = (
  toFunctor: (x: A) => Identity<B>,
) => (x: S) => Identity<T>;

export type Lens_<S, A> = Lens<S, S, A, A>;
// export type Lens_<S, FS extends Functor<S>, A, FA extends Functor<A>> = Lens<
//   S,
//   FS,
//   A,
//   FA
// >;

export const lens = <S, T, A, B>(
  get: (x: S) => A,
  set: (x: B, source: S) => T,
): Lens<S, T, A, B> => {
  return (toFunctor: (x: A) => Functor<B>) => (source: S) =>
    fmap((focus: B) => set(focus, source), toFunctor(get(source)));
};

// type ans = Lens<any, any> extends Setting<any, any, any, any> ? true : false;

export const view = <S, A>(len: Lens<S, any, A, any>, source: S): A => {
  const ans = len(Const)(source) as any;
  if (ans.getValue) return ans.getValue() as any;
  if (ans.value) return ans.value as any;
  throw new Error('error!');
};

export const over = <S, T, A, B>(
  len: Lens<S, T, A, B>,
  f: (x: A) => B,
  source: S,
): T => {
  // return ().getValue();
  const ans = len((focus) => Identity(f(focus)))(source) as any;
  if (ans.getValue) return ans.getValue() as any;
  if (ans.value) return ans.value as any;
  throw new Error('error!');
};

export const set = <S, T, A, B>(len: Lens<S, T, A, B>, nVal: B, source: S) =>
  over(len, () => nVal, source);
