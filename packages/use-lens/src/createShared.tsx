import React, { useEffect } from 'react';
import { view, lensPath, Lens_ } from '@zhujianshi/lens';

import { createStore, DeepPartial, Store, StoreOption } from './store';
// import { lensPath } from 'ramda';
import { SharedApi } from './shareApi';
import { ChangeBridgeContext } from './ChangeBridge';
import { lens } from 'ramda';
import { Func } from './error';

export function createShared<T>(
  initialState: DeepPartial<T>,
  options: StoreOption = {},
) {
  type State = DeepPartial<T>;

  const store = createStore(initialState, options);
  const Context = React.createContext<Store<State>>(store);
  const useShared = (
    _i: State,
    _o: {
      mode?: 'macro' | 'micro' | 'instant';
      onStart?: Func;
      onFinish?: Func;
      callback?: (v: State) => void;
    } = {},
    _s?: Store<State>,
  ) => {
    const storeRef = React.useRef<Store<State> | null>(null);
    if (_s) storeRef.current = _s;
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
    useShared,
    storeLens: lens(
      (x) => x,
      (x) => x,
    ),
    SharedProvider: ({
      children,
      initialValue,
      value,
      onChange,
      store: _s,
      ...options
    }) => {
      const store = useShared(value || initialValue, options, _s);
      if (value && store.getState() !== value) {
        store._setState(value);
      }
      store._setCallback(onChange);
      return <Context.Provider value={store}>{children}</Context.Provider>;
    },
    useLensV,
    useStore: () => React.useContext(Context),
  } as SharedApi<T> & {
    useShared(i: State, _o: StoreOption): Store<State>;
    useStore(): Store<State>;
    storeLens: Lens_<State, State>;
    SharedProvider: React.FC<
      {
        initialValue: State;
        value?: State;
        onChange?: (v: State) => void;
        store?: Store<State>;
      } & StoreOption
    >;
  };

  function useLens(
    lens: any,
    equalF: (lhs: any, rhs: any) => boolean = simpleEqual,
  ) {
    const changeBridgeUpdate = React.useContext(ChangeBridgeContext);
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
      hasNewFocus = !equalF(currentFocusRef.current, newFocus);
    }

    if (hasNewFocus) {
      currentFocusRef.current = newFocus;
    }
    stateRef.current = state;
    targetLensRef.current = targetLens;
    equalFRef.current = equalF;
    hasErrorRef.current = false;
    // useEffect(() => {
    //   if (hasNewFocus) {
    //     currentFocusRef.current = newFocus;
    //   }
    //   stateRef.current = state;
    //   targetLensRef.current = targetLens;
    //   equalFRef.current = equalF;
    //   hasErrorRef.current = false;
    // });

    const stateBeforeSubscribe = React.useRef(state);
    useEffect(() => {
      const subscriber = (store: Store<State>) => {
        try {
          const nextState = store.getState();
          const nextFocus = view(targetLensRef.current, nextState);
          if (!equalFRef.current(currentFocusRef.current, nextFocus)) {
            stateRef.current = nextState;
            currentFocusRef.current = nextFocus;
            changeBridgeUpdate ? changeBridgeUpdate() : forceUpdate();
          }
        } catch (error) {
          hasErrorRef.current = true;
          forceUpdate();
        }
      };

      const unsubscribe = store.register({ onChange: subscriber });
      if (store.getState() !== stateBeforeSubscribe.current) subscriber(store);
      return unsubscribe;
    }, [store, changeBridgeUpdate]);

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
    const changeBridgeUpdate = React.useContext(ChangeBridgeContext);
    if (!changeBridgeUpdate) {
      console.warn(
        "It's recommended to use [useLensV] with ChangeBridge, can't find any [ChangeBridge] above.",
      );
    }
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
      store.resetInitialValue(
        {
          targetLens,
          initialValue,
        },
        changeBridgeUpdate,
      ); // There will throw the promise to terminate this render process
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
          if (nextState === stateRef.current) return;
          const nextFocus = view(targetLensRef.current, nextState);
          if (!equalFRef.current(currentFocusRef.current, nextFocus)) {
            stateRef.current = nextState;
            currentFocusRef.current = nextFocus;
            changeBridgeUpdate ? changeBridgeUpdate() : forceUpdate();
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
