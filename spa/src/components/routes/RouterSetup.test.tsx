// Avoiding our own test-utils so we can create a custom render context without
// the normal BrowserRouter.
import { render, screen } from '@testing-library/react';
import RouterSetup from './RouterSetup';
import React from 'react';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  BrowserRouter: ({ children }: { children: React.ReactNode }) =>
    <div data-testid="mock-browser-router">{children}</div>,
  Switch: ({ children }: { children: React.ReactNode }) =>
    <div data-testid="mock-switch">{children}</div>
}));

jest.mock('components/routes/AddSlashToRoutes', () => ({ children }: { children: React.ReactNode }) =>
  <div data-testid="mock-add-slash-to-routes">{children}</div>
);

jest.mock('components/errors/ChunkErrorBoundary', () => ({ children }: { children: React.ReactNode }) =>
  <div data-testid="mock-error-boundary">{children}</div>
);

function tree() {

  return render(
    <RouterSetup>
      <div data-testid='mock-router-last-child' />
    </RouterSetup>
  )
}

describe('RouterSetup', () => {
  it('renders all levels of children', () => {
    tree()
    expect(screen.getByTestId('mock-browser-router')).toBeInTheDocument();
    expect(screen.getByTestId('mock-add-slash-to-routes')).toBeInTheDocument();
    expect(screen.getByTestId('mock-error-boundary')).toBeInTheDocument();
    expect(screen.getByTestId('mock-switch')).toBeInTheDocument();
    expect(screen.getByTestId('mock-router-last-child')).toBeInTheDocument();
  });
});
