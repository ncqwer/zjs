# `@zhujianshi/use-lens`

> 创建可被react组件局部共享的值。使用lens进行值的存取。

## Install

```bash
npm install @zhujianshi/use-lens

# or use yarn
yarn add @zhujianshi/use-lens
```

## Quick Start

```ts
import { createShared } from '@zhujianshi/use-lens';
class A {
  a = 'string';
}
type ShareState={
  a:{
    b:{
      c: number;
    }
  },
  value: string;
  instance: A;
}



const { useLens } = createShared({
  instance: new A(),
  value:'hhh',
});


// in your component
useLens(['value']) // ['hhh',setV],
useLens(['A','a']) // ['string',setV],

```

## API

### createShared

```tsx
const {
  useLens,
  useLensV,
  useSetLens,
  SharedProvider,
  storeLens,
} = createShared<DataType>(initailData);
```

`useLens`的类型为：
```tsx
const [ focusedValue,setFocusedValue ] = useLens(pathOfValue); //pathOfValue为用于lensPath构建的数组

//or pass your custom lens
const [ focusedValue,setFocusedValue ] = useLens(yourLens);
```

`useGetting`的类型为：

```tsx
const focusedValue = useGetting(pathOfValue);//pathOfValue也可以替换为yourLens;
```
正如它名字那样，`useSetLens`用来设置关注值的新值，**值得注意的是它并不会在当前组件观测关注值**。


`useSetting`的类型为：

```tsx
const setValue = useSetting(pathOfValue);//pathOfValue也可以替换为yourLens;
```
正如它名字那样，`useSetting`用来设置关注值的新值，**值得注意的是它并不会在当前组件观测关注值**。

> 之前的版本中的`useSetValue`现在已经被`useSetting`所取代，并会在后续版本中移除。

`SharedProvider`为组件：
```tsx
interface SharedProviderProps{
  initialValue?: PartialValue; 
  value?: Value;
}
```
`SharedProvider`内置了一个新的数据源（类型与全局数据源一样），并重定向了其后代组件的数据源指向，这一特性使得在编写在同一页面多次重复出现的复杂组件时较为方便。

> 之前版本的`onChange`已经被放弃，转而使用ref获得SharedProvider的实例，例子如下：
> ```tsx
> const ref = React.useRef(null);
> <SharedProvider ref={ref}></SharedProvider>
>
> const state = ref?.current?.getState();
> ```



## Detail

### setValue的行为差异变化

由于内置依赖(@zhujianshi/lens)[https://www.npmjs.com/package/@zhujianshi/lens]的变化，现在setValue(prev=>prev)并不会调度更新。

### 减少listeners的调用次数

在一次更新过程中，同步更新同一数据源的不同局部，可能会导致执行通知回调的过程耗时较长（在同一数据源上监听过多组件时现象比较明显）。此时，选择将数据源的同步更新和react的调度更新拆分开来（即多次同步更新数据源，并异步通知组件更新），可以有效降低无效监听次数。针对这种情况，提供了一下两个辅助函数：

```ts
declare const microBundled = (fn: ()=>void):void; // 将fn中产生的更新所引发的调度放在下一刻的微队列上（Promise.resolve(()=>{调度更新})
declare const macroBundled = (fn: ()=>void):void; // 将fn中产生的更新所引发的调度放在下一刻的宏队列上（setTimeout(()=>{调度更新})
```

