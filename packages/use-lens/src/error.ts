export const SubscriberDuplicateError = () =>
  new Error('register the same subscriber twice');

export const InteralError = () =>
  new Error('use-lens internal error occurred!!!');

export const UnsupportedConfigError = (key: string) =>
  new Error(`unsupported config value-[${key}]`);
