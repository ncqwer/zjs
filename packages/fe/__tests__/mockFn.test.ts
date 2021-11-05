import { run, fe, clearAllMock, setMock, mockFn } from '../src';

let fn = () => {};
const testCase = fe(({ call }) => () => call(fn));
const main = fe(({ trigger }) => () => trigger(testCase));

describe('mockFn  test', () => {
  beforeEach(() => {
    setMock(true);
    clearAllMock();
  });
  afterEach(() => {
    clearAllMock();
    setMock(false);
  });
  test('should work normally', () => {
    const f = jest.fn(() => 'mock');
    fn = jest.fn(() => 'no mock');
    mockFn(fn, f);
    const value = run(main);
    expect(value).toBe('mock');
    expect(f).toBeCalledTimes(1);
    expect(fn).not.toBeCalled();
  });

  test('should not work when mock flag is flase', () => {
    setMock(false);
    const f = jest.fn(() => 'mock');
    fn = jest.fn(() => 'no mock');
    mockFn(fn, f);
    const value = run(main);
    expect(value).toBe('no mock');
    expect(fn).toBeCalledTimes(1);
    expect(f).not.toBeCalled();
  });
});
