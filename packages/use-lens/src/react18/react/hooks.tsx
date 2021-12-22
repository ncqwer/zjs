import React from 'react';
import { lensPath, set, over, view, Lens, lens } from '@zhujianshi/lens';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import { MiddlewareImpl } from '../createStore';
import { context } from './context';
import { SharedApi } from './shareApi';
import { deprecated } from '../utils/deprecated';

export const hooks = <State,>(
  middleware: MiddlewareImpl<State>,
  initialValue: State,
) => {
  const { useStore, ...args } = context(middleware, initialValue);
  const hooks = {
    useGetting,
    useLens,
    useSetLens,
    useSetting,
    useLensV,
    storeLens: lens(
      (x) => x,
      (x) => x,
    ),
  } as SharedApi<State> & {
    storeLens: Lens<State, State, State, State>;
  };

  return {
    useStore,
    ...hooks,
    ...args,
  };

  function useGetting(lens: any, isEqual?: any) {
    const targetLensDeps = typeof lens === 'function' ? [lens] : lens;

    const targetLens = React.useMemo(() => {
      if (typeof lens === 'function') return lens;
      return lensPath(lens);
    }, targetLensDeps);
    const store = useStore();

    return useSyncExternalStoreWithSelector(
      store.subscribe,
      store.getState,
      null,
      (v) => view(targetLens, v),
      isEqual,
    );
  }
  function useSetting(lens: any) {
    const targetLensDeps = typeof lens === 'function' ? [lens] : lens;

    const targetLens = React.useMemo(() => {
      if (typeof lens === 'function') return lens;
      const l = lensPath(lens);
      (l as any).message = lens.join('.');
      return l;
    }, targetLensDeps);
    const store = useStore();

    return React.useCallback(
      (v) => {
        if (typeof v === 'function') {
          store.dispatchAction(
            (old) => over(targetLens, v, old),
            targetLens.message,
          );
        } else {
          store.dispatchAction(
            (old) => set(targetLens, v, old),
            targetLens.message,
          );
        }
      },
      [store, targetLens],
    );
  }
  function useLens(lens: any, isEqual?: any) {
    const targetLensDeps = typeof lens === 'function' ? [lens] : lens;

    const targetLens = React.useMemo(() => {
      if (typeof lens === 'function') return lens;
      const l = lensPath(lens);
      (l as any).message = lens.join('.');
      return l;
    }, targetLensDeps);
    const store = useStore();
    const value = useSyncExternalStoreWithSelector(
      store.subscribe,
      store.getState,
      null,
      (v) => view(targetLens, v),
      isEqual,
    );

    return [
      value,
      React.useCallback(
        (v) => {
          if (typeof v === 'function') {
            store.dispatchAction(
              (old) => over(targetLens, v, old),
              targetLens.message,
            );
          } else {
            store.dispatchAction(
              (old) => set(targetLens, v, old),
              targetLens.message,
            );
          }
        },
        [store, targetLens],
      ),
    ];
  }
  function useSetLens(lens: any) {
    deprecated(
      'useSetLens',
      `Maybe be removed in next verion. Now 'useSetLens' is the alias of 'useSetting'.But considering type support,` +
        `'useSetting' supports Setting while useSetLens only supports Lens, so useSetting instead of it!`,
    );
    return useSetting(lens);
  }

  function useLensV(lens: any, _initialValue: any, isEqual?: any) {
    deprecated(
      'useLensV',
      `Maybe be removed in next verion. Now 'useLensV(lens,initialValue,isEqual)' has the same effect with 'useLens(lens,isEqual)'!!!`,
    );
    return useLens(lens, isEqual);
  }
};
