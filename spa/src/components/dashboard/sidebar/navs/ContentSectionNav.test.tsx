import { axe } from 'jest-axe';
import { CONTENT_SLUG, CONTRIBUTOR_PORTAL_SLUG, CUSTOMIZE_SLUG, EMAILS_SLUG } from 'routes';
import { render, screen } from 'test-utils';
import { EMAILS_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import useUser from 'hooks/useUser';
import ContentSectionNav from './ContentSectionNav';
import {
  USER_ROLE_HUB_ADMIN_TYPE,
  USER_ROLE_ORG_ADMIN_TYPE,
  USER_ROLE_RP_ADMIN_TYPE,
  USER_SUPERUSER_TYPE
} from 'constants/authConstants';

jest.mock('hooks/useUser');

function tree() {
  return render(
    <div role="list">
      <ContentSectionNav />
    </div>
  );
}

describe('ContentSectionNav', () => {
  const useUserMock = jest.mocked(useUser);

  beforeEach(() => {
    useUserMock.mockReturnValue({
      user: {
        flags: [],
        role_type: ['org_admin']
      }
    } as any);
  });

  it('shows a link to the Pages page', () => {
    tree();

    const pagesLink = screen.getByRole('listitem', { name: 'Pages' });

    expect(pagesLink).toBeVisible();
    expect(pagesLink).toHaveAttribute('href', CONTENT_SLUG);
  });

  describe.each([[USER_SUPERUSER_TYPE], [USER_ROLE_HUB_ADMIN_TYPE]])('When the user is a %s', (role) => {
    beforeEach(() => {
      useUserMock.mockReturnValue({
        user: {
          flags: [{ name: EMAILS_SECTION_ACCESS_FLAG_NAME }],
          role_type: [role]
        }
      } as any);
    });

    it('shows neither Customize or Emails link, even if they have the spa-emails-section-access feature flag', () => {
      tree();
      expect(screen.queryByRole('listitem', { name: 'Customize' })).not.toBeInTheDocument();
      expect(screen.queryByRole('listitem', { name: 'Emails' })).not.toBeInTheDocument();
    });

    it('hides the Contributor Portal link', () => {
      tree();
      expect(screen.queryByRole('listitem', { name: 'Contributor Portal' })).not.toBeInTheDocument();
    });
  });

  describe.each([[USER_ROLE_ORG_ADMIN_TYPE], [USER_ROLE_RP_ADMIN_TYPE]])('When the user is a %s', (role) => {
    it("shows the Customize link and not Emails if the user doesn't have the spa-emails-section-access feature flag", () => {
      useUserMock.mockReturnValue({
        user: {
          flags: [],
          role_type: [role]
        }
      } as any);
      tree();

      const customizeItem = screen.getByRole('listitem', { name: 'Customize' });

      expect(customizeItem).toBeVisible();
      expect(customizeItem).toHaveAttribute('href', CUSTOMIZE_SLUG);
      expect(screen.queryByRole('listitem', { name: 'Emails' })).not.toBeInTheDocument();
    });

    it('shows the Emails link and not Customize if the user has the spa-emails-section-access feature flag', () => {
      useUserMock.mockReturnValue({
        user: {
          flags: [{ name: EMAILS_SECTION_ACCESS_FLAG_NAME }],
          role_type: [role]
        }
      } as any);
      tree();

      const emailsItem = screen.getByRole('listitem', { name: 'Emails' });

      expect(emailsItem).toBeVisible();
      expect(emailsItem).toHaveAttribute('href', EMAILS_SLUG);
      expect(screen.queryByRole('listitem', { name: 'Customize' })).not.toBeInTheDocument();
    });

    it('shows a link to the Contributor Portal page', () => {
      tree();

      const pagesLink = screen.getByRole('listitem', { name: 'Contributor Portal' });

      expect(pagesLink).toBeVisible();
      expect(pagesLink).toHaveAttribute('href', CONTRIBUTOR_PORTAL_SLUG);
    });
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
