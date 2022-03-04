import { renderWithUser, userEvent, within } from 'test-utils';

// Test Subject
import Dashboard from './Dashboard';
import hubAdmin from '../../../cypress/fixtures/user/hub-admin.json';

it('should render sidebar with navigation elements', () => {
  const { getByText } = renderWithUser(<Dashboard />, { userRole: 'hub_admin' });
  const expectedLinksText = ['Content', 'Donations', 'Payment Provider'];

  expectedLinksText.forEach((linkText) => {
    const link = getByText(linkText).closest('a');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href');
  });
});

it('should render the org and rp pickers', () => {
  const { queryAllByLabelText } = renderWithUser(<Dashboard />, { userRole: 'hub_admin' });
  queryAllByLabelText('Organization').forEach((el) => {
    expect(el).toBeInTheDocument();
  });
  queryAllByLabelText('Revenue Program').forEach((el) => {
    expect(el).toBeInTheDocument();
  });
});

it('should freeze the UI in the main content when both Org and RP are not selected', () => {
  const { getByText, queryAllByLabelText } = renderWithUser(<Dashboard />, { userRole: 'hub_admin' });
  // First, ensure that no RevenueProgram is selected
  expect(queryAllByLabelText(/revenue program/i)[0]).toHaveValue('');

  expect(getByText(/select an organization and revenue program/i)).toBeInTheDocument();
});

it('should unfreeze the UI when both Org and RP are selected', () => {
  const { queryAllByLabelText, queryByText } = renderWithUser(<Dashboard />, { userRole: 'hub_admin' });
  // First, select a revenue program
  const rpPicker = queryAllByLabelText(/revenue program/i)[0];
  const rpOptionList = queryAllByLabelText(/revenue program/i)[1];
  userEvent.click(rpPicker);

  const optionName = hubAdmin.user.revenue_programs[0].name;
  const option = within(rpOptionList).getByText(optionName);

  userEvent.click(option);

  expect(rpPicker).toHaveValue(optionName);

  // UI freeze text should not be present
  expect(queryByText(/select an organization and revenue program/i)).toBeNull();
});
