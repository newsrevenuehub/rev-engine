import { render, screen } from '@testing-library/react';
import TabPanel, { TabPanelProps } from './TabPanel';

function tree(props?: Partial<TabPanelProps>) {
  return render(
    <TabPanel active data-testid="tab-panel" id="test-id" tabId="test-tab-id" {...props}>
      children
    </TabPanel>
  );
}

describe('TabPanel', () => {
  it('displays a tabpanel', () => {
    tree();
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  it('displays its children when active', () => {
    tree();
    expect(screen.getByText('children')).toBeVisible();
  });

  it("doesn't display its children when not active", () => {
    tree({ active: false });
    expect(screen.getByText('children')).not.toBeVisible();
  });

  it('sets a DOM ID based on the prop', () => {
    tree({ id: 'test-id' });
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'test-id');
  });

  it('sets its aria-labelledby attribute based on the prop', () => {
    tree({ tabId: 'test-tab-id' });
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'test-tab-id');
  });

  // AX test happens with <Tabs>.
});
