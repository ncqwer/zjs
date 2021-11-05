import { useReducer } from 'react';
import { fe, createContext, run } from '../src';

describe('useContext test', () => {
  test('should work normally', () => {
    const Context = createContext({ user: 'user' });
    const testCase = fe(({ useContext }) => () => {
      return useContext(Context);
    });
    const times = Math.floor(Math.random() * 10);
    const parent = fe(({ trigger, setContext }) => (i = 0): {
      user: string;
    } => {
      setContext(Context, { user: 'simple user' });
      if (i === times) return trigger(testCase);
      return trigger(parent, ++i);
    });
    const value = run(fe(({ trigger }) => () => trigger(parent)));
    expect(value.user).toBe('simple user');
  });

  test('should fetch different value when different value stored in the some Context', () => {
    const Context = createContext({ user: 'user' });
    const testCase = fe(({ useContext }) => () => {
      return useContext(Context).user;
    });
    const parent = fe(({ trigger, setContext }) => () => {
      setContext(Context, { user: 'parent' });
      return trigger(testCase);
    });
    const value = run(
      fe(({ trigger, setContext }) => () => {
        setContext(Context, { user: 'root' });
        return [trigger(testCase), trigger(parent), trigger(testCase)];
      }),
    );
    expect(value).toEqual(['root', 'parent', 'root']);
  });

  test('should fetch different value when different value stored in the some Context in async', async () => {
    const Context = createContext({ user: 'user' });
    const testCase = fe(({ useContext }) => async () => {
      return useContext(Context).user;
    });
    const parent = fe(({ trigger, setContext }) => async () => {
      await Promise.resolve();
      setContext(Context, { user: 'parent' });
      return trigger(testCase);
    });
    const value = await run(
      fe(({ trigger, setContext }) => async () => {
        setContext(Context, { user: 'root' });
        return Promise.all([
          trigger(testCase),
          trigger(parent),
          trigger(testCase),
        ]);
      }),
    );
    expect(value).toEqual(['root', 'parent', 'root']);
  });

  test('should fetch value directyly from context if no context above', () => {
    const UserContext = createContext({ value: 'user1' });
    const testCase = fe(({ useContext }) => () => {
      return useContext(UserContext).value;
    });
    const value = run(fe(({ trigger }) => () => trigger(testCase)));
    expect(value).toBe('user1');
  });

  test('should fetch different value with different context', async () => {
    const UserContext1 = createContext({ value: 'user1' });
    const UserContext2 = createContext({ value: 'user2' });

    const testCase = fe(({ useContext }) => async () => {
      return [useContext(UserContext1).value, useContext(UserContext2).value];
    });

    const value = await run(
      fe(({ trigger }) => () => {
        return trigger(testCase);
      }),
    );
    expect(value).toEqual(['user1', 'user2']);
  });
});
