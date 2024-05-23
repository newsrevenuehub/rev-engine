import { axe } from 'jest-axe';
import { CONTENT_SLUG, CONTRIBUTOR_PORTAL_SLUG, CUSTOMIZE_SLUG } from 'routes';
import { render, screen } from 'test-utils';
import ContentSectionNav from './ContentSectionNav';
import { getUserRole } from 'utilities/getUserRole';

jest.mock('utilities/getUserRole');

function tree() {
  return render(
    <div role="list">
      <ContentSectionNav />
    </div>
  );
}

describe('ContentSectionNav', () => {
  const getUserRoleMock = jest.mocked(getUserRole);

  beforeEach(() => {
    getUserRoleMock.mockReturnValue({ isOrgAdmin: true } as any);
  });

  it('shows a link to the Pages page', () => {
    tree();

    const pagesLink = screen.getByRole('listitem', { name: 'Pages' });

    expect(pagesLink).toBeVisible();
    expect(pagesLink).toHaveAttribute('href', CONTENT_SLUG);
  });

  it('shows a link to the Customize page', () => {
    tree();

    const pagesLink = screen.getByRole('listitem', { name: 'Customize' });

    expect(pagesLink).toBeVisible();
    expect(pagesLink).toHaveAttribute('href', CUSTOMIZE_SLUG);
  });

  it.each([
    ['superuser', { isOrgAdmin: false }],
    ['hub admin', { isRPAdmin: false }]
  ])('hides link to Customize page if user role not = %s', (_, role) => {
    getUserRoleMock.mockReturnValue(role as any);
    tree();
    expect(screen.queryByRole('listitem', { name: 'Customize' })).not.toBeInTheDocument();
  });

  it.each([
    ['org admin', { isOrgAdmin: true }],
    ['rp admin', { isRPAdmin: true }]
  ])('shows link to Customize page if user role = %s', (_, role) => {
    getUserRoleMock.mockReturnValue(role as any);
    tree();
    expect(screen.getByRole('listitem', { name: 'Customize' })).toBeInTheDocument();
  });

  it('shows a link to the Contributor Portal page', () => {
    tree();

    const pagesLink = screen.getByRole('listitem', { name: 'Contributor Portal' });

    expect(pagesLink).toBeVisible();
    expect(pagesLink).toHaveAttribute('href', CONTRIBUTOR_PORTAL_SLUG);
  });

  it.each([
    ['superuser', { isSuperUser: true }],
    ['hub admin', { isHubAdmin: true }]
  ])('hides link to Contributor Portal page if user role = %s', (_, role) => {
    getUserRoleMock.mockReturnValue(role as any);
    tree();
    expect(screen.queryByRole('listitem', { name: 'Contributor Portal' })).not.toBeInTheDocument();
  });

  it.each([
    ['org admin', { isOrgAdmin: true }],
    ['rp admin', { isRPAdmin: true }]
  ])('shows link to Contributor Portal page if user role = %s', (_, role) => {
    getUserRoleMock.mockReturnValue(role as any);
    tree();
    expect(screen.getByRole('listitem', { name: 'Contributor Portal' })).toBeInTheDocument();
  });

  it('is accessible', async () => {
    // It looks like axe does not like us putting `role="listitem"` directly on
    // an <a> element (aria-allowed-role). The other rule violations disabled
    // here cascade from there.
    //
    // See
    // https://dequeuniversity.com/rules/axe/4.4/aria-allowed-role?application=axeAPI

    const { container } = tree();

    expect(
      await axe(container, {
        rules: {
          'aria-allowed-role': { enabled: false },
          'aria-required-children': { enabled: false },
          'aria-required-parent': { enabled: false }
        }
      })
    ).toHaveNoViolations();
  });
});
