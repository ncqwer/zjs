# `@zhujianshi/fe`

> `fe`是`function with environment`的简写。通过在函数运行时附加的环境变量，可以拓展函数运行时的功能。



## Usage

### 上下文（context）

```js
const Context = createContext({ user: 'user' });
const testCase = fe(({ useContext }) => () => {
  return useContext(Context);
});
const times = Math.floor(Math.random() * 10);
const parent = fe(({ trigger, setContext }) => (i = 0): {
  user: string;
} => {
  setContext(Context, { user: 'simple user' });
  if (i === times) return trigger(testCase);
  return trigger(parent, ++i);
});
const value = run(fe(({ trigger }) => () => trigger(parent)));
expect(value.user).toBe('simple user');
```

同时支持async

```js
const Context = createContext({ user: 'user' });
const testCase = fe(({ useContext }) => async () => {
  return useContext(Context).user;
});
const parent = fe(({ trigger, setContext }) => async () => {
  await Promise.resolve();
  setContext(Context, { user: 'parent' });
  return trigger(testCase);
});
const value = await run(
  fe(({ trigger, setContext }) => async () => {
    setContext(Context, { user: 'root' });
    return Promise.all([
      trigger(testCase),
      trigger(parent),
      trigger(testCase),
    ]);
  }),
);
expect(value).toEqual(['root', 'parent', 'root']);
```


### 缓存与ref

`@zhujianshi/fe`支持在多次调用的过程中根据依赖项缓存部分运算的结果。

```js
const fn = jest.fn(() => Math.random());
const testCase = fe(({ useMemo }) => (...dependencies: any[]) => {
  const value = useMemo('memo', () => fn(), dependencies ?? []);
  return value;
});

const times = Math.floor(Math.random() * 100);
const value = run(
  fe(({ trigger }) => () => {
    return Array.from({ length: times })
      .map(() => trigger(testCase, 'key1', 'key2'))
      .reduce(
        (acc: null | number, v: number) => (acc === v ? acc : null) as any,
      );
  }),
);
expect(value).not.toBeNull();
expect(fn).toBeCalledTimes(1);
```

如果你对默认的缓存策略不满意，可以使用`useRef`来构建你自己的缓存行为。

```js
const testCase = fe(({ useRef }) => () => {
  const ref = useRef('value', 0);
  ref.current++;
  return ref.current;
});
const countTimes = Math.floor(Math.random() * 100);

const value = run(
  fe(({ trigger }) => () => {
    return Array.from({ length: countTimes }).reduce(
      () => trigger(testCase),
      0,
    );
  }),
);
expect(value).toBe(countTimes);
```

> ⚠️需要注意的是，缓存行为依赖于关联环境的不变化（实际上，缓存的值存在环境中）。关于环境相关的解释请参考[相关概念](CONCEPTUAL.md)。


## Test

在测试环境下，`@zhujianshi/fe`通过劫持向fe节点注入的`trigger`和`call`函数来达到单元测试中的mock能力。

### mock 普通函数

在测试环境中，`call(apiCall,...apiArgs)`函数会先检索是否在全局范围内注册函数`apiCall`相关联的mock版本并优先返回mock版本。

```js
setMock(true); // 开启测试环境

// src
const fn = () => 'no mock';
const testCase = fe(({ call }) => () => call(fn));
const main = fe(({ trigger }) => () => trigger(testCase));

// test
const f = jest.fn(() => 'mock');
mockFn(fn, f);
const value = run(main);
expect(value).toBe('mock');
expect(f).toBeCalledTimes(1);
// expect(fn).not.toBeCalled();
```
> ⚠️需要注意的是，当前版本使用`function.name`来作为查找函数的关键所在，没有`function.name`的匿名函数暂时没法使用此项功能。

### mock fe

在测试环境中，`trigger(serviceFe,...serviceArgs)`函数会先检索是否在全局范围内注册fe`serviceFe`相关联的mock版本并优先返回mock版本。

