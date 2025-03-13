import { axe } from 'jest-axe';
import { fireEvent, render, screen, within } from 'test-utils';
import { useTestEmails } from 'hooks/useTestEmails';
import useUser from 'hooks/useUser';
import EmailsRoute, { blocks } from './EmailsRoute';
import { EMAIL_KB_URL } from 'constants/helperUrls';

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
        revenue_programs: [{ id: 123 }]
      }
    } as any);
  });

  it('shows a link to the email article on the knowledge base', () => {
    tree();
    expect(screen.getByRole('link', { name: 'More About Emails' })).toHaveAttribute('href', EMAIL_KB_URL);
  });

  describe.each(blocks)('Block $#', (block) => {
    const editButtonLabel = block.editable ? 'View & Edit' : 'View';

    it(`shows a "${block.name}" header`, () => {
      tree();
      expect(screen.getByRole('heading', { name: block.name })).toBeVisible();
    });

    it('shows the appropriate description', () => {
      tree();
      expect(screen.getByText(block.description)).toBeVisible();
    });

    it(`shows a disabled ${editButtonLabel} button`, () => {
      tree();
      expect(
        within(screen.getByTestId(`email-block-${block.name}`)).getByRole('button', { name: editButtonLabel })
      ).toBeDisabled();
    });

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
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
