type Func = (...args: any[]) => any;

export type ComposeHelper<A, B> = A extends Func
  ? B extends Func
    ? Equal<[ReturnType<B>], Parameters<A>> extends true
      ? (...args: Parameters<B>) => ReturnType<A>
      : A
    : A
  : never;

type TupleTail<T> = T extends [any, ...infer U] ? U : never;
type TupleHead<T> = T extends [infer U, ...any] ? U : never;

export type ComposeTuple<Fs, Zero = never> = Fs extends [infer F, ...any]
  ? ComposeTuple<TupleTail<Fs>, ComposeHelper<F, Zero>>
  : Zero;

type ans = ComposeHelper<() => void, never>;
type ans1<T extends any[]> = (...args: Parameters<T>) => ReturnType<() => void>;
type hsj = ans1<never>;
type anss = ComposeTuple<[() => void, () => void]>;
type a = Parameters<never>;
type b = [ReturnType<never>];

type Equal<A, B> = A extends B
  ? true
  : A extends [void]
  ? B extends []
    ? true
    : false
  : false;

// type a = Equal<void, []>;
declare function f1(a: string): string;
declare function f1(a: number): number;

type hsjss = ((a: number) => void) & ((a: string) => void) extends {
  (x: infer A): void;
  (x: infer B): void;
}
  ? [A, B]
  : never;

type OverloadToTuple<T> = T extends {
  (x: infer A): void;
  (x: infer B): void;
}
  ? [A, B]
  : never;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

type TupleToUnion<T> = T extends (infer U)[] ? U : never;

type hssdaf = TupleToUnion<OverloadToTuple<typeof f1>>;

// type h<T> = ((x: infer U) => any) extends T ? U : never;
type example = {
  a: () => 'number';
  b: () => 'string';
};

type asadfasf = ReturnType<example[keyof example]>;
