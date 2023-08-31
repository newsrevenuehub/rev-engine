import { useLocation } from 'react-router-dom';
import { render, screen } from 'test-utils';
import ExtraneousURLRedirect from './ExtraneousURLRedirect';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(),
  Redirect: ({ to }: { to: string }) => <div data-testid="mock-redirect" data-to={to} />
}));

describe('ExtraneousURLRedirect', () => {
  const useLocationMock = jest.mocked(useLocation);

  it.each([
    ['http://localhost/donate/extra/', '/donate/'],
    ['http://localhost/donate/extra/#ignored', '/donate/'],
    ['http://localhost/donate/extra/?param=value', '/donate/?param=value'],
    ['http://localhost/donate/extra/?param=value#ignored', '/donate/?param=value'],
    ['http://localhost/donate/extra/?param=value&param2=value', '/donate/?param=value&param2=value'],
    ['http://localhost/donate/extra/?param=value&param2=value#ignored', '/donate/?param=value&param2=value'],
    ['http://localhost/donate/extra/extra2/', '/donate/'],
    ['http://localhost/donate/extra/extra2/#ignored', '/donate/'],
    ['http://localhost/donate/extra/extra2/?param=value', '/donate/?param=value'],
    ['http://localhost/donate/extra/extra2/?param=value#ignored', '/donate/?param=value'],
    ['http://localhost/donate/extra/extra2/?param=value&param2=value', '/donate/?param=value&param2=value'],
    ['http://localhost/donate/extra/extra2/?param=value&param2=value#ignored', '/donate/?param=value&param2=value']
  ])('redirects %s to %s', (source, destination) => {
    useLocationMock.mockReturnValue(new URL(source));
    render(<ExtraneousURLRedirect />);
    expect(screen.getByTestId(`mock-redirect`).dataset.to).toBe(destination);
  });

  it('throws an error if rendered at the top level of the domain', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    useLocationMock.mockReturnValue(new URL('http://localhost'));
    expect(() => render(<ExtraneousURLRedirect />)).toThrow();
    errorSpy.mockRestore();
  });
});
