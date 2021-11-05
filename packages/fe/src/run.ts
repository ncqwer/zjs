import type { TriggerType, CallType, Func, FEType } from './index';
import { Env, createEnv, setEnv } from './env';
import { getFe, getFn } from './mock';
import { makeHooks } from './hooks';

const assertFunc = (f: any) => {
  if (typeof f !== 'function') throw new Error('must be function');
};

const makeCall = (env: Env | null): CallType => (f, ...args) => {
  const fn = getFn(f);
  const recover = setEnv(env);
  let res = fn(...args);
  if (res && typeof res?.then === 'function') {
    const preRes = res;
    res = {
      then(res: any, rej: any) {
        assertFunc(res);
        if (rej) assertFunc(rej);
        return preRes.then(
          (v: any) => {
            // console.log('envd', env?.envId);
            setEnv(env);
            return res(v);
          },
          rej
            ? (error: any) => {
                setEnv(env);
                return rej(error);
              }
            : undefined,
        );
      },
      catch(rej: any) {
        assertFunc(rej);
        return preRes.catch((error: any) => {
          setEnv(env);
          return rej(error);
        });
      },
    };
  }
  recover();
  return res;
};

const makeTrigger = (parentEnv: Env | null): TriggerType => (f, ...args) => {
  const fe = getFe(f);
  const env = createEnv(parentEnv, fe);
  const call = makeCall(env);
  const trigger = makeTrigger(env);
  const hooks = makeHooks(() => env);
  const getEnvId = () => env.envId;
  return makeCall(parentEnv)(() =>
    call(fe({ trigger, call, getEnvId, ...hooks }), ...args),
  );
};

export const run = <F extends Func>(fe: FEType<F>, ...args: Parameters<F>) => {
  return makeTrigger(null)(fe, ...args);
};
