import { Context } from '.';
import { Env, getEnv as unstable_getEnv } from './env';

export const makeHooks = (getEnv: () => Env) => {
  return { useRef, useMemo, useContext, setContext };

  /**
   *
   * @param key 存取特定值的key
   * @param value 初始值
   * @returns
   */
  function useRef<T>(key: string, value: T) {
    const cache = getEnv().getCache();
    if (!cache) throw new Error('call code without runner!!!');
    if (!cache.has(key) && value != null) {
      cache.set(key, value);
    }
    return Object.seal({
      get current() {
        return cache.get(key);
      },
      set current(nV) {
        cache.set(key, nV);
      },
    }) as { current: T };
  }

  /**
   *
   * @param key 存取特定值的key
   * @param f 求值的方法
   * @param dependencies 判断缓存的值是否过期的依据
   * @returns
   */
  function useMemo<F extends () => any>(
    key: string,
    f: F,
    dependencies = [{}],
  ): ReturnType<F> {
    const data = useRef<any>(key, null);
    const value = data.current;
    if (value && isDependenciesEqual(dependencies, value.dependencies)) {
      return value.cache;
    }
    const newValue = {
      dependencies,
      cache: f(),
    };
    data.current = newValue;
    return newValue.cache;
  }

  function getContext<T>(context: Context<T>): Context<T> | null {
    const env = getEnv();
    return env.contextGet(context.id);
  }

  /**
   * 用于从特定Context中取值
   * @param context 取值的上下文
   * @returns
   */
  function useContext<T>(context: Context<T>): T {
    const currentContext = getContext(context);
    if (currentContext) return currentContext.getValue();
    return context.getValue();
  }

  /**
   * 设定特定Context的值用于子代fe存取
   * @param context 设置值的上下文
   * @param value 上下文的新值
   */
  function setContext<T>(context: Context<T>, value: T) {
    const env = getEnv();
    env.contextSet(context.id, context.create(value));
  }
};

const isDependenciesEqual = (lhs: any[], rhs: any[]) => {
  if (lhs.length !== rhs.length) return false;
  return lhs.reduce((acc, v, idx) => acc && v === rhs[idx], true);
};

export type Hooks = ReturnType<typeof makeHooks>;

export const unstable_hooks = makeHooks(unstable_getEnv);
