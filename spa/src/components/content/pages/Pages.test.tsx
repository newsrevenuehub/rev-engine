import { render, screen, waitFor } from 'test-utils';
import MockAdapter from 'axios-mock-adapter';

import { pagesbyRP, default as Pages } from './Pages';
import useUserImport from 'hooks/useUser';
import { USER_ROLE_ORG_ADMIN_TYPE, USER_ROLE_HUB_ADMIN_TYPE, USER_SUPERUSER_TYPE } from 'constants/authConstants';

import { LIST_PAGES } from 'ajax/endpoints';
import Axios from 'ajax/axios';
import { ContributionPage } from 'hooks/useContributionPage';

const orgAdminUser = {
  role_type: [USER_ROLE_ORG_ADMIN_TYPE],
  organizations: [{ plan: { page_limit: 1 } }]
};

const superUser = {
  ...orgAdminUser,
  role_type: [USER_SUPERUSER_TYPE]
};

const hubAdmin = {
  ...orgAdminUser,
  role_type: [USER_ROLE_HUB_ADMIN_TYPE]
};

jest.mock('hooks/useUser');
jest.mock('hooks/useRequest');

const useUser = useUserImport as jest.Mock;

describe('Given pages list', () => {
  let result;
  beforeEach(async () => {
    const inp = [
      { id: 1, name: 'mock-name-1', slug: 'mock-slug-1', revenue_program: { id: '1', name: 'rp1' } },
      { id: 2, name: 'mock-name-2', slug: 'mock-slug-2', revenue_program: { id: '2', name: 'rp2' } },
      { id: 3, name: 'mock-name-3', slug: 'mock-slug-3', revenue_program: { id: '2', name: 'rp2' } }
    ] as unknown as ContributionPage[];
    result = pagesbyRP(inp);
  });

  it('should group pages by RevenueProgram in pagesByRevProgram', () => {
    expect(result.length).toEqual(2);
  });
});

describe('Given pages list having a page with a null rp', () => {
  let result;

  beforeEach(async () => {
    const inp = [
      { id: 1, revenue_program: { id: '1', name: 'rp1' } },
      { id: 2, revenue_program: { id: '2', name: 'rp2' } },
      { id: 3, revenue_program: null }
    ] as unknown as ContributionPage[];
    result = pagesbyRP(inp);
  });

  it('should not throw an error and exclude the page with null rp from pagesByRevProgram', () => {
    expect(result.length).toEqual(2);
  });
});

describe('New page button behavior given org plan and user role', () => {
  const axiosMock = new MockAdapter(Axios);
  afterEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
  });
  afterAll(() => axiosMock.restore());
  test('when user is super user can always add', async () => {
    useUser.mockImplementation(() => ({ user: superUser }));
    axiosMock.onGet(LIST_PAGES).reply(200, [{}, {}, {}]);
    render(<Pages />);
    await waitFor(() => {
      expect(axiosMock.history.get.length).toBe(1);
    });
    const newPageButton = screen.getByRole('button', { name: 'New Page' });
    expect(newPageButton).not.toBeDisabled();
  });
  test('when user is hub admin can always add', async () => {
    useUser.mockImplementation(() => ({ user: hubAdmin }));
    axiosMock.onGet(LIST_PAGES).reply(200, [{}, {}, {}]);
    render(<Pages />);
    await waitFor(() => {
      expect(axiosMock.history.get.length).toBe(1);
    });
    const newPageButton = screen.getByRole('button', { name: 'New Page' });
    expect(newPageButton).not.toBeDisabled();
  });
  test('typical self-onboarded user who has not added a page can add one', async () => {
    useUser.mockImplementation(() => ({ user: orgAdminUser }));
    axiosMock.onGet(LIST_PAGES).reply(200, []);
    render(<Pages />);
    await waitFor(() => {
      expect(axiosMock.history.get.length).toBe(1);
    });
    const newPageButton = screen.getByRole('button', { name: 'New Page' });
    expect(newPageButton).not.toBeDisabled();
  });
  test('typical self-onboarded user who has added a page cannot add one', async () => {
    useUser.mockImplementation(() => ({ user: orgAdminUser }));
    axiosMock.onGet(LIST_PAGES).reply(200, [{}]);
    render(<Pages />);
    await waitFor(() => {
      expect(axiosMock.history.get.length).toBe(1);
    });
    const newPageButton = screen.getByRole('button', { name: 'New Page' });
    expect(newPageButton).toBeDisabled();
  });
});
