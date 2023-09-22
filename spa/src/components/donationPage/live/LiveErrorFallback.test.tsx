import { render, screen } from 'test-utils';
import LiveErrorFallback from './LiveErrorFallback';

describe('LiveErrorFallback', () => {
  it('should display the correct error message', () => {
    render(<LiveErrorFallback />);

    expect(
      screen.getByText("Something went really wrong. Use your browser's back button and try again.")
    ).toBeInTheDocument();
  });

  it('should display the correct error code', () => {
    render(<LiveErrorFallback />);

    expect(screen.getByText('500')).toBeInTheDocument();
  });
});
