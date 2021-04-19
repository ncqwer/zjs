import React, { useEffect } from 'react';
import { Func, view, lensPath } from '@zhujianshi/lens';

import { createStore, DeepPartial, Store, StoreOption } from './store';
// import { lensPath } from 'ramda';
import { SharedApi } from './shareApi';

export function createShared<T>(
  initialState: DeepPartial<T>,
  options: StoreOption = {},
) {
  type State = DeepPartial<T>;

  const store = createStore(initialState, options);
  const Context = React.createContext<Store<State>>(store);
  const useSharedStore = (
    _i: State,
    _o: {
      mode?: 'marco' | 'micro';
      onStart?: Func;
      onFinish?: Func;
    } = {},
  ) => {
    const storeRef = React.useRef<Store<State> | null>(null);
    if (storeRef.current) {
      return storeRef.current;
    }
    storeRef.current = createStore(
      { ...initialState, ..._i },
      { ...options, ..._o },
    );
    return storeRef.current;
  };

  return {
    useLens,
    useSetLens,
    useSharedStore,
    SharedProvider: ({ children, initialValue, ...options }) => {
      const store = useSharedStore(initialState, options);
      return <Context.Provider value={store}>{children}</Context.Provider>;
    },
    useLensV,
  } as SharedApi<T> & {
    useSharedStore(i: State, _o: StoreOption): Store<State>;
    SharedProvider: React.FC<{ initialValue: State } & StoreOption>;
  };

  function useLens(
    lens: any,
    equalF: (lhs: any, rhs: any) => boolean = simpleEqual,
  ) {
    const [, forceUpdate] = React.useReducer((c) => c + 1, 0) as [
      never,
      () => void,
    ];
    const targetLensDeps = typeof lens === 'function' ? [lens] : lens;
    const targetLens = React.useMemo(() => {
      if (typeof lens === 'function') return lens;
      return (lensPath as any)(lens);
    }, targetLensDeps);
    const targetLensRef = React.useRef(targetLens);
    const store = React.useContext(Context);
    const state = store.getState();
    const stateRef = React.useRef<State>(state);
    const equalFRef = React.useRef(equalF);
    const hasErrorRef = React.useRef(false);

    const currentFocusRef = React.useRef<any>();
    if (currentFocusRef.current === undefined) {
      currentFocusRef.current = view(targetLens, state);
    }

    let newFocus: any;
    let hasNewFocus = false;
    if (
      stateRef.current !== state ||
      targetLensRef.current !== state ||
      equalFRef.current !== equalF ||
      hasErrorRef.current
    ) {
      newFocus = view(targetLens, state);
      hasNewFocus = equalF(currentFocusRef.current, newFocus);
    }

    useEffect(() => {
      if (hasNewFocus) {
        currentFocusRef.current = newFocus;
      }
      stateRef.current = state;
      targetLensRef.current = targetLens;
      equalFRef.current = equalF;
      hasErrorRef.current = false;
    });

    const stateBeforeSubscribe = React.useRef(state);
    useEffect(() => {
      const subscriber = (store: Store<State>) => {
        try {
          const nextState = store.getState();
          const nextFocus = view(targetLensRef.current, nextState);
          if (!equalFRef.current(currentFocusRef.current, nextFocus)) {
            stateRef.current = nextState;
            currentFocusRef.current = nextFocus;
            forceUpdate();
          }
        } catch (error) {
          hasErrorRef.current = true;
          forceUpdate();
        }
      };

      const unsubscribe = store.register({ onChange: subscriber });
      if (store.getState() !== stateBeforeSubscribe.current) subscriber(store);
      return unsubscribe;
    }, [store]);

    return [
      hasNewFocus ? newFocus : currentFocusRef.current,
      React.useCallback(
        (v) => {
          store.dispatch({
            targetLens,
            value: v,
          });
        },
        [store, targetLens],
      ),
    ];
  }

  function useSetLens(lens: any) {
    const targetLensDeps = typeof lens === 'function' ? [lens] : lens;
    const targetLens = React.useMemo(() => {
      if (typeof lens === 'function') return lens;
      return (lensPath as any)(lens);
    }, targetLensDeps);
    const store = React.useContext(Context);
    return React.useCallback(
      (v) => {
        store.dispatch({
          targetLens,
          value: v,
        });
      },
      [store, targetLens],
    );
  }

  function useLensV(
    lens: any,
    initialValue: any,
    equalF: (lhs: any, rhs: any) => boolean = simpleEqual,
  ) {
    const [, forceUpdate] = React.useReducer((c) => c + 1, 0) as [
      never,
      () => void,
    ];
    const targetLensDeps = typeof lens === 'function' ? [lens] : lens;
    const targetLens = React.useMemo(() => {
      if (typeof lens === 'function') return lens;
      return (lensPath as any)(lens);
    }, targetLensDeps);
    const targetLensRef = React.useRef(targetLens);
    const store = React.useContext(Context);
    const state = store.getState();
    const stateRef = React.useRef<State>(state);
    const equalFRef = React.useRef(equalF);
    const hasErrorRef = React.useRef(false);
    const isMountedRef = React.useRef(false);

    const currentFocusRef = React.useRef<any>();
    if (currentFocusRef.current === undefined) {
      currentFocusRef.current = view(targetLens, state);
    }
    if (!isMountedRef.current && currentFocusRef.current === undefined) {
      isMountedRef.current = true;
      store.resetInitialValue({
        targetLens,
        initialValue,
      }); // There will throw the promise to terminate this render process
      // to help make both the parent and child foucs the same version store.
    }

    let newFocus: any;
    let hasNewFocus = false;
    if (
      stateRef.current !== state ||
      targetLensRef.current !== state ||
      equalFRef.current !== equalF ||
      hasErrorRef.current
    ) {
      newFocus = view(targetLens, state);
      hasNewFocus = equalF(currentFocusRef.current, newFocus);
    }

    useEffect(() => {
      if (hasNewFocus) {
        currentFocusRef.current = newFocus;
      }
      stateRef.current = state;
      targetLensRef.current = targetLens;
      equalFRef.current = equalF;
      hasErrorRef.current = false;
    });

    const stateBeforeSubscribe = React.useRef(state);
    useEffect(() => {
      const subscriber = (store: Store<State>) => {
        try {
          const nextState = store.getState();
          const nextFocus = view(targetLensRef.current, nextState);
          if (!equalFRef.current(currentFocusRef.current, nextFocus)) {
            stateRef.current = nextState;
            currentFocusRef.current = nextFocus;
            forceUpdate();
          }
        } catch (error) {
          hasErrorRef.current = true;
          forceUpdate();
        }
      };
      isMountedRef.current = true;
      const unsubscribe = store.register({ onChange: subscriber });
      if (store.getState() !== stateBeforeSubscribe.current) subscriber(store);
      return unsubscribe;
    }, [store]);

    return [
      hasNewFocus ? newFocus : currentFocusRef.current,
      React.useCallback(
        (v) => {
          store.dispatch({
            targetLens,
            value: v,
          });
        },
        [store, targetLens],
      ),
    ];
  }
}

// const { useLens } = createShared<{
//   a: {
//     b: {
//       c: number;
//       hellow: string;
//     };
//   };
// }>({
//   a: {
//     b: {
//       c: 1 as number,
//     },
//   },
// });
// const [v, setV] = useLens(['a', 'b', 'hellow']);

const simpleEqual = (lhs: any, rhs: any) => lhs === rhs;
