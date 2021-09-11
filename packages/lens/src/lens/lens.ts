type TupleHead<T extends any[]> = T extends [infer U, ...any[]] ? U : never;
type TupleLast<T extends any[]> = T extends [...any, infer U] ? U : never;

export const compose = <T extends ((v: any) => any)[]>(...funcs: T) => {
  type Parameter = TupleLast<T> extends (arg: infer U) => any ? U : never;
  type ReturnType = TupleHead<T> extends (arg: any) => infer U ? U : never;
  const f = funcs.reduce((acc, func) => (arg) => acc(func(arg)));
  return f as (arg: Parameter) => ReturnType;
};

type Functor<T> =
  | {
      ['fantasy-land/map']<S>(f: (v: T) => S): Functor<S>;
    }
  | { map: <S>(fn: (a: T) => S) => Functor<S>; [key: string]: any };

type Semigroup<T> = {
  ['fantasy-land/concat'](f1: Semigroup<T>): Semigroup<T>;
};

export const fmap = (f: any, functor: any) => {
  if (Array.isArray(functor)) return functor.map(f);
  if (typeof functor?.fmap === 'function') return functor.fmap(f);
  if (typeof functor?.map === 'function') return functor.map(f);
  if (typeof functor?.['fantasy-land/map'] === 'function')
    return functor['fantasy-land/map'](f);
  throw new Error(`${functor} is not a instance of [Functor]`);
};

export const foldr = (f: any, zero: any, s: any) => {
  if (typeof s?.[Symbol.iterator] === 'function')
    return Array.from(s[Symbol.iterator]()).reduceRight(f, zero);
  throw new Error(`${s} is not a instance of [Foldable]`);
};

export type Func<A, B> = (v: A) => B;

export type Const<A, B = any> = Functor<B>;

const Const = <A, B = any>(v: A): Const<A, B> => {
  const getConst = () => v;
  getConst['fantasy-land/map'] = <S>(f: (v: B) => S) =>
    (getConst as any) as Const<A, S>;
  getConst['*>'] = (rhs: Const<any>) =>
    Const((rhs as any)()['fantasy-land/concat'](v));
  getConst.type = 'Const';
  return getConst;
};

const getConst = <A, B>(c: Const<A, B>): A => (c as any)();

export type Getting<R, S, A> = Func<Func<A, Const<R, A>>, Func<S, Const<R, S>>>;

export const view = <S, A>(len: Getting<A, S, A>, source: S): A =>
  getConst(len(Const)(source));

export type Lens<S, T, A, B> = Func<Func<A, Functor<B>>, Func<S, Functor<T>>>;
export type Lens_<S, A> = Lens<S, S, A, A>;

export const lens = <S, T, A, B>(
  get: Func<S, A>,
  set: (v: B, s: S) => T,
): Lens<S, T, A, B> => (toFunctor) => (source) =>
  fmap((focus: B) => set(focus, source), toFunctor(get(source)));

export const to = <S, A>(f: Func<S, A>): Getting<A, S, A> => (toFunctor) => (
  source,
) => {
  const tmp = compose(toFunctor, f);
  return Const(getConst(tmp(source)));
};

type Indentity<T> = Functor<T>;

export const Indentity = <T>(v: T): Indentity<T> => {
  const getIndentity = () => v;
  getIndentity['fantasy-land/map'] = <S>(f: Func<T, S>): Indentity<S> => {
    const nV = f(v);
    if ((v as any) === nV) return getIndentity as any;
    return Indentity(nV);
  };
  return getIndentity;
};

export const getIndentity = <T>(i: Indentity<T>): T => (i as any)();

export type Setting<S, T, A, B> = Func<
  Func<A, Indentity<B>>,
  Func<S, Indentity<T>>
>;

export const set = <S, T, A, B>(len: Setting<S, T, A, B>, v: B, source: S): T =>
  getIndentity(len(() => Indentity(v))(source));

export const over = <S, T, A, B>(
  len: Setting<S, T, A, B>,
  f: Func<A, B>,
  source: S,
): T => getIndentity(len(compose((v: B) => Indentity(v), f))(source));

export const sets = <S, T, A, B>(
  f: (f1: (v: A) => B, s: S) => T,
): Setting<S, T, A, B> => (toFunctor) => {
  return compose(Indentity, (source: S) =>
    f(
      compose((v: Indentity<B>) => getIndentity(v), toFunctor),
      source,
    ),
  ) as any;
};

const foldMapOf = <R, S, A>(l: Getting<R, S, A>) => (f: Func<A, R>) => {
  return compose(
    (v: Const<R, S>) => getConst(v),
    (s: S) => l(compose((v: R) => Const(v), f))(s),
  );
};

export type Endo<T> = Semigroup<T>;

export const Endo = <T>(f: Func<T, T>): Endo<T> => {
  const appEndo = () => f;
  appEndo['fantasy-land/concat'] = (f1: Endo<T>) =>
    Endo(compose(f, (f1 as any)()));
  appEndo.type = 'Endo';
  return appEndo;
};

const appEndo = <T>(e: Endo<T>): Func<T, T> => (e as any)();

const foldrOf = <R, S, A>(l: Getting<Endo<R>, S, A>) => (
  f: Func<A, Func<R, R>>,
) => (z: R) =>
  compose((endo: Endo<R>) => appEndo(endo)(z), foldMapOf(l)(compose(Endo, f)));

export const id = <T>(v: T) => v;

const foldring = <S, A, R = any>(
  fr: (
    reduceRight: (acc: Const<R, A>, current: A) => Const<R, A>,
    zero: Const<R, A>,
    source: S,
  ) => Const<R, any>,
): Getting<R, S, A> => (f) => (s) =>
  fr((acc, a) => acc['*>'](f(a)), Const(Endo(id)), s);

type SimpleFold<S, A> = Getting<any, S, A>;

export const makeFoled = <A>(_: A): SimpleFold<Iterable<A>, A> => folded as any;

export const folded = foldring(foldr as any);

export const toListOf = <S, A>(l: Getting<Endo<A[]>, S, A>, source: S) => {
  return foldrOf(l)((x) => (xs) => [x, ...xs])([])(source);
};

// const createObj = (num) => ({ a: num });

// const h = toListOf(
//   compose(
//     to((o) => o.hsj as { a: number }),
//     folded,
//     to((o) => o.a as number),
//   ),
//   { hsj: [createObj(1), createObj(2), createObj(3)] },
// );

// const h = toListOf(

//   [1, 2, 3],
// );

// const hh = compose(
//   to((o: { value1: number }) => ({ value: [o.value1] })),
//   to((o: { value: number[] }) => o.value),
//   foldring((reduceRight, zero: Const<any, number>, source: number[]) =>
//     source.reduceRight(reduceRight, zero),
//   ),
// );

// const s = toListOf(hh, { value1: 1 });