```js
setMock(true); // 开启测试环境

// src
const fn = () => 'no mock';
const testCase = fe(({ call }) => () => call(fn));
const main = fe(({ trigger }) => () => trigger(testCase));

// test
const f = jest.fn(() => 'mock');
mockFe(testCase, f);
const value = run(main);
expect(value).toBe('mock');
expect(f).toBeCalledTimes(1);
// expect(fn).not.toBeCalled();
```

## Api

### fe

fe接受一个高阶方法，返回一个在环境中具有关联的fe节点。

```ts
type fe = <F extends Func>(f: FETypeImpl<F>)=>FEType<F>;
type FETypeImpl<F extends Func> = (
  handlers: {
    call: CallType;
    trigger: TriggerType;
    getEnvId: () => Key;
  } & Hooks,
) => F;
```

这个高阶函数接受一个包含`api`的对象并返回具体的方法，它的结构具体如下：

```js
const feImpl = (feApis)=>(...args)=>{
  // your logic here
}
```

其中feApis包含

- trigger
- call
- useRef
- useMemo
- useContext
- setContext

### run 

`run`函数接受一个fe节点和调用参数，开启一次完成的调用过程并返回具体结果。

```ts
type RunType = <F extends Func>(fe: FEType<F>, ...args: Parameters<F>) => ReturnType<F>;
```

### createContext

创建context。

```ts
type createContext = <T>(initialValue: T) => Context<T>;
```

**以下4个api与测试相关**

### setMock && clearAllMock

setMock用于设置当前是否为mock环境，clearAllMock用于清除所有的mock.

```ts
type setMock = (flag:boolean) => void; // flag == true, 开启测试环境

type clearAllMock = () => void;
```

### mockFn

用于mock某个被`call`调用的普通函数

```ts
type mockFn = <F extends Func>(f: F, mf: F) => void;
```

### mockFe

用于mock某个被`trigger`调用的fe节点

```ts
type mockFe = <F extends Func>(fe: FEType<F>, mf: F) => void;
```

> ⚠️mockFe第二个参数是fe逻辑的具体实现，而不是一个用于产生fe节点的高阶函数。


**以下的api均来源于高阶函数(feImpl)的feApis对象**
**以下的api均可适用于async(promise)环境**

### useContext && setContext

`useContext`用于从特定Context中取值，`setContext`用于设定特定Context的值用于子代fe存取.

```ts
type useContext = <T>(context: Context<T>) => T;
type setContext = <T>(context: Context<T>, value: T) => void; 
```
> ⚠️需要注意的是，在某个fe节点调用`setContext`仅仅会影响其后代节点，对自身取值并没有效果。
> ```ts
> const Context = createContext(1);
> const child = fe(({useContext})=>()=>{
>   const value = useContext(Context); // value: 2;
> });
> const parent = fe(({useContext,setContext,trigger})=>()=>{
>   const value = useContext(Context); // 读取的是上级的值, value:1
>   trigger(child); // 由于在setContext之前，在第一运行的时候，并不清楚Context得到修改，故得到的是上级的旧值。
>   setContext(Context,2);
>   trigger(child);
>   const value = useContext(Context); // 读取的是上级的值,value:1
> });
> ```
> 同时需要注意的还有，在调用子fe时机，应该总在`setContext`逻辑之后，这样才能保证第一次调用过程中，子fe才可以识别到值。

### useMemo && useRef

useRef和useMemo用于保证在多次调用逻辑时维持同一个值。

```ts
type useRef = <T>(key: string, value: T) => { current: T};
type useMemo = <F extends () => any>( key: string,f: F,dependencies?: any[])=>ReturnType<F>;
```

当`useMemo`的`dependencies`为`undefined`时，默认缓存策略失效，每次都重新计算值。

## Example

[一个简易的使用redis和orm层进行查询的例子](https://github.com/ncqwer/zjs/blob/main/packages/fe/example/getValueWithRedisAndSql.ts)