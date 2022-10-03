import { render, screen, waitFor } from 'test-utils';
import MockAdapter from 'axios-mock-adapter';

import Styles from './Styles';
import useUser from 'hooks/useUser';
import { USER_ROLE_ORG_ADMIN_TYPE, USER_ROLE_HUB_ADMIN_TYPE, USER_SUPERUSER_TYPE } from 'constants/authConstants';

import { LIST_STYLES } from 'ajax/endpoints';
import Axios from 'ajax/axios';

const orgAdminUser = {
  role_type: [USER_ROLE_ORG_ADMIN_TYPE],
  organizations: [{ plan: { style_limit: 1 } }]
};

const superUser = {
  ...orgAdminUser,
  role_type: [USER_SUPERUSER_TYPE]
};

const hubAdmin = {
  ...orgAdminUser,
  role_type: [USER_ROLE_HUB_ADMIN_TYPE]
};

jest.mock('hooks/useUser', () => ({
  __esModule: true,
  default: jest.fn()
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('New style button behavior given org plan and user role', () => {
  const axiosMock = new MockAdapter(Axios);
  afterEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
  });
  afterAll(() => axiosMock.restore());
  test('when user is super user can always add', async () => {
    useUser.mockImplementation(() => ({ user: superUser }));
    axiosMock.onGet(LIST_STYLES).reply(200, [{ name: '' }, { name: '' }, { name: '' }]);
    render(<Styles />);
    await waitFor(() => {
      expect(axiosMock.history.get.length).toBe(1);
    });
    const newPageButton = screen.getByLabelText('New Style');
    expect(newPageButton).not.toBeDisabled();
  });
  test('when user is hub admin can always add', async () => {
    useUser.mockImplementation(() => ({ user: hubAdmin }));
    axiosMock.onGet(LIST_STYLES).reply(200, [{ name: '' }, { name: '' }, { name: '' }]);
    render(<Styles />);
    await waitFor(() => {
      expect(axiosMock.history.get.length).toBe(1);
    });
    const newPageButton = screen.getByLabelText('New Style');
    expect(newPageButton).not.toBeDisabled();
  });
  test('typical self-onboarded user who has not added a style can add one', async () => {
    useUser.mockImplementation(() => ({ user: orgAdminUser }));
    axiosMock.onGet(LIST_STYLES).reply(200, []);
    render(<Styles />);
    await waitFor(() => {
      expect(axiosMock.history.get.length).toBe(1);
    });
    const newPageButton = screen.getByLabelText('New Style');
    expect(newPageButton).not.toBeDisabled();
  });
  test('typical self-onboarded user who has added a page cannot add one', async () => {
    useUser.mockImplementation(() => ({ user: orgAdminUser }));
    axiosMock.onGet(LIST_STYLES).reply(200, [{ name: '' }]);
    render(<Styles />);
    await waitFor(() => {
      expect(axiosMock.history.get.length).toBe(1);
    });
    const newPageButton = screen.getByLabelText('New Style');
    expect(newPageButton).toBeDisabled();
  });
});
