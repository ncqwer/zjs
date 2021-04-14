export const noInstanceError = (type: string, typeclass: string) =>
  new Error(`[${type}] type do not implement [${typeclass}] typeclass`);
