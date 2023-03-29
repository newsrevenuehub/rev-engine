import { act, renderHook } from '@testing-library/react-hooks';
import { useSessionState } from './useSessionState';

describe('useSessionState', () => {
  beforeEach(() => window.sessionStorage.clear());
  afterAll(() => window.sessionStorage.clear());

  it('initially sets state to the value in session storage if it exists', () => {
    window.sessionStorage.setItem('test', '"pass"');

    const { result } = renderHook(() => useSessionState('test', 'fail'));

    expect(result.current[0]).toBe('pass');
  });

  it('initially sets state to the default value if no key in session storage exists', () => {
    const { result } = renderHook(() => useSessionState('test', 'pass'));

    expect(result.current[0]).toBe('pass');
  });

  it("initially sets state to the default value if the key in session storage can't be parsed", () => {
    window.sessionStorage.setItem('test', 'not parseable as JSON');

    const { result } = renderHook(() => useSessionState('test', 'pass'));

    expect(result.current[0]).toBe('pass');
  });

  it('initially sets state to the default value if session storage is not available', () => {
    const oldGetItem = window.sessionStorage.getItem;

    Object.defineProperty(window.sessionStorage, 'getItem', {
      value: function () {
        throw new Error();
      }
    });

    const { result } = renderHook(() => useSessionState('test', 'pass'));

    expect(result.current[0]).toBe('pass');

    Object.defineProperty(window.sessionStorage, 'getItem', {
      value: oldGetItem
    });
  });

  it("doesn't set anything in session state initially", () => {
    renderHook(() => useSessionState('test', true));
    expect(window.sessionStorage.getItem('test')).toBeNull();
  });

  it('changes the value returned when the setter is called', () => {
    const { result } = renderHook(() => useSessionState('test', 'fail'));

    expect(result.current[0]).toBe('fail');
    act(() => result.current[1]('pass'));
    expect(result.current[0]).toBe('pass');
  });

  it('changes the key in session storage when the setter is called', () => {
    const { result } = renderHook(() => useSessionState('test', 'fail'));

    expect(window.sessionStorage.getItem('test')).toBeNull();
    act(() => result.current[1]('pass'));
    expect(window.sessionStorage.getItem('test')).toBe('"pass"');
  });

  it('still updates the value returned when the setter is called, but changing session state fails', () => {
    // For some reason, spying on window.sessionStorage doesn\'t work.

    const oldSetItem = window.sessionStorage.setItem;

    window.sessionStorage.setItem = () => {
      throw new Error();
    };

    const { result } = renderHook(() => useSessionState('test', 'fail'));

    act(() => result.current[1]('pass'));
    expect(result.current[0]).toBe('pass');
    window.sessionStorage.setItem = oldSetItem;
  });
});
