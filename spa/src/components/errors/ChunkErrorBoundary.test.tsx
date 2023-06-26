import { render, screen } from 'test-utils';
import userEvent from '@testing-library/user-event';
import { ReactNode } from 'react';

import ChunkErrorBoundary from './ChunkErrorBoundary';
import logout from 'components/authentication/logout';

jest.mock('components/authentication/logout');

const Child = () => {
  return <div>mock-child</div>;
};

const ChildWithError = () => {
  throw new Error();
};

describe('ChunkErrorBoundary', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => errorSpy.mockRestore());

  function tree(children: ReactNode) {
    return render(<ChunkErrorBoundary>{children}</ChunkErrorBoundary>);
  }

  it('should render children', () => {
    tree(<Child />);

    expect(screen.getByText('mock-child')).toBeInTheDocument();
  });

  describe('Error', () => {
    it('should render error message', () => {
      tree(<ChildWithError />);

      expect(screen.getByText(/We've encountered a problem!/i)).toBeInTheDocument();
      expect(screen.getByText(/Click below to reload the page/i)).toBeInTheDocument();
    });

    it('should render reload button', () => {
      tree(<ChildWithError />);

      expect(screen.getByRole('button', { name: /refresh/i })).toBeEnabled();
    });

    it('should reload window if reload button clicked', () => {
      const reload = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload }
      });

      tree(<ChildWithError />);

      expect(reload).not.toBeCalled();
      userEvent.click(screen.getByRole('button', { name: /refresh/i }));
      expect(reload).toBeCalledTimes(1);
    });

    it('should render Sign out button', () => {
      tree(<ChildWithError />);

      expect(screen.getByTestId('error-sign-out')).toBeInTheDocument();
    });

    it('should call logout if Sign out button clicked', () => {
      const logoutMock = logout as jest.Mock;
      tree(<ChildWithError />);

      expect(logoutMock).not.toBeCalled();
      userEvent.click(screen.getByTestId('error-sign-out'));
      expect(logoutMock).toBeCalledTimes(1);
    });
  });
});
