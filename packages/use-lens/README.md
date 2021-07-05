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
} = createShared<DataType>(initailData,options);
```

其中`option`类型为:
```tsx
type options = {
  mode?: 'macro' | 'micro' | 'instant'; 
  onStart?: Func; //每次更新通知开始前
  onFinish?: Func; //每次更新通知完成后
  callback?: (v: DeepPartial<T>) => void; //每次onFinish结束后
};
```

`useLens`的类型为：
```tsx
const [ value,setValue ] = useLens(pathOfValue); //pathOfValue为用于lensPath构建的数组

//or pass your custom lens
const [ value,setValue ] = useLens(yourLens);
```

`useLensV`的类型与`useLens`基本一致,除了它支持initialValue,

```tsx
const [ value,setValue ] = useLensV(pathOfValue,initialValue); //pathOfValue也可以替换为yourLens
```
在当前观测值为`undefined`的时候，useLensV会设置关注值为初值，并通过throw promise的方式终止当前render。并在resolved的时候迫使最近的`ChangeBridge`更新，从而使设置的初值可以被其他组件所感知。

`useSetLens`的类型为：

```tsx
const setValue = useSetLens(pathOfValue);//pathOfValue也可以替换为yourLens;
```
正如它名字那样，`useSetLens`用来设置关注值的新值，**值得注意的是它并不会在当前组件观测关注值**。

`SharedProvider`为组件：
```tsx
interface SharedProviderProps{
  initialValue: PartialValue; 
  option: StoreOption; //等同于createShared的配置参数
  value?: Value;
  onChange?: (v:Value)=>void;
}
```
`SharedProvider`内置了一个新的数据源（类型与全局数据源一样），并重定向了其后代组件的数据源指向，这一特性使得在编写在同一页面多次重复出现的复杂组件时较为方便。


### ChangeBridge

当同一组件内部使用多个共享值的时候，或者父组件和子组件观测同一值的时候，往往会面临同时更新多个值的情况，很可能导致在某次某个组件渲染时，props与观测值版本不一致的情况发生。这种情况随着逻辑的日益增长，发生概率开始上升，而排查难度也愈发困难。但所幸在大多数情况下，这种不一致往往不会导致问题（被之后的更新覆盖掉）。但如果发生了问题（一般情况为页面数据不一致），`ChangeBridge`就发挥了作用。

`ChangeBridge`为组件，其类型为：

```tsx
interface ChangeBridgeProps {
  fallback?: JSX.Elemnet;
  controlled?: boolean; // 默认值为false,用来控制其是否被祖先几杯的ChangeBridge控制
}
```
在`ChangeBridge`的后代组件中，所有的更新导致的组件更新都将重定向到当前`ChangeBridge`中。即`ChangeBridge`保证其包裹组件的数据版本一致。**值得注意的是，`ChangeBridge`也会导致后代组件存在多次无效render，故在使用时，请考虑完备后搭配`React.memo`使用**。

> `ChangeBridge`为使用`useLensV`的必备条件。

## Detail

### setValue的行为差异

由于设计上遵循了`lens`,`useLens\useLensV`所导出的`setValue`并不会自动判断当前值与修改后的值是否相等后跳过更新，即

```tsx
const { useLens } = createShared({a:{b:1}});

useLens(['a']); // in Component A

const [,setValue] = useLens(['a','b']) // in Component B

// in event trigger
setValue(1); // A rerender while B don't
```
在上诉情况中，虽然b的新值是重复的值1，但由于b为a的子属性，故a的值实际上变为了一个新的对象。故最终的结果是组件AB都被通知更新，由于`old_a !== new_a && old_b === new_b`, 故A被更新，B略过本次更新。 

### option中的mode的作用

`mode`的值是用来控制`useLens\useLensV`在值发生变化的时，通知组件新数据到来的所采用的策略。为区分不同的使用场景，`mode`的取值分为三类：`macro`、`micro`、`instant`，它们在设计意义上上使用以下场景：

  - instant: 在此模式下，`useLens\useLensV`的表现等同于`React.useState`,每次`setValue`均会通知所有观测的组件进行是否更新的判断。
  - micro: 在此模式下，`useLens\useLensV`将仅仅同步更新值，并将通知行为延后到微观队列(`Promise.resolve().then`)进行。由于在共享数据的使用场景中，观测同一值的组件往往不只一种，故这种行为可以较好的避免多次重复渲染。**需要注意的是，由于使用了微观队列，`React`默认的update合并并不能同时作用到原生的`setValue`和当下的`setLensValue`**。
  - marco: 在此模式下，`useLens\useLensV`的行为与`mirco`大致一样，除了将更新通知的行为移到了下一次React更新。当一个值被较多的组件同时观测时，观测值更新的代码可能会花费较多时间，启用该模式可以将这一行为延后到之后执行，防止出现卡顿的情况。**需要注意的是，在启用`marco`后，`setValue`这一行为与原生存在较大差异，在混用的过程中容易发生难以预测的行为。故`marco`的启用应该较为谨慎，一般来说，只是将其视为卡顿出现后的应急情况。**

**考虑大多数情况，`mode`的默认值为`micro`**;

## Q&A

1. `SharedProvider`如何转化为受控组件？

Ans: 直接传递`value,onChange`即可。

```tsx
const [ value,onChagne ] = React.useState(getInitialValue());

<SharedProvider value={value} onChange={onChange}></SharedProvider>
```
