import { axe } from 'jest-axe';
import { render, screen, waitFor } from 'test-utils';
import useUserImport from 'hooks/useUser';
import SendTestEmail from './SendTestEmail';
import { USER_ROLE_HUB_ADMIN_TYPE, USER_SUPERUSER_TYPE } from 'constants/authConstants';
import MockAdapter from 'axios-mock-adapter';
import Axios from 'ajax/axios';
import userEvent from '@testing-library/user-event';
import { SEND_TEST_EMAIL } from 'ajax/endpoints';

jest.mock('hooks/useUser');

const rpId = 1;

function tree() {
  return render(<SendTestEmail rpId={rpId} />);
}

describe('SendTestEmail', () => {
  const useUserMock = jest.mocked(useUserImport);
  const axiosMock = new MockAdapter(Axios);

  beforeEach(() => {
    useUserMock.mockReturnValue({ user: { role_type: [USER_ROLE_HUB_ADMIN_TYPE, 'HUB_ADMIN'] } } as any);
  });

  afterEach(() => axiosMock.reset());

  afterAll(() => axiosMock.restore());

  it('should not render if user is not hub admin or superuser', () => {
    useUserMock.mockReturnValue({ user: { role_type: ['USER'] } } as any);
    tree();
    expect(screen.queryByText('Test email')).not.toBeInTheDocument();
    expect(document.body.textContent).toBe('');
  });

  it('should render if user is hub admin', () => {
    useUserMock.mockReturnValue({ user: { role_type: [USER_ROLE_HUB_ADMIN_TYPE] } } as any);
    tree();
    expect(screen.getByText('Test email')).toBeInTheDocument();
  });

  it('should render if user is superuser', () => {
    useUserMock.mockReturnValue({ user: { role_type: [USER_SUPERUSER_TYPE] } } as any);
    tree();
    expect(screen.getByText('Test email')).toBeInTheDocument();
  });

  it('should render label', () => {
    tree();
    expect(screen.getByText('Test email')).toBeInTheDocument();
  });

  it.each(['RECEIPT', 'REMINDER', 'MAGIC LINK'])('should render %s button', (name) => {
    tree();
    expect(screen.getByRole('button', { name })).toBeEnabled();
  });

  it.each(['RECEIPT', 'REMINDER', 'MAGIC LINK'])(
    'should POST to "/send-test-email/" if %s button is clicked',
    async (name) => {
      axiosMock.onPost(SEND_TEST_EMAIL).reply(200);
      tree();
      userEvent.click(screen.getByRole('button', { name }));
      console.log(axiosMock.history);
      await waitFor(() => expect(axiosMock.history.post).toHaveLength(1));
      expect(axiosMock.history.post[0]).toEqual(
        expect.objectContaining({
          data: JSON.stringify({
            email_name: name.toLowerCase().split(' ').join('_'),
            revenue_program: rpId
          }),
          url: SEND_TEST_EMAIL
        })
      );
    }
  );

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
