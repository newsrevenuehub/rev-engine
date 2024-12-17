import { renderHook } from '@testing-library/react-hooks';
import { useLocation } from 'react-router-dom';
import useQueryString from './useQueryString';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn()
}));

describe('useQueryString', () => {
  const useLocationMock = jest.mocked(useLocation);

  it.each([
    ['test=foo', 'foo'],
    // always yields a string
    ['test=123', '123'],
    ['test=true', 'true'],
    // case-sensitive
    ['Test=123', null],
    // different ways it can be unset
    ['test=', ''],
    ['test=&unrelated=foo', ''],
    ['unrelated=foo', null],
    ['', null],
    // multiple values
    ['test=foo&test=bar', 'foo'],
    ['test=foo&unrelated=foo&test=bar', 'foo']
  ])('parses a search string of "%s" as having test value %j', (search, expected) => {
    useLocationMock.mockReturnValue({ search });

    const { result } = renderHook(() => useQueryString('test'));

    expect(result.current).toBe(expected);
  });
});
