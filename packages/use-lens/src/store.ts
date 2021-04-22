import { Lens, Func, over, set } from '@zhujianshi/lens';
import { unstable_batchedUpdates } from 'react-dom';
import { createTaskScheduleByMode } from './schedule';
import { SubscriberDuplicateError, InteralError } from './error';

export type DeepPartial<T> = {
  [k in keyof T]?: DeepPartial<T[k]>;
};

export type Store<T> = {
  getState: () => T;
  dispatch: (action: Action<T>) => void;
  register: (subscriber: Subscriber<T>) => () => void;
  resetInitialValue: (init: InitialValueSlice<T>) => never;
};

export type StoreOption = {
  mode?: 'macro' | 'micro' | 'instant';
  onStart?: Func;
  onFinish?: Func;
};

type Subscriber<S> = {
  onChange: Func<void, [Store<S>]>;
};

type Action<S, T = any, A = any, B = any> = {
  targetLens: Lens<S, T, A, B>;
  value: B | ((x: A) => B);
};

type InitialValueSlice<S, T = any, A = any, B = any> = {
  targetLens: Lens<S, T, A, B>;
  initialValue: B;
};

export const createStore = <T>(
  initialState: DeepPartial<T>,
  {
    mode = 'micro',
    onStart,
    onFinish,
  }: {
    mode?: 'macro' | 'micro' | 'instant';
    onStart?: Func;
    onFinish?: Func;
  } = {},
) => {
  let currentSchedulePendding: (Promise<void> & { ready: Func }) | null = null;
  const schedule = createTaskScheduleByMode(mode)({
    wrapper: unstable_batchedUpdates,
    onStart() {
      if (onStart) onStart();
      if (currentSchedulePendding) currentSchedulePendding.ready();
      let f = null;
      currentSchedulePendding = new Promise((res) => {
        f = res;
      }) as any;
      (currentSchedulePendding as any).ready = f;
    },
    onFinish() {
      if (onFinish) onFinish();
      if (currentSchedulePendding) {
        currentSchedulePendding.ready();
        currentSchedulePendding = null;
      }
    },
  });

  type State = DeepPartial<T>;
  let state = initialState;
  let entities: Subscriber<State>[] = [];
  const store: Store<State> = {
    getState: () => state,
    dispatch,
    register,
    resetInitialValue,
  };
  return store;

  function onFlush() {
    entities.reverse().forEach(({ onChange }) => {
      onChange(store);
    });
  }

  function dispatch(action: Action<State>) {
    const { targetLens, value } = action;
    if (typeof value === 'function') {
      state = over(targetLens, value, state);
    } else {
      state = set(targetLens, value, state);
    }
    schedule(onFlush);
  }

  function register(entity: Subscriber<State>) {
    const idx = entities.findIndex((e) => e === entity);
    if (~idx) throw SubscriberDuplicateError();
    entities.push(entity);
    return () => {
      entities = entities.filter((e) => e !== entity);
    };
  }

  function resetInitialValue({
    targetLens,
    initialValue,
  }: InitialValueSlice<State>): never {
    dispatch({
      targetLens,
      value: initialValue,
    });
    if (!currentSchedulePendding && mode !== 'instant') throw InteralError();
    throw currentSchedulePendding || Promise.resolve();
  }
};
