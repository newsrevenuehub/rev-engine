import AddSlashToRoutes from './AddSlashToRoutes';
// Avoiding our own test-utils so we can create a custom render context without
// the normal BrowserRouter.
import { cleanup, render, screen } from '@testing-library/react';
import { Router, Route, useLocation } from 'react-router-dom';
import { createMemoryHistory, InitialEntry } from 'history';

const LocationTest = () => {
  const location = useLocation();

  return (
    <div data-testid="location-test">
      <div data-testid="pathname">{location.pathname}</div>
      <div data-testid="search">{location.search}</div>
      <div data-testid="hash">{location.hash}</div>
    </div>
  );
};

function tree(initialEntries?: InitialEntry[]) {
  const history = createMemoryHistory({ initialEntries });

  return {
    history,
    ...render(
      <Router history={history}>
        <AddSlashToRoutes>
          <Route path="/route1/">route 1</Route>
          <Route path="/route2/">route 2</Route>
          <Route path="/route3/">
            <LocationTest />
          </Route>
        </AddSlashToRoutes>
      </Router>
    )
  };
}

describe('AddSlashToRoutes', () => {
  it('redirects a path without a trailing slash to one with one', () => {
    const { history } = tree(['/route1']);

    expect(history.location.pathname).toBe('/route1/');
  });

  it("doesn't redirects if pathname starts with 2 trailing slashes", () => {
    const { history } = tree(['//route1']);

    expect(history.location.pathname).toBe('//route1');
  });

  it("doesn't redirects if pathname ends with one trailing slash", () => {
    const { history } = tree(['/route1/']);

    expect(history.location.pathname).toBe('/route1/');
  });

  describe('when redirecting', () => {
    it('retains querystring params', () => {
      const { history } = tree(['/route1?foo=bar&bar=baz']);

      expect(history.location).toEqual(
        expect.objectContaining({
          pathname: '/route1/',
          search: '?foo=bar&bar=baz'
        })
      );
    });

    it('retains the location hash', () => {
      const { history } = tree(['/route2#test-hash']);

      expect(history.location).toEqual(
        expect.objectContaining({
          hash: '#test-hash',
          pathname: '/route2/'
        })
      );
    });
  });

  it('handles routes as normal if a trailing slash is present', () => {
    tree(['/route1/']);
    expect(screen.getByText('route 1')).toBeInTheDocument();
    cleanup();
    tree(['/route2/']);
    expect(screen.getByText('route 2')).toBeInTheDocument();
    cleanup();
    tree(['/route3/?testquery=yes#test-hash']);
    expect(screen.getByTestId('pathname')).toHaveTextContent('/route3/');
    expect(screen.getByTestId('search')).toHaveTextContent('?testquery=yes');
    expect(screen.getByTestId('hash')).toHaveTextContent('#test-hash');
  });

  it('throws an error if used outside a router', () => {
    // Silence the error logged when we do this.

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<AddSlashToRoutes children={<div>mock-child</div>} />)).toThrow();
    errorSpy.mockRestore();
  });
});
