// type Functor<T> = { __value: T };
// type Test<T> = { __type: 'Test' } & Functor<T>;
// type Test1<T> = { __type: 'Test1' } & Functor<T>;
// type TestImpl = {
//   is: (x: any) => x is Test<unknown>;
//   Functor: {
//     fmap: <A, B>(f: (x: A) => B, functor: Test<A>) => Test<B>;
//   };
//   Applicative: {
//     of: <A>(x: A) => Test<A>;
//   };
// };
// type TestImpl1 = {
//   is: (x: any) => x is Test1<unknown>;
//   Functor: {
//     fmap: <A, B>(f: (x: A) => B, functor: Test1<A>) => Test1<B>;
//   };
//   Applicative: {
//     of: <A>(x: A) => Test1<A>;
//   };
// };

export type Func<T = any, S extends any[] = any[]> = (...args: S) => T;

// export type TypeClass = {
//   name: string;
//   createTypeBundle: Func;
// };

const createSingleFunction = (defaultHandler: any) => (
  ...fs: [Func<boolean>, Func][]
) => (...args: any[]) => {
  for (const [is, handler] of fs) {
    if (is(...args)) return handler(...args);
  }
  return defaultHandler(...args);
};

export const createTypeclassBundle = <T extends Record<string, Func>>(impl: {
  name: string;
  method: Record<string, (...args: any[]) => any>;
}) => {
  const m = Object.entries(impl.method).reduce(
    (acc, [funcName, defaultHandler]) => ({
      ...acc,
      [funcName]: createTypeclassBundleHelper(
        impl.name,
        funcName,
        defaultHandler,
      ),
    }),
    {} as Record<string, Func>,
  );
  return (
    ...bundles: { is: Func<boolean> } & Record<string, Record<string, Func>>[]
  ): T =>
    Object.entries(m).reduce(
      (acc, [funcName, helper]) => ({ ...acc, [funcName]: helper(...bundles) }),
      {},
    ) as any;
};

const createTypeclassBundleHelper = (
  typeclass: string,
  method: string,
  defaultHandler: any,
) => (...bundles: { is: Func<boolean> }[]) => {
  const fs = bundles
    .map((b) => b[typeclass] && [b.is, b[typeclass][method]])
    .filter(Boolean) as [any, any][];
  return createSingleFunction(defaultHandler)(...fs);
};

export const createRuntimeBundle = <TC extends Func[]>(...typeClasses: TC) => <
  T extends any[]
>(
  ...types: T
) => {
  type typeBundle = helper<Omit<T extends (infer A)[] ? A : never, 'is'>>;
  type typeclassBundle = UnionToIntersection<
    ReturnType<TC extends (infer B)[] ? B : never>
  >;
  return typeClasses
    .map((typeclass) => typeclass(...types))
    .reduce((acc, bundle) => ({ ...acc, ...bundle }), {}) as typeclassBundle &
    typeBundle;
};

// const h = createTypeClassBundle({
//   name: 'Functor',
//   createTypeBundle: createFunctorBundle,
// })((null as any) as TestImpl, (null as any) as TestImpl1);
// const s = h.fmap(
//   (null as any) as (x: number) => Promise<number>,
//   (null as any) as Test1<number>,
// );

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

// type helper = UnionToIntersection<
//   Omit<T, 'is'> extends Record<string, infer A> ? A : never
// >;

type helper<T> = UnionToIntersection<
  T extends Record<string, infer A> ? A : never
>;
