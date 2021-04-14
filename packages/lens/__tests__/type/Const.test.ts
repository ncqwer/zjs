import FunctorImpl from '../../src/typeclass/Functor';
import { Const } from '../../src/type/Const';
import { fmap } from '../../src/type';

describe('[Const] test', () => {
  describe('[Functor] rules', () => {
    test('eqWithId', () => {
      const v = Const(1);
      expect(FunctorImpl.rules(fmap).eqWithId(v));
    });
    test('eqWithCombination', () => {
      const v = Const(2);
      expect(
        FunctorImpl.rules(fmap).eqWithCombination(
          v,
          (x: number) => x + 1,
          (x: number) => x * 2,
        ),
      );
    });
  });
});
