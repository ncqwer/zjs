import React from 'react';
import { createShared } from '../src/index';
import { renderHook, act } from '@testing-library/react-hooks';

type TestData = {
  str: string;
  num: number;
  arr: number[];
  obj: {
    a: {
      str: string;
      num: number;
    };
    b: Record<string, number | string>;
  };
  noValue: {
    a: {
      b: number;
    };
  };
};

const { useLens, useLensV, SharedProvider } = createShared<TestData>(
  {
    str: 'str',
    num: 1,
    arr: [1],
    obj: {
      a: {
        str: 'childstr',
        num: 2,
      },
    },
  },
  {
    mode: 'instant',
  },
);

describe('useLens', () => {
  test('should work with string type', async () => {
    const { result } = renderHook(() => useLens(['str']));
    expect(result.current[0]).toBe('str');
    await act(() => {
      result.current[1]('hello world');
      return new Promise((res) => setTimeout(res)) as any;
    });
    expect(result.current[0]).toBe('hello world');
  });
  test('should work with number type', async () => {
    const { result } = renderHook(() => useLens(['num']));
    expect(result.current[0]).toBe(1);

    await act(() => {
      result.current[1](2);
      return new Promise((res) => setTimeout(res)) as any;
    });
    expect(result.current[0]).toBe(2);
  });
  test('should work with nested type', async () => {
    const { result } = renderHook(() => useLens(['obj', 'a']));
    expect(result.current[0]).toStrictEqual({
      str: 'childstr',
      num: 2,
    });
    await act(() => {
      result.current[1]({
        str: 'hello',
        num: 10,
      });
      return new Promise((res) => setTimeout(res)) as any;
    });
    expect(result.current[0]).toStrictEqual({
      str: 'hello',
      num: 10,
    });
  });

  test('test with field with no initialValue', () => {
    const { result } = renderHook(() => useLens(['noValue', 'a', 'b']));
    expect(result.current[0]).toBeUndefined();
  });

  test('should work with SharedProvider', () => {
    const arr = [1, 3, 45, 5];
    const { result } = renderHook(() => useLens(['arr']), {
      wrapper: ({ children }) => (
        <SharedProvider initialValue={{ arr }}>{children}</SharedProvider>
      ),
    });
    expect(result.current[0]).toBe(arr);
  });
});

describe('useLensV', () => {
  test('should work with simple type', async () => {
    const { result, waitFor, waitForNextUpdate } = renderHook(() =>
      useLensV(['noValue', 'a', 'b'], 1),
    );

    await waitFor(() => !!result.current[0]);
    // await waitForNextUpdate();
    expect(result.current[0]).toBe(1);
  });
});
