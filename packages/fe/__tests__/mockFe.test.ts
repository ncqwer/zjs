import { run, fe, clearAllMock, setMock, mockFe } from '../src';

let fn: any = null;
const testCase = fe(() => fn);
const main = fe(({ trigger }) => () => trigger(testCase));

describe('mockFe test', () => {
  beforeEach(() => {
    setMock(true);
    fn = null;
    clearAllMock();
  });
  afterEach(() => {
    clearAllMock();
    fn = null;
    setMock(false);
  });
  test('should work normally', () => {
    const f = jest.fn(() => 'mock');
    fn = jest.fn(() => 'no mock');
    mockFe(testCase, f);
    const value = run(main);
    expect(value).toBe('mock');
    expect(f).toBeCalledTimes(1);
    expect(fn).not.toBeCalled();
  });

  test('should not work when mock flag is flase', () => {
    setMock(false);
    const f = jest.fn(() => 'mock');
    fn = jest.fn(() => 'no mock');
    mockFe(testCase, f);
    const value = run(main);
    expect(value).toBe('no mock');
    expect(fn).toBeCalledTimes(1);
    expect(f).not.toBeCalled();
  });
});
