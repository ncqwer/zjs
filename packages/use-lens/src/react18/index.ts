import { DeepPartial } from '../index';
import { MiddlewareImpl, Store } from './createStore';
import { hooks } from './react/hooks';

export type Middleware<State> = (
  store: Store<State>,
  initialState: State,
) => {
  get?: (next: () => State) => () => State;
  set?: (
    next: (newState: State, message?: string) => void,
  ) => (newState: State, message?: string) => void;
};

export const createShared = <State>(
  initialValue: DeepPartial<State>,
  middlewares: Middleware<State>[] = [],
) => {
  const composedMiddleware: MiddlewareImpl<State> = (
    store: Store<State>,
    initialState: State,
  ) => {
    const middlewaresWithStore = (middlewares as MiddlewareImpl<State>[]).map(
      (m) => m(store, initialState),
    );
    const gets = middlewaresWithStore.map((m) => m.get).filter(Boolean);
    const sets = middlewaresWithStore.map((m) => m.set).filter(Boolean);
    return {
      get: gets.reduce(
        (acc, get) => (next) => acc((...args) => get(next)(...args)),
        (next) => (...args) => next(...args),
      ),
      set: sets.reduce(
        (acc, set) => (next) => acc((...args) => set(next)(...args)),
        (next) => (...args) => next(...args),
      ),
    };
  };
  return hooks<State>(composedMiddleware, initialValue as any);
};
