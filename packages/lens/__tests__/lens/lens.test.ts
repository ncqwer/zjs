import { lens, view, set } from '../../src/lens/lens';
import * as R from 'ramda';

describe('lens test', () => {
  describe('simplest usage case', () => {
    type SourceType<T> = {
      a?: {
        b?: {
          c?: {
            value?: T;
          };
        };
      };
    };
    const source: SourceType<number> = {
      a: {
        b: {
          c: {
            value: 1,
          },
        },
      },
    };
    const setter = <S, T>(nValue: T, s: SourceType<S>): SourceType<T> => ({
      ...s,
      a: {
        ...s?.a,
        b: {
          ...s?.a?.b,
          c: {
            ...s?.a?.b?.c,
            value: nValue,
          },
        },
      },
    });
    const getter = <T>(s: SourceType<T>): T | null => s?.a?.b?.c?.value || null;
    const len = lens(getter, setter);

    test('view test', () => {
      expect(view(len, source)).toBe(1);
      expect(view(len, {})).toBe(null);
    });

    test('set test', () => {
      expect(view(len, set(len, 'testStr', source))).toBe('testStr');
    });

    test('Interoperability with ramda', () => {
      // type ans<T> = Functor<T>R.lensPath(['a', 'b', 'c', 'value']) extends R.Functor<T> ? true : false;
      const rLen = R.lensPath(['a', 'b', 'c', 'value']);
      expect(R.view(len, source)).toBe(1);
      expect(view(rLen, source)).toBe(1);
      expect(view(rLen, set(rLen, 'testStr', source))).toBe('testStr');
      expect(R.view(len, R.set(len as any, 'testStr', source))).toBe('testStr');
    });

    // test('test with promise', async () => {
    //   const ans = await len((x) => Promise.resolve(x) as any)(source);
    //   // expect(view())
    // });
  });
});
