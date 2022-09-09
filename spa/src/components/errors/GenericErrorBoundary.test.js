import { render, screen } from 'test-utils';

// Test Subject
import GenericErrorBoundary from './GenericErrorBoundary';

const CHILD_ID = 'my-child-component';

function ChildComponent() {
  return <div data-testid={CHILD_ID}></div>;
}

function BrokenChildComponent() {
  throw new Error('Testing error boundaries');
}

const CUSTOM_FALLBACK_ID = 'my-fallback-component';

function CustomFallbackComponent() {
  return <div data-testid={CUSTOM_FALLBACK_ID}></div>;
}

it('should render children by default', () => {
  render(
    <GenericErrorBoundary>
      <ChildComponent />
    </GenericErrorBoundary>
  );
  expect(screen.getByTestId(CHILD_ID)).toBeInTheDocument();
});

it('should render default fallback component on error if fallback prop not provided', () => {
  render(
    <GenericErrorBoundary>
      <BrokenChildComponent />
    </GenericErrorBoundary>
  );
  expect(screen.getByText('Something went wrong loading this part of the page.')).toBeInTheDocument();
});

it('should render provided fallback component on error if fallback prop not provided', () => {
  render(
    <GenericErrorBoundary fallback={CustomFallbackComponent}>
      <BrokenChildComponent />
    </GenericErrorBoundary>
  );
  expect(screen.getByTestId(CUSTOM_FALLBACK_ID)).toBeInTheDocument();
});
