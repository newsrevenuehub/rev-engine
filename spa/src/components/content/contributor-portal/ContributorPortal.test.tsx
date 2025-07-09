import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { useAlert } from 'react-alert';
import { TextField } from 'components/base';
import { useRevenueProgram } from 'hooks/useRevenueProgram';
import { fireEvent, render, screen, waitFor } from 'test-utils';

import { GENERIC_ERROR } from 'constants/textConstants';

import ContributorPortal, { ContributorPortalProps } from './ContributorPortal';

jest.mock('components/base/TextField/PhoneTextField', () => ({
  PhoneTextField: (props: any) => <TextField {...props} />
}));
jest.mock('hooks/useRevenueProgram');
jest.mock('react-alert', () => ({
  ...jest.requireActual('react-alert'),
  useAlert: jest.fn()
}));

const revenueProgram = {
  id: 1,
  contact_email: 'mock-my-mail@email.com',
  contact_phone: '000'
} as any;

describe('ContributorPortal', () => {
  const useAlertMock = jest.mocked(useAlert);
  const useRevenueProgramMock = jest.mocked(useRevenueProgram);

  function tree(props?: Partial<ContributorPortalProps>) {
    return render(<ContributorPortal revenueProgram={revenueProgram} {...props} />);
  }

  beforeEach(() => {
    useRevenueProgramMock.mockReturnValue({
      updateRevenueProgram: jest.fn(),
      revenueProgram: {} as any,
      isFetching: false
    });
    useAlertMock.mockReturnValue({
      error: jest.fn()
    } as any);
  });

  it('should render page', () => {
    tree();

    expect(screen.getByText('Contributor Portal')).toBeInTheDocument();
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
  });

  describe('Phone Number input', () => {
    it('should render input', () => {
      tree();
      expect(screen.getByRole('textbox', { name: 'Phone Number' })).toHaveValue(revenueProgram.contact_phone);
    });

    it('should allow submit if user typed numbers or allowed special chars', async () => {
      tree();

      await fireEvent.change(screen.getByRole('textbox', { name: 'Phone Number' }), {
        target: { value: '09 * # + - . _ ( )' }
      });
      userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.queryByText(/Please enter a valid phone number./i)).not.toBeInTheDocument();
      });
    });

    it('should show error message from server if related to field', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      useRevenueProgramMock.mockReturnValue({
        updateRevenueProgram: jest
          .fn()
          .mockRejectedValue({ response: { data: { contact_phone: ['mock-phone-number-error'] } } }),
        revenueProgram: {} as any,
        isFetching: false
      });

      tree();

      await fireEvent.change(screen.getByRole('textbox', { name: 'Phone Number' }), {
        target: { value: '123' }
      });
      userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText('mock-phone-number-error')).toBeVisible();
      });
      errorSpy.mockRestore();
    });

    it('should disable buttons if phone number is unchanged', () => {
      tree();

      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel changes/i })).toBeDisabled();
    });

    it.each(['+1', '+55', '+380', '+1234'])(
      'should disable buttons if only phone only contains country code: %s',
      (countryCode) => {
        tree({ revenueProgram: { ...revenueProgram, contact_phone: '' } });

        fireEvent.change(screen.getByRole('textbox', { name: 'Phone Number' }), {
          target: { value: countryCode }
        });

        expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /cancel changes/i })).toBeDisabled();
      }
    );

    it('should not disable buttons if only country code, but RP has phone number to reset to', () => {
      tree();

      fireEvent.change(screen.getByRole('textbox', { name: 'Phone Number' }), {
        target: { value: '+123' }
      });

      expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel changes/i })).not.toBeDisabled();
    });
  });

  describe('Email Address input', () => {
    it('should render input', () => {
      tree();
      expect(screen.getByRole('textbox', { name: 'Email Address' })).toHaveValue(revenueProgram.contact_email);
    });

    it.each(['asd.com', 'asd@asd', 'asd'])(
      'should show error message when submitting invalid email format: %s',
      async (badEmail) => {
        tree();

        await fireEvent.change(screen.getByRole('textbox', { name: 'Email Address' }), {
          target: { value: badEmail }
        });
        userEvent.click(screen.getByRole('button', { name: /save/i }));

        await waitFor(() => {
          expect(screen.getByText(/Please enter a valid email address./i)).toBeInTheDocument();
        });
      }
    );

    it('should allow submit if user typed valid email', async () => {
      tree();

      await fireEvent.change(screen.getByRole('textbox', { name: 'Email Address' }), {
        target: { value: 'valid@email.com' }
      });
      userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.queryByText(/Please enter a valid email address./i)).not.toBeInTheDocument();
      });
    });

    it('should show error message from server if related to field', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      useRevenueProgramMock.mockReturnValue({
        isFetching: false,
        revenueProgram: {} as any,
        updateRevenueProgram: jest
          .fn()
          .mockRejectedValue({ response: { data: { contact_email: ['mock-email-error'] } } })
      });

      tree();

      await fireEvent.change(screen.getByRole('textbox', { name: 'Email Address' }), {
        target: { value: 'valid@email.com' }
      });
      userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText('mock-email-error')).toBeVisible();
      });
      errorSpy.mockRestore();
    });
  });

  it('should disable Cancel Changes & Save buttons if fields are unchanged', () => {
    tree();

    expect(screen.getByRole('button', { name: /Cancel Changes/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('should reset changes when "Cancel Changes" is clicked', async () => {
    tree();

    expect(screen.getByRole('textbox', { name: 'Phone Number' })).toHaveValue(revenueProgram.contact_phone);

    await fireEvent.change(screen.getByRole('textbox', { name: 'Phone Number' }), {
      target: { value: 'Mock-new' }
    });

    expect(screen.getByRole('textbox', { name: 'Phone Number' })).toHaveValue('Mock-new');

    screen.getByRole('button', { name: /Cancel Changes/i }).click();

    expect(screen.getByRole('textbox', { name: 'Phone Number' })).toHaveValue(revenueProgram.contact_phone);
  });

  describe('onSubmit: Saving changes', () => {
    const updateRevenueProgram = jest.fn();

    beforeEach(() => {
      useRevenueProgramMock.mockReturnValue({
        updateRevenueProgram,
        isFetching: false,
        revenueProgram: {} as any
      });
    });

    it('should call Revenue Program patch', async () => {
      tree();

      expect(updateRevenueProgram).not.toHaveBeenCalled();

      await fireEvent.change(screen.getByRole('textbox', { name: 'Phone Number' }), {
        target: { value: '+123456789' }
      });
      await fireEvent.change(screen.getByRole('textbox', { name: 'Email Address' }), {
        target: { value: 'email@mock.com' }
      });

      userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(updateRevenueProgram).toHaveBeenCalledTimes(1);
      });
      expect(updateRevenueProgram).toHaveBeenCalledWith({
        contact_email: 'email@mock.com',
        contact_phone: '+123456789'
      });
    });

    it.each(['+1', '+55', '+380', '+1234'])(
      'should call Revenue Program patch with empty phone number if it only contains country code: %s',
      async (countryCode) => {
        tree();

        expect(updateRevenueProgram).not.toHaveBeenCalled();

        await fireEvent.change(screen.getByRole('textbox', { name: 'Phone Number' }), {
          target: { value: countryCode }
        });
        await fireEvent.change(screen.getByRole('textbox', { name: 'Email Address' }), {
          target: { value: 'email@mock.com' }
        });

        userEvent.click(screen.getByRole('button', { name: /save/i }));

        await waitFor(() => {
          expect(updateRevenueProgram).toHaveBeenCalledTimes(1);
        });
        expect(updateRevenueProgram).toHaveBeenCalledWith({ contact_email: 'email@mock.com', contact_phone: '' });
      }
    );

    it('should show success message when patch returns 200', async () => {
      tree();

      expect(screen.queryByText('Successfully saved details!')).not.toBeInTheDocument();
      await fireEvent.change(screen.getByRole('textbox', { name: 'Phone Number' }), {
        target: { value: '123' }
      });
      await fireEvent.change(screen.getByRole('textbox', { name: 'Email Address' }), {
        target: { value: 'email@mock.com' }
      });

      userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText('Successfully saved details!')).toBeVisible();
      });
    });

    it('should hide success message when patch returns 200 and user makes any change', async () => {
      tree();
      expect(screen.queryByText('Successfully saved details!')).not.toBeInTheDocument();
      await fireEvent.change(screen.getByRole('textbox', { name: 'Phone Number' }), {
        target: { value: '123' }
      });
      await fireEvent.change(screen.getByRole('textbox', { name: 'Email Address' }), {
        target: { value: 'email@mock.com' }
      });

      userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText('Successfully saved details!')).toBeVisible();
      });

      await fireEvent.change(screen.getByRole('textbox', { name: 'Phone Number' }), {
        target: { value: '999' }
      });
      expect(screen.queryByText('Successfully saved details!')).not.toBeInTheDocument();
    });

    it('should show generic error if patch fails', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const updateRevenueProgram = jest.fn().mockRejectedValue({});
      const alertError = jest.fn();
      useAlertMock.mockReturnValue({
        error: alertError
      } as any);

      useRevenueProgramMock.mockReturnValue({
        updateRevenueProgram,
        isFetching: false,
        revenueProgram: {} as any
      });

      tree();
      expect(updateRevenueProgram).not.toHaveBeenCalled();
      expect(screen.queryByText(GENERIC_ERROR)).not.toBeInTheDocument();
      expect(alertError).not.toHaveBeenCalled();

      await fireEvent.change(screen.getByRole('textbox', { name: 'Phone Number' }), {
        target: { value: '123' }
      });
      await fireEvent.change(screen.getByRole('textbox', { name: 'Email Address' }), {
        target: { value: 'email@mock.com' }
      });

      userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(updateRevenueProgram).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(alertError).toHaveBeenCalledTimes(1);
      });
      expect(alertError).toHaveBeenCalledWith(GENERIC_ERROR);
      errorSpy.mockRestore();
    });
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
