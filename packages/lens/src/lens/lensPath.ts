import { Lens_, id, fmap } from './lens';

export function lensPath<
  S,
  K0 extends keyof S = keyof S,
  K1 extends keyof S[K0] = keyof S[K0],
  K2 extends keyof S[K0][K1] = keyof S[K0][K1],
  K3 extends keyof S[K0][K1][K2] = keyof S[K0][K1][K2],
  K4 extends keyof S[K0][K1][K2][K3] = keyof S[K0][K1][K2][K3],
  K5 extends keyof S[K0][K1][K2][K3][K4] = keyof S[K0][K1][K2][K3][K4]
>(path: [K0, K1, K2, K3, K4, K5]): Lens_<S, S[K0][K1][K2][K3][K4][K5]>;
export function lensPath<
  S,
  K0 extends keyof S = keyof S,
  K1 extends keyof S[K0] = keyof S[K0],
  K2 extends keyof S[K0][K1] = keyof S[K0][K1],
  K3 extends keyof S[K0][K1][K2] = keyof S[K0][K1][K2],
  K4 extends keyof S[K0][K1][K2][K3] = keyof S[K0][K1][K2][K3]
>(path: [K0, K1, K2, K3, K4]): Lens_<S, S[K0][K1][K2][K3][K4]>;
export function lensPath<
  S,
  K0 extends keyof S = keyof S,
  K1 extends keyof S[K0] = keyof S[K0],
  K2 extends keyof S[K0][K1] = keyof S[K0][K1],
  K3 extends keyof S[K0][K1][K2] = keyof S[K0][K1][K2]
>(path: [K0, K1, K2, K3]): Lens_<S, S[K0][K1][K2][K3]>;
export function lensPath<
  S,
  K0 extends keyof S = keyof S,
  K1 extends keyof S[K0] = keyof S[K0],
  K2 extends keyof S[K0][K1] = keyof S[K0][K1]
>(path: [K0, K1, K2]): Lens_<S, S[K0][K1][K2]>;
export function lensPath<
  S,
  K0 extends keyof S = keyof S,
  K1 extends keyof S[K0] = keyof S[K0]
>(
  path: [K0, K1],
  equalF?: (lhs: S[K0][K1], rhs: S[K0][K1]) => boolean,
): Lens_<S, S[K0][K1]>;

export function lensPath<S, K0 extends keyof S = keyof S>(
  path: [K0],
): Lens_<S, S[K0]>;
export function lensPath(path: any[]) {
  const [getter, setter] = path.reduce(
    (acc, k) => [
      (x: any) => acc[0](x)?.[k],
      (value: any, source: any) => {
        const current = acc[0](source);
        if (current[k] === value) return source;
        return acc[1](
          {
            ...current,
            [k]: value,
          },
          source,
        );
      },
    ],
    [id, id],
  );
  return (toFunctor: any) => (source: any) =>
    fmap((focus: any) => setter(focus, source), toFunctor(getter(source)));
}
