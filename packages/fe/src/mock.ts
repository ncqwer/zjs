import { FEType, Func } from '.';

const [isMock, _setMock] = (function () {
  let mockFlag = false;
  return [() => mockFlag, (flag: boolean) => (mockFlag = flag)] as const;
})();

export const setMock = _setMock;

export const [mockFn, mockFe, getFn, getFe, clearAllMock] = (function () {
  const mockFnMap = new Map();
  const mockFeMap = new Map();
  return [mockFn, mockFe, getFn, getFe, clearAllMock] as const;
  /**
   *
   * @param f 具名的函数
   * @param mf mock的实现
   */
  function mockFn<F extends Func>(f: F, mf: F) {
    mockFnMap.set(f.name, mf);
  }
  /**
   *
   * @param fe fe节点
   * @param mf mock的实现
   */
  function mockFe<F extends Func>(fe: FEType<F>, mf: F) {
    mockFeMap.set(fe.id, mf);
  }
  function getFn<F extends Func>(fn: F): F {
    if (!fn.name || !isMock() || !mockFnMap.has(fn.name)) return fn;
    return mockFnMap.get(fn.name);
  }
  function getFe<F extends Func>(fe: FEType<F>): FEType<F> {
    if (!isMock() || !mockFeMap.has(fe.id)) return fe;
    const f = mockFeMap.get(fe.id);
    const ans = () => f;
    ans.id = fe.id;
    return ans;
  }
  function clearAllMock() {
    mockFnMap.clear();
    mockFeMap.clear();
  }
})();
