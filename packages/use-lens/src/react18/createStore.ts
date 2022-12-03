import { getScheduler } from './schedule';

export type MiddlewareImpl<State> = (
  store: Store<State>,
  initialState: State,
) => {
  get: (next: () => State) => () => State;
  set: (
    next: (newState: State, message?: string) => void,
  ) => (newState: State, message?: string) => void;
};

export type Store<State> = {
  subscribe: (f: () => void) => () => void;
  dispatchAction: (f: (old: State) => State, message?: string) => void;
  getState: () => State;
  setState: (newState: State, message?: string) => void;
  // __bind: (get: () => State, set: (newState: State) => void) => void;
  id?: string;
};

export const createStore = <State>(
  middleware: MiddlewareImpl<State>,
  initialState: State,
  id?: string,
): Store<State> => {
  type Listener = () => void;
  type Callback = (old: State) => State;

  const listeners = new Set<Listener>();
  let internalState: State = initialState;
  // let getStateHander: () => State = null as any;
  // let setStateHandler: (newState: State, message?: string) => void =
  //   null as any;

  const store = {
    id,
    subscribe,
    dispatchAction,
    getState,
    setState,
    // __bind: (get: () => State, set: (newState: State) => void) => {
    //   internalState = null;
    //   getStateHander = get;
    //   setStateHandler = set;
    // },
  };
  const { get, set } = middleware(store, initialState);
  return store;

  function subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function dispatchAction(callback: Callback, message = 'anonymous') {
    const prevState = getState();
    const newState = callback(prevState);

    if (newState === prevState) {
      return;
    }

    internalState = newState;
    setState(newState, message);

    // if (!isTransition()) {
    // } else {
    //   if (bundledUpdaters.push({ callback, message }) === 1)
    //     Promise.resolve().then(() =>
    //       startTransition(() => performSyncUpdate(bundledUpdaters.splice(0))),
    //     );
    // }
  }

  function setState(newState: State, message?: string) {
    // if (setStateHandler) {
    //   set((v) => setStateHandler(v))(newState, message);
    //   scheduleUpdate();
    // }
    set((v) => {
      internalState = v;
    })(newState, message);
    scheduleUpdate();
  }

  function scheduleUpdate() {
    getScheduler()(() => {
      Array.from(listeners).forEach((listener) => {
        listener();
      });
    });
  }

  function getState() {
    const nV = get(() => internalState!)();
    internalState = nV;
    return internalState;
  }
};
