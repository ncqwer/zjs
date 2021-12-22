import React from 'react';
import { createShared, startTransition } from '../src/index';
import { renderHook, act } from '@testing-library/react-hooks';
import { to } from '@zhujianshi/lens';

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
      c: number;
    };
  };
};

describe('useLens', () => {
  let setHandler: any = null;
  const {
    useLens,
    SharedProvider,
    useGetting,
    useSetting,
    // useSetLens,
  } = createShared<TestData>(
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
    [
      () => ({
        set: (next) => (v, message) => {
          if (setHandler) v = setHandler(v, message);
          next(v, message);
        },
      }),
    ],
  );

  beforeEach(() => {
    setHandler = null;
  });

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
  test('should work with [to]', async () => {
    const { result } = renderHook(() => useGetting(to((v: TestData) => v.num)));
    expect(result.current).toBe(2);
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
    act(() => result.current[1](arr));
  });

  test('should work with middleware', async () => {
    setHandler = jest.fn((x) => x);
    const { result } = renderHook(() => useLens(['num']));
    expect(result.current[0]).toBe(2);

    await act(() => {
      result.current[1](3);
      result.current[1](4);
      return new Promise((res) => setTimeout(res)) as any;
    });
    expect(result.current[0]).toBe(4);
    expect(setHandler).toBeCalledTimes(2);
  });

  test('should bundled the updater with startTransition', async () => {
    setHandler = jest.fn((x) => x);
    const { result } = renderHook(() => useLens(['num']));

    await act(() => {
      startTransition(() => {
        result.current[1](3);
        result.current[1](4);
      });
      return new Promise((res) => setTimeout(res)) as any;
    });
    expect(result.current[0]).toBe(4);
    expect(setHandler).toBeCalledTimes(1);
  });

  test('should behave intensionly in react-v18', async () => {
    setHandler = jest.fn((x) => x);
    const fn = jest.fn();
    const { result } = renderHook(() => {
      const [num, setNum] = useLens(['num']);
      const [, forceUpdate] = React.useState({});
      fn();
      return [
        num,
        () => {
          forceUpdate({});
          setNum(3);
          setNum(4);
        },
      ] as const;
    });
    expect(fn).toBeCalledTimes(1);
    await act(() => {
      result.current[1]();
      return new Promise((res) => setTimeout(res)) as any;
    });
    expect(result.current[0]).toBe(4);
    expect(setHandler).toBeCalledTimes(2);
    expect(fn).toBeCalledTimes(2);
  });

  test('should integrated with startTransition in react-v18', async () => {
    setHandler = jest.fn((x, message) => {
      console.log(message);
      return x;
    });
    const fn = jest.fn();
    const { result } = renderHook(() => {
      const [num, setNum] = useLens(['num']);
      const setArr = useSetting(['arr']);
      const [, forceUpdate] = React.useState({});
      fn();
      return [
        num,
        () => {
          startTransition(() => {
            forceUpdate({});
            Promise.resolve().then(() => {
              startTransition(() => {
                setNum(4);
                setArr([]);
                setArr([]);
              });
            });
          });
        },
      ] as const;
    });
    expect(fn).toBeCalledTimes(1);
    await act(() => {
      result.current[1]();
      return new Promise((res) => setTimeout(res)) as any;
    });
    expect(result.current[0]).toBe(4);
    expect(setHandler).toBeCalledTimes(1);
    expect(fn).toBeCalledTimes(2);
  });
});

// describe('useLensV', () => {
//   test('should work with simple type', async () => {
//     const { result, waitFor, waitForNextUpdate } = renderHook(
//       () => useLensV(['noValue', 'a', 'b'], 1),
//       {
//         wrapper: ChangeBridge,
//       },
//     );

//     await waitFor(() => !!result.current[0]);
//     // await waitForNextUpdate();
//     expect(result.current[0]).toBe(1);
//   });

//   test('should work with custom [ChangeBridge]', async () => {
//     const fn = jest.fn();
//     const { result, waitFor, waitForNextUpdate } = renderHook(
//       () => useLensV(['noValue', 'a', 'c'], 1),
//       {
//         wrapper: ({ children }) => (
//           <ChangeBridgeContext.Provider value={fn}>
//             {children}
//           </ChangeBridgeContext.Provider>
//         ),
//       },
//     );
//     await waitFor(() => !!result.current[0]);
//     // console.log('wowo');
//     // await new Promise((res) => setTimeout(res, 1000));
//     // await waitForNextUpdate();
//     expect(result.current[0]).toBe(1);
//     expect(fn).toBeCalledTimes(1);
//   });
// });
