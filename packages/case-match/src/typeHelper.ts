export type TupleHead<T extends any[]> = T extends [infer U, ...any]
  ? U
  : never;
export type TupleTail<T extends any[]> = T extends [any, ...infer U]
  ? U
  : never;
