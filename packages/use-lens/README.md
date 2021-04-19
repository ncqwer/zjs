# `@zhujianshi/use-lens`

> TODO: description

## Usage

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
