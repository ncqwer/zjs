// eslint-disable-next-line no-unused-vars
import type { TupleHead, TupleTail } from './typeHelper';

type ADT<T extends any[]> = {
  (...types: T): ADTValue<T>;
};

type ADTValue<T extends any[]> = {
  __abstractValueType: T;
};

export type getADTValue<T extends any> = T extends string
  ? string
  : T extends boolean
  ? boolean
  : T extends number
  ? number
  : T extends ADT<infer U>
  ? ADTValue<U>
  : never;
export type getADT<T extends any> = T extends ADTValue<infer U>
  ? ADT<U>
  : never;

// used in typescript's version > 4
type MapTuple<T extends any[], acc extends any[] = []> = T extends []
  ? acc
  : MapTuple<TupleTail<T>, [...acc, getADTValue<TupleHead<T>>]>;

// type MapTuple<T extends any[], acc extends any[] = []> = {
//   0: acc;
//   1: MapTuple<TupleTail<T>, [...acc, getADTValue<TupleHead<T>>]>;
// }[T extends [] ? 0 : 1];

type PatternMatch<A extends any[] = never, B = never, Remain = {}> = Remain & {
  (value: ADTValue<A>): B;
  case: <Ret, T extends any[]>(
    adt: ADT<T>,
    next: (...args: T) => Ret,
  ) => PatternMatch<
    T,
    Ret,
    Remain & {
      (value: ADTValue<A>): B;
    }
  >;
};

// const noop = () => {};
// const alwaysTrue = () => true;

const ctorSymbol = Symbol('ctor');

export const createType = function <T extends any[]>(
  type: string,
  // validator = noop,
  // externalIs = alwaysTrue,
): ADT<MapTuple<T>> {
  const ctor: ADT<MapTuple<T>> = function (...args: T) {
    // if (!validator(...args))
    //   throw new Error(
    //     `[type:${type}]构造函数入参不符合validator\n \t\thas:${args.join(',')}`,
    //   );
    const value = (nextMap: WeakMap<ADT<any>, (...args: any[]) => any>) => {
      const next = nextMap.get(ctor);
      if (!next) throw new Error('当前没有匹配的next');
      return next(...args);
    };
    value[ctorSymbol] = ctor;
    value.toString = () => `[type:${type}](${args.join(',')})`;
    return value;
  } as any;
  // ctor.is = (v) => externalIs(v) || v[ctorSymbol] === ctor;
  ctor.toString = () => `[type:${type}]`;
  return ctor;
};

// const createType = function <T extends ADT<any>[]>(
//   type: string,
//   // ...types: T
// ): ADT<MapTuple<T>> {
//   // const validator = (...args: T) => {
//   //   types.forEach((type, idx) => {
//   //     if (!type.is(args[idx]))
//   //       throw new Error(
//   //         `构造函数入参(idx=${idx})不匹配:\n \t\trequired:${type}\n \t\thas:${args[idx]}`,
//   //       );
//   //   });
//   //   return true;
//   // };

//   return createTypeRaw<T>(type);
// };

const cache = new WeakMap();
type CaseType<T extends any[], Ret> = [ADT<T>, (...args: T) => Ret];
const emptyArr: CaseType<any, any>[] = [];
const getCaseMap = (cases: CaseType<any[], any>[]) => {
  if (cache.has(cases)) return cache.get(cases);
  const newMap = new WeakMap();
  cases.forEach(([condition, next]) => {
    newMap.set(condition, next);
  });
  cache.set(cases, newMap);
  return newMap;
};

export const createPM = <A extends any[] = never, B = never>(
  cases = emptyArr,
) => {
  const exec: PatternMatch<A, B> = <T extends any[]>(value: ADTValue<T>) =>
    (value as any)(getCaseMap(cases));
  exec.case = (condition, next) =>
    createPM(cases.concat([[condition, next]])) as any;
  return exec;
};

// const number = createTypeRaw('number');
// const string = createTypeRaw('string');
// const boolean = createTypeRaw('boolean');

export const pm = createPM();

// const book = createType<[string, number, string]>('book');
// const phone = createType<[number, string]>('phone');
// const credit = createType<[typeof book, typeof phone]>('credit');

// const f = pm
//   .case(book, (bookName, bookPrice, bookIds) => ({
//     bookName,
//     bookPrice,
//     bookIds,
//   }))
//   .case(phone, (phoneNumber, targetPerson) => ({ phoneNumber, targetPerson }))
//   .case(credit, (creditNumber, owner) => console.log({ creditNumber, owner }));

// const b = book('aaa', 12, 'bookId-1');
// const a = f(b);
// const c = f(phone(1, 's'));
// const makeComplex = t.complex();
// const config = baseConfig.complex((t) =>
//   t.complex((a) => a.complex('complex')),
// );
