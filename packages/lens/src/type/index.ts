import { createRuntimeBundle } from '../framework';
import FunctorImpl from '../typeclass/Functor';

import ConstImpl from './Const';
import IdentityImpl from './Identity';
import PromiseImpl from './Promise';
import ArrayImpl from './Array';
import FantasyLandImpl from './fantasyLand';
import mapLike from './mapLike';

export const { fmap } = createRuntimeBundle(FunctorImpl.createTypeBundle)(
  ConstImpl.impl,
  IdentityImpl.impl,
  PromiseImpl.impl,
  ArrayImpl.impl,
  FantasyLandImpl.impl,
  mapLike.impl,
);
