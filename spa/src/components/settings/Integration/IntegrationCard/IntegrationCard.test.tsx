import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen, waitFor } from 'test-utils';

import IntegrationCard, { IntegrationCardProps } from './IntegrationCard';

jest.mock('./IntegrationCardHeader/IntegrationCardHeader');

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

  it('should render description on card', () => {
    tree();

    expect(screen.getByText(card.description)).toBeInTheDocument();
  });

  it('should render view details if onViewDetails is a function', () => {
    tree({ onViewDetails: jest.fn() });

    expect(screen.getByRole('button', { name: 'View Details' })).toBeEnabled();
  });

  it('should call onViewDetails if View Details is clicked', () => {
    const onViewDetails = jest.fn();
    tree({ onViewDetails });
    expect(onViewDetails).not.toHaveBeenCalled();
    userEvent.click(screen.getByRole('button', { name: 'View Details' }));
    expect(onViewDetails).toHaveBeenCalledTimes(1);
  });

  it('should not render view details by default', () => {
    tree();

    expect(screen.queryByRole('button', { name: 'View Details' })).not.toBeInTheDocument();
  });

  it('should render card header', () => {
    const headerProps = {
      image: 'mock-image',
      title: 'mock-title',
      site: {
        label: 'mock-label',
        url: 'mock-url'
      },
      isRequired: true,
      isActive: true,
      enableCornerMessage: true,
      cornerMessage: 'mock-corner-message'
    };
    tree(headerProps);

    expect(screen.getByTestId('mock-integration-card-header')).toBeInTheDocument();
    expect(screen.getByTestId('mock-integration-card-header-props')).toHaveTextContent(JSON.stringify(headerProps));
  });

  it('should render active state', () => {
    tree({ isActive: true });
    expect(screen.getByText('Connected')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: `${card.title} is connected` })).toBeChecked();
  });

  it('should render inactive default state', () => {
    tree({ isActive: false });
    expect(screen.getByText('Not Connected')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: `${card.title} is not connected` })).not.toBeChecked();
  });

  it('should render inactive override state', () => {
    tree({ isActive: false, toggleLabel: 'mock-custom-inactive-state' });
    expect(screen.getByText('mock-custom-inactive-state')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: `${card.title} is not connected` })).not.toBeChecked();
  });

  it('should render inactive disabled switch', () => {
    tree({ isActive: false, disabled: true });
    expect(screen.getByRole('checkbox', { name: `${card.title} is not connected` })).toBeDisabled();
  });

  it('should render active disabled switch', () => {
    tree({ isActive: true, disabled: true });
    expect(screen.getByRole('checkbox', { name: `${card.title} is connected` })).toBeDisabled();
  });

  it('should render tooltip', async () => {
    tree({ toggleTooltipMessage: 'mock-tooltip-message' });
    expect(screen.queryByText('mock-tooltip-message')).not.toBeInTheDocument();

    userEvent.hover(screen.getByTestId('integration-switch-wrapper'));
    await waitFor(() => {
      expect(screen.getByText('mock-tooltip-message')).toBeVisible();
    });
  });

  it('should render connected tooltip', async () => {
    tree({ toggleConnectedTooltipMessage: 'mock-connected-tooltip', isActive: true });
    expect(screen.queryByText('mock-connected-tooltip')).not.toBeInTheDocument();

    userEvent.hover(screen.getByTestId('integration-switch-wrapper'));
    await waitFor(() => {
      expect(screen.getByText('mock-connected-tooltip')).toBeVisible();
    });
  });

  it('should not render connected tooltip if isActive = false', async () => {
    tree({ toggleConnectedTooltipMessage: 'mock-connected-tooltip', isActive: false });
    expect(screen.queryByText('mock-connected-tooltip')).not.toBeInTheDocument();

    userEvent.hover(screen.getByTestId('integration-switch-wrapper'));
    await waitFor(() => {
      expect(screen.queryByText('mock-connected-tooltip')).not.toBeInTheDocument();
    });
  });

  it('should render right action', () => {
    tree({ rightAction: 'mock-right-action' });
    expect(screen.getByText('mock-right-action')).toBeVisible();
  });

  it('should not render right action if undefined', () => {
    tree({ rightAction: undefined });
    expect(screen.queryByTestId('right-action')).not.toBeInTheDocument();
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
