import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { TabPanel } from 'components/base';
import EditInterfaceTabs, { EditInterfaceTabsProps } from './EditInterfaceTabs';
import userEvent from '@testing-library/user-event';

function tree(props?: Partial<EditInterfaceTabsProps>) {
  // Give it fake tab panels to control.

  return render(
    <>
      <EditInterfaceTabs onChangeTab={jest.fn()} tab={0} {...props} />
      <TabPanel id="edit-layout-tab-panel" tabId="edit-layout-tab">
        child
      </TabPanel>
      <TabPanel id="edit-sidebar-tab-panel" tabId="edit-sidebar-tab">
        child
      </TabPanel>
      <TabPanel id="edit-settings-tab-panel" tabId="edit-settings-tab">
        child
      </TabPanel>
      <TabPanel id="edit-style-tab-panel" tabId="edit-style-tab-panel">
        child
      </TabPanel>
    </>
  );
}

describe('EditInterfaceTabs', () => {
  it.each([['Layout'], ['Sidebar'], ['Settings'], ['Style']])('shows a %s tab', (name) => {
    tree();
    expect(screen.getByRole('tab', { name })).toBeVisible();
  });

  it('selects the tab set by the tab prop', () => {
    tree({ tab: 1 });
    expect(screen.getByRole('tab', { name: 'Layout' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Sidebar' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Style' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls the onChangeTab prop with the tab index when a tab is selected', () => {
    const onChangeTab = jest.fn();

    tree({ onChangeTab });
    expect(onChangeTab).not.toBeCalled();
    userEvent.click(screen.getByRole('tab', { name: 'Settings' }));
    expect(onChangeTab.mock.calls).toEqual([[2]]);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
