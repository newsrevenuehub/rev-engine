import { render, screen } from 'test-utils';
import { axe } from 'jest-axe';
import LiveErrorFallback from './LiveErrorFallback';

describe('LiveErrorFallback', () => {
  it('should display the correct error message', () => {
    render(<LiveErrorFallback />);
    expect(screen.getByText('common.error.internalError.heading')).toBeInTheDocument();
    expect(screen.getByText('common.error.internalError.message')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = render(<LiveErrorFallback />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
