import { render, screen } from 'test-utils';
import Leftbar from './Leftbar';
import { axe } from 'jest-axe';

function tree(props?: { isCreateAccountPage?: boolean }) {
  return render(<Leftbar {...props} />);
}

describe('Leftbar', () => {
  it('should render logo 2 by default', () => {
    tree();
    expect(screen.getByTestId('logo2')).toBeInTheDocument();
    expect(screen.queryByTestId('logo')).not.toBeInTheDocument();
  });

  it('should render logo 1 when isCreateAccountPage is true', () => {
    tree({ isCreateAccountPage: true });
    expect(screen.getByTestId('logo')).toBeInTheDocument();
    expect(screen.queryByTestId('logo2')).not.toBeInTheDocument();
  });

  it('should render heading', () => {
    tree();
    expect(screen.getByText(/We’ve helped raise millions for our clients/i)).toBeInTheDocument();
  });

  it.each([
    'Save time, money, and democracy',
    'For newsrooms, by newsrooms',
    'No CRM required',
    'Strategic integrations'
  ])('should render advantage: %s', (advantage) => {
    tree();
    expect(screen.getByText(advantage)).toBeInTheDocument();
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
