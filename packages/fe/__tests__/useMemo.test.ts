import { assertExportDefaultSpecifier } from '@babel/types';
import { fe, run } from '../src';

describe('useMemo test', () => {
  test('should work normally', () => {
    const fn = jest.fn(() => Math.random());
    const testCase = fe(({ useMemo }) => (...dependencies: any[]) => {
      const value = useMemo('memo', () => fn(), dependencies ?? []);
      return value;
    });

    const times = Math.floor(Math.random() * 100) + 1;
    const value = run(
      fe(({ trigger }) => () => {
        return Array.from({ length: times })
          .map(() => trigger(testCase, 'key1', 'key2'))
          .reduce(
            (acc: null | number, v: number) => (acc === v ? acc : null) as any,
          );
      }),
    );
    expect(value).not.toBeNull();
    expect(fn).toBeCalledTimes(1);
  });

  test('should change the memeroized value when dependencies changed', () => {
    const fn = jest.fn(() => Math.random());
    const testCase = fe(({ useMemo }) => (...dependencies: any[]) => {
      const value = useMemo('memo', () => fn(), dependencies ?? []);
      return value;
    });

    const times = Math.floor(Math.random() * 100);
    const value = run(
      fe(({ trigger }) => () => {
        return Array.from({ length: times })
          .map((_, idx) => trigger(testCase, idx))
          .reduce(
            (acc: null | number, v: number) => (acc === v ? acc : null) as any,
          );
      }),
    );
    expect(value).toBeNull();
    expect(fn).toBeCalledTimes(times);
  });

  test('should memorize value in different when called by different parent fe', () => {
    const testCase = fe(({ useMemo }) => (...dependencies: any[]) => {
      const value = useMemo('memo', () => Math.random(), dependencies ?? []);
      return value;
    });
    const parent = fe(
      ({ trigger }) =>
        () =>
          trigger(testCase),
    );

    const value = run(
      fe(({ trigger }) => () => {
        return [trigger(testCase), trigger(parent)];
      }),
    );
    expect(value[0] !== value[1]).toBe(true);
  });

  test('should work normally in async', async () => {
    const fn = jest.fn(() => Math.random());

    const testCase = fe(({ useMemo }) => async (...dependencies: any[]) => {
      await Promise.resolve();
      const value = useMemo('key1', () => fn(), dependencies);
      await new Promise((res) => setTimeout(res, 0));
      return value;
    });
    const value = await run(
      fe(({ trigger }) => () => {
        return Promise.all([trigger(testCase), trigger(testCase)]);
      }),
    );
    expect(fn).toBeCalledTimes(1);
    expect(value[0] === value[1]).toBe(true);
  });
});
