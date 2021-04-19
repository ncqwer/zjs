import { view, set } from '../../src/lens/lens';
import { lensProp } from '../../src/lens/lensProp';
import * as R from 'ramda';

describe('lensProp test', () => {
  describe('simplest usage case', () => {
    type SourceType<T> = {
      a: T;
    };
    const source: SourceType<string> = {
      a: 'hhh',
    };
    const len = lensProp<SourceType<string>>('a');
    test('view test', () => {
      expect(view(len, source)).toBe('hhh');
      expect(view(len, {} as any)).toBeUndefined();
    });

    test('set test', () => {
      expect(view(len, set(len, 'hello', source))).toBe('hello');
    });

    test('Interoperability with ramda', () => {
      expect(R.view(len, source)).toBe('hhh');
      expect(R.view(len, R.set(len, 'testStr', source))).toBe('testStr');
    });

    // test('test with promise', async () => {
    //   const ans = await len((x) => Promise.resolve(x) as any)(source);
    //   // expect(view())
    // });
  });
});
