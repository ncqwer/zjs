import React from 'react';
import { DeepPartial } from '../..';
import { MiddlewareImpl, createStore, Store } from '../createStore';
import { useDerivedValue } from '../utils/useDerivedValue';

export function context<State>(
  middleware: MiddlewareImpl<State>,
  initialValue: State,
) {
  const store = createStore(middleware, initialValue);
  let value = Object.assign({}, initialValue);
  const Context = React.createContext(store);

  store.__bind(
    () => value,
    (nValue) => (value = nValue),
  );

  const SharedProvider = React.forwardRef<
    {
      getState: () => State;
    },
    {
      value?: State;
      initialValue?: DeepPartial<State>;
      children: React.ReactNode;
    }
  >(({ children, value, initialValue: _initialValue }, ref) => {
    const storeRef = React.useRef<Store<State> | null>(null);
    const [initialState] = React.useState(() =>
      Object.assign({}, initialValue, _initialValue),
    );

    if (storeRef.current === null) {
      const v = value || initialState;
      storeRef.current = createStore(middleware, v);
    }
    React.useImperativeHandle(ref, () => ({
      getState: () => storeRef.current!.getState(),
    }));
    return (
      <Context.Provider value={storeRef.current}>
        <StateComponent
          store={storeRef.current}
          value={value}
          initialValue={initialState}
        ></StateComponent>
        {children}
      </Context.Provider>
    );
  });

  return {
    store,
    SharedProvider,
    useStore: () => React.useContext(Context),
  };

  function StateComponent({
    store,
    value,
    initialValue,
  }: {
    store: Store<State>;
    value?: State;
    initialValue: State;
  }) {
    const v = value || initialValue;
    const [state, setState] = useDerivedValue(v, (nV) =>
      store.setState(nV, 'change from top component'),
    );
    store.__bind(() => state, setState);
    return null;
  }
}
