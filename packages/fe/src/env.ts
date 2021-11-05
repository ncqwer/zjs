import { FEType, Key } from './index';

export type Env = {
  contextGet: (id: Key) => any;
  contextSet: (id: Key, value: any) => void;
  getCache: () => Map<string, any>;
  getCalledMemo: (fe: FEType<any>) => any;
  setCalledMemo: (fe: FEType<any>, data: any) => void;
  envId: Key;
};

export const [getEnv, setEnv] = (function () {
  let currentEnv: Env | null = null;
  return [
    () => {
      if (!currentEnv) throw new Error('');
      return currentEnv;
    },
    (nV: Env | null) => {
      const prev = currentEnv;
      currentEnv = nV;
      return () => setEnv(prev);
    },
  ] as const;
})();

const getCalledMemo = (parentEnv: Env | null, fe: FEType<any>) => {
  let data = parentEnv?.getCalledMemo(fe);

  if (!data) {
    data = {
      cacheMap: new Map(),
      contextMap: new Map(),
      calledMap: new Map(),
    };
    parentEnv?.setCalledMemo(fe, data);
  }
  return data;
};

let envId = 0;
export const createEnv = (parentEnv: Env | null, fe: FEType<any>) => {
  const { cacheMap, contextMap, calledMap } = getCalledMemo(parentEnv, fe);
  return {
    contextGet: (id) => {
      if (contextMap.has(id)) return contextMap.get(id);
      return parentEnv?.contextGet(id);
    },
    contextSet: (id, value) => contextMap.set(id, value),
    getCache: () => cacheMap,
    getCalledMemo: (hfn) => {
      return calledMap.get(hfn.id);
    },
    setCalledMemo: (hfn, data) => {
      calledMap.set(hfn.id, data);
    },
    envId: envId++,
    // cacheMap,
    // contextMap,
    // calledMap,
  } as Env;
};

export const logEnvId = (prefix?: string) => {
  const env = getEnv();
  console.log(
    `%c [ ${prefix}.env.envId ]`,
    'font-size:13px; background:pink; color:#bf2c9f;',
    env.envId,
  );
  return env.envId;
};
