import { noInstanceError } from '../error';
import { createTypeclassBundle, Func } from '../framework';

export type Functor<S> =
  | {
      map<T>(_f: (x: S) => T): Functor<T>;
    }
  | {
      ['fantasy-land/map']<T>(_f: (x: S) => T): Functor<T>;
    };

// export type Functor<T> = FunctorImpl<T> | Array<T> | Promise<T>;

// export function fmap<T, S>(
//   f: (source: T) => S,
//   functor: Functor<T>,
// ): Functor<S>;
// export function fmap<T, S>(f: (source: T) => S, functor: T[]): Array<S>;
// export function fmap<T, S>(
//   f: (source: T) => S,
//   functor: Promise<T>,
// ): Promise<S>;

export type FunctorImplement = {
  Functor: {
    fmap: <S, T>(f: (x: S) => T, functor: Functor<S>) => Functor<T>;
  };
  is: Func<boolean>;
};

export default {
  name: 'Functor',
  createTypeBundle: createTypeclassBundle<FunctorImplement['Functor']>({
    name: 'Functor',
    method: {
      fmap<S, T>(_f: (x: S) => T, functor: Functor<S>): Functor<T> {
        throw noInstanceError(`${functor}`, 'Funtor');
      },
    },
  }),
  rules: (fmap: <S, T>(f: (x: S) => T, functor: Functor<S>) => Functor<T>) => ({
    eqWithId<T>(
      functor: Functor<T>,
      equalF: (l: any, r: any) => boolean = (l, r) => l === r,
    ) {
      return equalF(
        fmap((x) => x, functor),
        functor,
      );
    },
    eqWithCombination<T, A, B>(
      functor: Functor<T>,
      f: (x: A) => B,
      g: (x: T) => A,
      equalF: (l: any, r: any) => boolean = (l, r) => l === r,
    ) {
      return equalF(
        fmap(f, fmap(g, functor)),
        fmap((x: T) => f(g(x)), functor),
      );
    },
  }),
};
