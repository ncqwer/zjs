import Functor from '../../src/typeclass/Functor';
import { Identity } from '../../src/type/Identity';
import { fmap } from '../../src/type';

describe('[Identity] test', () => {
  describe('[Functor] rules', () => {
    test('eqWithId', () => {
      const v = Identity(1);
      expect(Functor.rules(fmap).eqWithId(v));
    });
    test('eqWithCombination', () => {
      const v = Identity(2);
      expect(
        Functor.rules(fmap).eqWithCombination(
          v,
          (x: number) => x + 1,
          (x: number) => x * 2,
        ),
      );
    });
  });
});
