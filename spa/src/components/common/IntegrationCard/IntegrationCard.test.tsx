import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen, waitFor } from 'test-utils';

import IntegrationCard, { IntegrationCardProps } from './IntegrationCard';

const card = {
  image: 'mock-logo',
  title: 'mock-title',
  isRequired: true,
  site: {
    label: 'mock-label',
    url: 'mock-url'
  },
  description: 'mock-description',
  disabled: false
};

describe('Integration Card', () => {
  function tree(props?: Partial<IntegrationCardProps>) {
    return render(<IntegrationCard {...card} {...props} />);
  }

  it('should render texts on card', () => {
    tree();

    expect(screen.getByText(card.title)).toBeInTheDocument();
    expect(screen.getByText(card.description)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: card.site.label })).toHaveAttribute('href', card.site.url);
  });

  it('should render image', () => {
    tree();
    expect(screen.getByRole('img', { name: `${card.title} logo` })).toHaveAttribute('src', card.image);
  });

  it('should render required tag', () => {
    tree();
    expect(screen.getByText('*Required')).toBeVisible();
  });

  it('should render corner message', () => {
    tree({ isRequired: false, cornerMessage: 'mock-corner-message' });
    expect(screen.getByText('mock-corner-message')).toBeVisible();
  });

  it('should render active state', () => {
    tree({ isActive: true });
    expect(screen.getByText('Connected')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: `${card.title} is integrated` })).toBeChecked();
  });

  it('should render inactive default state', () => {
    tree({ isActive: false });
    expect(screen.getByText('Not Connected')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: `${card.title} is not integrated` })).not.toBeChecked();
  });

  it('should render inactive override state', () => {
    tree({ isActive: false, toggleLabel: 'mock-custom-inactive-state' });
    expect(screen.getByText('mock-custom-inactive-state')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: `${card.title} is not integrated` })).not.toBeChecked();
  });

  it('should render inactive disabled switch', () => {
    tree({ isActive: false, disabled: true });
    expect(screen.getByRole('checkbox', { name: `${card.title} is not integrated` })).toBeDisabled();
  });

  it('should render active disabled switch', () => {
    tree({ isActive: true, disabled: true });
    expect(screen.getByRole('checkbox', { name: `${card.title} is integrated` })).toBeDisabled();
  });

  it('should render tooltip', async () => {
    tree({ toggleTooltipMessage: 'mock-tooltip-message' });
    expect(screen.queryByText('mock-tooltip-message')).not.toBeInTheDocument();

    userEvent.hover(screen.getByTestId('integration-switch-wrapper'));
    await waitFor(() => {
      expect(screen.getByText('mock-tooltip-message')).toBeVisible();
    });
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
