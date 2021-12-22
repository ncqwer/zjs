import { isTransition, startTransition } from './startTranstion';

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
  subscribe: (f: (state: State) => void) => () => void;
  dispatchAction: (f: (old: State) => State, message?: string) => void;
  getState: () => State;
  setState: (newState: State, message?: string) => void;
  __bind: (get: () => State, set: (newState: State) => void) => void;
};

export const createStore = <State>(
  middleware: MiddlewareImpl<State>,
  initialState: State,
): Store<State> => {
  type Listener = (state: State) => void;
  type Callback = (old: State) => State;
  type Updater = { callback: Callback; message: string };

  const listeners = new Set<Listener>();
  const bundledUpdaters: Updater[] = [];
  let getStateHander: () => State = null as any;
  let setStateHandler: (
    newState: State,
    message?: string,
  ) => void = null as any;

  const store = {
    subscribe,
    dispatchAction,
    getState,
    setState,
    __bind: (get: () => State, set: (newState: State) => void) => {
      getStateHander = get;
      setStateHandler = set;
    },
  };
  const { get, set } = middleware(store, initialState);
  return store;

  function subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function dispatchAction(callback: Callback, message = 'anonymous') {
    if (!isTransition()) {
      performSyncUpdate([{ callback, message }]);
    } else {
      if (bundledUpdaters.push({ callback, message }) === 1)
        Promise.resolve().then(() =>
          startTransition(() => performSyncUpdate(bundledUpdaters.splice(0))),
        );
    }
  }

  function performSyncUpdate(updaters: Updater[]) {
    const prevState = getState();
    const { state: newState, message } = updaters.reduce(
      ({ state, message: prevMessage }, { callback, message }) => ({
        message: prevMessage ? `${prevMessage}|${message}` : message,
        state: callback(state),
      }),
      {
        state: prevState,
        message: '',
      },
    );

    if (newState === prevState) return;
    setState(newState, message);
  }

  function setState(newState: State, message?: string) {
    if (setStateHandler) {
      set((v) => setStateHandler(v))(newState, message);
      Array.from(listeners).forEach((listener) => {
        listener(newState);
      });
    }
  }

  function getState() {
    return get(getStateHander)();
  }
};
