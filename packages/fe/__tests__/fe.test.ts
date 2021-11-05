import { fe, run } from '../src';
import { getEnv } from '../src/env';

describe('fe test', () => {
  test('should assign different id', () => {
    const fn = jest.fn();
    const fe1 = fe(fn);
    const fe2 = fe(fn);
    expect(fe1.id).toBeTruthy();
    expect(fe2.id).toBeTruthy();
    expect(fe1.id === fe2.id).toBeFalsy();
  });
  test('should call implement function rightly', async () => {
    const fn = jest.fn((arg: any) => Promise.resolve(1));
    const f = fe(() => fn);
    const arg = {};
    const ans = await f(null as any)(arg);
    expect(ans).toBe(1);
    expect(fn).toBeCalledWith(arg);
  });

  test('should always refer she same env', async () => {
    const testCase = fe(({ getEnvId }) => async () => {
      const id = getEnvId();
      await Promise.resolve();
      expect(getEnvId()).toBe(id);
      await new Promise((res) => setTimeout(res, 0));
      expect(getEnvId()).toBe(id);
    });

    await run(
      fe(({ trigger, getEnvId }) => async () => {
        const id = getEnvId();
        await Promise.resolve();
        expect(getEnvId()).toBe(id);
        await new Promise((res) => setTimeout(res, 0));
        expect(getEnvId()).toBe(id);
        await trigger(testCase);
        expect(getEnvId()).toBe(id);
      }),
    );
  });
});
