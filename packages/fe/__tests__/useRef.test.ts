import { fe, run } from '../src';
import { logEnvId } from '../src/env';

describe('useRef test', () => {
  test('should cache the value when muti called in single run process', () => {
    const testCase = fe(({ useRef }) => () => {
      const ref = useRef('value', 0);
      ref.current++;
      return ref.current;
    });
    const countTimes = Math.floor(Math.random() * 100);

    const value = run(
      fe(({ trigger }) => () => {
        return Array.from({ length: countTimes }).reduce(
          () => trigger(testCase),
          0,
        );
      }),
    );
    expect(value).toBe(countTimes);
  });
  test('should cache value in async function', async () => {
    const testCase = fe(({ call, useRef }) => async () => {
      await call(() => Promise.resolve());
      const ref = useRef('value', 0);
      ref.current++;
      return ref.current;
    });
    const countTimes = Math.floor(Math.random() * 100);

    const value = await run(
      fe(({ trigger, call }) => async () => {
        return Array.from({ length: countTimes }).reduce(
          (acc: Promise<number>) => acc.then(() => trigger(testCase)),
          call(() => Promise.resolve(0)),
        );
      }),
    );
    expect(value).toBe(countTimes);
  });
  test('should cache value with different keys individually', async () => {
    const testCase = fe(({ call, useRef }) => async () => {
      const ref1 = useRef('value1', 0);
      await call(() => Promise.resolve());
      const ref2 = useRef('value2', 0);
      ref1.current = ref1.current + 1;
      ref2.current = ref2.current + 2;
      return [ref1.current, ref2.current];
    });
    const countTimes = Math.floor(Math.random() * 100);

    const value = await run(
      fe(({ trigger, call }) => async () => {
        return Array.from({ length: countTimes }).reduce(
          (acc: Promise<number[]>) => acc.then(() => trigger(testCase)),
          call(() => Promise.resolve([0, 0])),
        );
      }),
    );
    expect(value).toEqual([countTimes, 2 * countTimes]);
  });
  test('should cache value with different call position(parent fe)', async () => {
    const testCase = fe(({ call, useRef }) => async (prefix: string) => {
      await call(() => Promise.resolve());
      const ref = useRef('value', 0);
      ref.current++;
      return ref.current;
    });
    const countTimes1 = Math.floor(Math.random() * 100);

    const countTimes2 = Math.floor(Math.random() * 100);

    const parentCahse = fe(({ call, trigger }) => async () => {
      await call(() => Promise.resolve());
      return Array.from({ length: countTimes2 }).reduce(
        (acc: Promise<number>) => acc.then(() => trigger(testCase, 'parent')),
        call(() => Promise.resolve(0)),
      );
    });

    const value = await run(
      fe(({ trigger, call }) => async () => {
        return call(() =>
          Promise.all([
            Array.from({ length: countTimes1 }).reduce(
              (acc: Promise<number>) =>
                acc.then(() => trigger(testCase, 'root')),
              call(() => Promise.resolve(0)),
            ),
            trigger(parentCahse),
          ]),
        );
      }),
    );
    expect(value).toEqual([countTimes1, countTimes2]);
  });
});
