import { renderWithUser, userEvent, within, waitFor } from 'test-utils';

// Test Subject
import { OrganizationPicker, RevenueProgramPicker } from './DashboardSidebar';
import Dashboard from 'components/dashboard//Dashboard';

// import hubAdmin from '../../../cypress/fixtures/user/hub-admin.json'
// import orgAdmin from '../../../cypress/fixtures/user/org-admin.json'
// import rpAdmin from '../../../cypress/fixtures/user/rp-admin.json'

const mockSetSelectedOrganization = jest.fn();

const orgRegEx = /organization/i;
const rpRegEx = /revenue program/i;

const TEST_ORGS = [
  {
    id: 1,
    name: 'Test1',
    slug: 'test1',
    needs_payment_provider: false
  },
  {
    id: 2,
    name: 'Test2',
    slug: 'test2',
    needs_payment_provider: false
  }
];

// OrganizationPicker Tests
test('OrganizationPicker should contain a list of available organizations provided by props', () => {
  const { queryAllByLabelText } = renderWithUser(
    <OrganizationPicker
      availableOrganizations={TEST_ORGS}
      selectedOrganization={null}
      setSelectedOrganization={mockSetSelectedOrganization}
    />
  );
  const orgPicker = queryAllByLabelText(orgRegEx)[0];
  const orgOptionList = queryAllByLabelText(orgRegEx)[1];
  userEvent.click(orgPicker);
  const orgOptions = within(orgOptionList).getAllByRole('option');

  expect(orgOptions).toHaveLength(TEST_ORGS.length);
  TEST_ORGS.forEach((org) => {
    expect(within(orgOptionList).getByText(org.name)).toBeTruthy();
  });
});

test('OrganizationPicker uses selectedOrganization as its value', () => {
  const targetOrg = TEST_ORGS[0];
  const { queryAllByLabelText } = renderWithUser(
    <OrganizationPicker
      availableOrganizations={TEST_ORGS}
      selectedOrganization={targetOrg}
      setSelectedOrganization={mockSetSelectedOrganization}
    />
  );
  const orgPicker = queryAllByLabelText(orgRegEx)[0];
  expect(orgPicker.value).toEqual(targetOrg.name);
});

test('Selecting an Org in the OrganizationPicker calls provided setSelectedOrganization function', () => {
  const { queryAllByLabelText } = renderWithUser(
    <OrganizationPicker
      availableOrganizations={TEST_ORGS}
      selectedOrganization={null}
      setSelectedOrganization={mockSetSelectedOrganization}
    />
  );
  const orgPicker = queryAllByLabelText(orgRegEx)[0];
  const orgOptionList = queryAllByLabelText(orgRegEx)[1];
  userEvent.click(orgPicker);
  userEvent.click(within(orgOptionList).getAllByRole('option')[0]);
  expect(mockSetSelectedOrganization.mock.calls.length).toBeGreaterThanOrEqual(1);
});

test("OrganizationPicker automatically selects organization if there's only one available to that user", async () => {
  const justOneOrg = [TEST_ORGS[0]];
  const { queryAllByLabelText } = renderWithUser(
    <OrganizationPicker
      availableOrganizations={justOneOrg}
      selectedOrganization={null}
      setSelectedOrganization={mockSetSelectedOrganization}
    />
  );
  expect(mockSetSelectedOrganization.mock.calls.length).toBeGreaterThanOrEqual(1);
  const orgPicker = queryAllByLabelText(orgRegEx)[0];
  waitFor(() => expect(orgPicker.value).toEqual(justOneOrg[0].name));
});

test('OrganizationPicker list items should show an icon when `needs_payment_provider` is true', () => {
  const updatedTestOrgs = [...TEST_ORGS];
  const targetOrg = updatedTestOrgs[0];
  targetOrg.needs_payment_provider = true;
  const { queryAllByLabelText } = renderWithUser(
    <OrganizationPicker
      availableOrganizations={updatedTestOrgs}
      selectedOrganization={null}
      setSelectedOrganization={mockSetSelectedOrganization}
    />
  );
  const orgPicker = queryAllByLabelText(orgRegEx)[0];
  const orgOptionList = queryAllByLabelText(orgRegEx)[1];
  userEvent.click(orgPicker);
  const orgOption = within(orgOptionList).getByRole('option', { name: targetOrg.name });
  expect(within(orgOption).getByRole('img', { hidden: true })).toHaveAttribute('data-icon', 'exclamation-triangle');
});

/* // TODO: Find a good way to unit test the RP picker. It's more of a challenge to test because of the
  special way it handles updates to org and rp by firing passed in setters. It needs to be rendered nested
  inside <Dashboard></Dashboard> because of context, but we also want to test <RevenueProgramPicker /> by
  passing in different props. But since its state is managed by Dashboard, we can't really get state updates.
*/
