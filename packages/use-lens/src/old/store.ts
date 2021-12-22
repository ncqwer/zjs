import { Lens, over, set } from '@zhujianshi/lens';
import { createTaskScheduleByMode } from './schedule';
import { SubscriberDuplicateError, InteralError } from './error';

type Func<A = void, B extends any[] = []> = (...args: B) => A;

export type DeepPartial<T> = T extends number
  ? number
  : T extends string
  ? string
  : T extends any[]
  ? T
  : {
      [k in keyof T]?: DeepPartial<T[k]>;
    };

export type Store<T> = {
  getState: () => T;
  _setState: (v: T) => void;
  _setCallback: (f?: (v: T) => void) => void;
  dispatch: (action: Action<T>) => void;
  register: (subscriber: Subscriber<T>) => () => void;
  resetInitialValue: (init: InitialValueSlice<T>, callback?: Func) => never;
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
    callback: cb,
    wrapper,
  }: {
    mode?: 'macro' | 'micro' | 'instant';
    onStart?: Func;
    onFinish?: Func;
    callback?: (v: DeepPartial<T>) => void;
    wrapper?: (f: Func) => void;
  } = {},
) => {
  // let currentSchedulePendding: (Promise<void> & { ready: Func }) | null = null;
  const schedule = createTaskScheduleByMode(mode)({
    wrapper,
    onStart() {
      if (onStart) onStart();
      // if (currentSchedulePendding) currentSchedulePendding.ready();
      // let f = null;
      // currentSchedulePendding = new Promise((res) => {
      //   f = res;
      // }) as any;
      // (currentSchedulePendding as any).ready = f;
    },
    onFinish() {
      if (onFinish) onFinish();
      callback && callback(state);
      // if (currentSchedulePendding) {
      //   currentSchedulePendding.ready();
      //   currentSchedulePendding = null;
      // }
    },
  });

  type State = DeepPartial<T>;
  let state = initialState;
  let entities: Subscriber<State>[] = [];
  let callback = cb;
  const store: Store<State> = {
    getState: () => state,
    _setState: (v: State) => (state = v),
    _setCallback: (f?: (v: DeepPartial<T>) => void) => (callback = f),
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

  function resetInitialValue(
    { targetLens, initialValue }: InitialValueSlice<State>,
    refreshRoot?: Func,
  ): never {
    if (typeof initialValue === 'function') {
      state = over(targetLens, initialValue, state);
    } else {
      state = set(targetLens, initialValue, state);
    } // 这里不去trigger关联的组件更新，使用
    throw Promise.resolve().then(() => {
      refreshRoot && refreshRoot();
    });
  }
};
