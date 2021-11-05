import { logEnvId } from '../src/env';
import {
  fe,
  // useContext,
  run,
  // useMemo,
  // setContext,
  createContext,
  mockFn,
  setMock,
} from '../src/index';

setMock(true);

const RedisContext = createContext<{ search: any; save: any } | null>(null);
const OrmContext = createContext<{ search: any } | null>(null);
const getRedisConfig = async () => 'redis config';

const createRedis = (config: string) => ({
  search: () => 'data',
  save: () => {},
});

const redisSearch = (redis: any, ...args: any[]): string | null => 'data';
mockFn(redisSearch, () => null);

const getOrmConfig = async () => 'redis config';

const createOrm = (config: string) => ({
  search: () => 'orm data',
  save: () => {},
});

const ormSearch = (redis: any, ...args: any[]) => 'orm data';

const isEmpty = (v: any) => false;

const main = fe(
  ({ call, trigger, useContext, useMemo, setContext }) => async (
    ...props: any[]
  ) => {
    logEnvId();
    const redisConfig = await call(getRedisConfig);
    logEnvId();
    const redis = await useMemo('redis', () => call(createRedis, redisConfig), [
      redisConfig,
    ]);
    logEnvId();
    setContext(RedisContext, redis);
    const ormConfig = await call(getOrmConfig);
    logEnvId();
    const orm = await useMemo('orm', () => call(createOrm, ormConfig), [
      ormConfig,
    ]);
    logEnvId();
    setContext(OrmContext, orm);

    const resultFromCache = await trigger(getFromCache, ...props);
    logEnvId();
    if (!!resultFromCache) return resultFromCache;
    const resultFromSql = await trigger(getFromSql, ...props);
    if (!!resultFromSql) {
      if (!isEmpty(resultFromSql))
        await trigger(saveCache, resultFromSql, ...props);
      logEnvId();
      return resultFromSql;
    }
    throw new Error('查找不到');
  },
);

const getKey = (...args: any[]) => 'key';
const getFromCache = fe(({ call, useContext }) => (...props: any[]) => {
  const redisKey = getKey(...props);
  logEnvId();
  const redis = useContext(RedisContext);
  console.log(
    '%c [ redis ]',
    'font-size:13px; background:pink; color:#bf2c9f;',
    redis,
  );
  return call(redisSearch, redis, redisKey);
});

const createFilter = async (...args: any[]) => 'filter';

const getFromSql = fe(({ call, useContext }) => async (...props) => {
  const filter = await call(createFilter, ...props);
  const orm = useContext(OrmContext);
  return call(ormSearch, orm, filter);
});

const saveCache = fe(({ call, useContext }) => (...props) => {
  const key = getKey(...props);
  const redis = useContext(RedisContext);
  return call(() => redis?.save(key));
});

run(main).then(console.log);
