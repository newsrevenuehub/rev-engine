import { axe } from 'jest-axe';
import { fireEvent, render, screen, within } from 'test-utils';
import { useTestEmails } from 'hooks/useTestEmails';
import useUser from 'hooks/useUser';
import EmailsRoute, { blocks } from './EmailsRoute';
import { EMAIL_KB_URL } from 'constants/helperUrls';
import { PLAN_NAMES } from 'constants/orgPlanConstants';

jest.mock('hooks/useTestEmails');
jest.mock('hooks/useUser');

function tree() {
  return render(<EmailsRoute />);
}

describe('EmailsRoute', () => {
  const useTestEmailsMock = jest.mocked(useTestEmails);
  const useUserMock = jest.mocked(useUser);

  beforeEach(() => {
    useTestEmailsMock.mockReturnValue({ sendTestEmail: jest.fn() });
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: false,
      user: {
        organizations: [{ plan: { name: 'CORE' } }],
        revenue_programs: [{ id: 123 }]
      }
    } as any);
  });

  it('shows a link to the email article on the knowledge base', () => {
    tree();
    expect(screen.getByRole('link', { name: 'More About Emails' })).toHaveAttribute('href', EMAIL_KB_URL);
  });

  it("doesn't show 'coming soon' text for users on the FREE plan", () => {
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: false,
      user: {
        organizations: [{ plan: { name: 'FREE' } }],
        revenue_programs: [{ id: 123 }]
      }
    } as any);
    tree();
    expect(screen.queryByText('View and edit capabilities coming soon.', { exact: false })).not.toBeInTheDocument();
  });

  it.each(['CORE', 'PLUS'])("shows 'coming soon' text for users on the %s plan", (name) => {
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: false,
      user: {
        organizations: [{ plan: { name } }],
        revenue_programs: [{ id: 123 }]
      }
    } as any);
    tree();
    expect(screen.getByText('View and edit capabilities coming soon.', { exact: false })).toBeVisible();
  });

  describe.each(blocks)('Block $#', (block) => {
    it(`shows a "${block.name}" header`, () => {
      tree();
      expect(screen.getByRole('heading', { name: block.name })).toBeVisible();
    });

    if (block.hideActions) {
      it('shows no buttons', () => {
        tree();
        expect(within(screen.getByTestId(`email-block-${block.name}`)).queryByRole('button')).not.toBeInTheDocument();
      });
    } else {
      const editButtonLabel = block.editable ? 'View & Edit' : 'View';

      if (block.disabled) {
        it(`shows a disabled ${editButtonLabel} button`, () => {
          tree();
          expect(
            within(screen.getByTestId(`email-block-${block.name}`)).getByRole('button', { name: editButtonLabel })
          ).toHaveAttribute('aria-disabled', 'true');
        });
      } else {
        it(`shows an enabled ${editButtonLabel} button`, () => {
          tree();
          expect(
            within(screen.getByTestId(`email-block-${block.name}`)).getByRole('button', { name: editButtonLabel })
          ).toHaveAttribute('aria-disabled', 'false');
        });
      }

      if (block.testEmailName) {
        it(`shows a button to send a ${block.testEmailName} test email`, () => {
          const sendTestEmail = jest.fn();

          useTestEmailsMock.mockReturnValue({ sendTestEmail });
          tree();
          fireEvent.click(
            within(screen.getByTestId(`email-block-${block.name}`)).getByRole('button', { name: 'Send Test Email' })
          );
          expect(sendTestEmail.mock.calls).toEqual([[{ emailName: block.testEmailName, revenueProgramId: 123 }]]);
        });
      } else {
        it('shows a disabled Send Test Email button', () => {
          tree();
          expect(
            within(screen.getByTestId(`email-block-${block.name}`)).getByRole('button', { name: 'Send Test Email' })
          ).toBeDisabled();
        });
      }
    }
  });

  it('disables receipt edtitor block view/edit button when user is on free plan', () => {
    useUserMock.mockReturnValue({
      isError: false,
      isLoading: false,
      user: {
        organizations: [{ plan: { name: PLAN_NAMES.FREE } }],
        revenue_programs: [{ id: 123 }]
      }
    } as any);
    tree();
    const blockElement = screen.getByTestId(`email-block-Receipt`);
    const viewEditButton = within(blockElement).getByRole('button', { name: 'View & Edit' });
    expect(viewEditButton).toHaveAttribute('aria-disabled', 'true');
  });
  it.each([PLAN_NAMES.CORE, PLAN_NAMES.PLUS])(
    'enables receipt edtitor block view/edit button when user is on %s plan',
    (planName) => {
      useUserMock.mockReturnValue({
        isError: false,
        isLoading: false,
        user: {
          organizations: [{ plan: { name: planName } }],
          revenue_programs: [{ id: 123 }]
        }
      } as any);
      tree();
      const blockElement = screen.getByTestId(`email-block-Receipt`);
      const viewEditButton = within(blockElement).getByRole('button', { name: 'View & Edit' });
      expect(viewEditButton).toHaveAttribute('aria-disabled', 'false');
    }
  );
  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
