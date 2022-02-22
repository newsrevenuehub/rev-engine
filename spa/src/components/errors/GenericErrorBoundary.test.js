import { render } from 'test-utils';

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
  const { getByTestId } = render(
    <GenericErrorBoundary>
      <ChildComponent />
    </GenericErrorBoundary>
  );
  expect(getByTestId(CHILD_ID)).toBeInTheDocument();
});

it('should render default fallback component on error if fallback prop not provided', () => {
  const { getByText } = render(
    <GenericErrorBoundary>
      <BrokenChildComponent />
    </GenericErrorBoundary>
  );
  expect(getByText('Something went wrong loading this part of the page.')).toBeInTheDocument();
});

it('should render provided fallback component on error if fallback prop not provided', () => {
  const { getByTestId } = render(
    <GenericErrorBoundary fallback={CustomFallbackComponent}>
      <BrokenChildComponent />
    </GenericErrorBoundary>
  );
  expect(getByTestId(CUSTOM_FALLBACK_ID)).toBeInTheDocument();
});
