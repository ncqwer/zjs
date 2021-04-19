import { view, set } from '../../src/lens/lens';
import { lensPath } from '../../src/lens/lensPath';
import * as R from 'ramda';

describe('lensPath test', () => {
  describe('simplest usage case', () => {
    type SourceType<T> = {
      a: {
        b: {
          c: {
            value: T;
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
    const len = lensPath<SourceType<number>>(['a', 'b', 'c', 'value']);
    test('view test', () => {
      expect(view(len, source)).toBe(1);
      expect(view(len, {} as any)).toBeUndefined();
    });

    test('set test', () => {
      expect(view(len, set(len, 3, source))).toBe(3);
    });

    test('Interoperability with ramda', () => {
      expect(R.view(len, source)).toBe(1);
      expect(R.view(len, R.set(len as any, 'testStr', source))).toBe('testStr');
    });

    // test('test with promise', async () => {
    //   const ans = await len((x) => Promise.resolve(x) as any)(source);
    //   // expect(view())
    // });
  });
});
