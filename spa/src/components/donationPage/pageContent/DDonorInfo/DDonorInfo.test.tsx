import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import DDonorInfo, { DDonorInfoProps } from './DDonorInfo';
import { DonorInfoElement } from 'hooks/useContributionPage';
import { DonationPageContext, UsePageProps } from 'components/donationPage/DonationPage';

const mockElement: DonorInfoElement = { content: {}, requiredFields: [], type: 'DDonorInfo', uuid: 'mock-uuid' };

function tree(props?: Partial<DDonorInfoProps>, pageContext?: Partial<UsePageProps>) {
  return render(
    <DonationPageContext.Provider
      value={
        {
          errors: {},
          page: {},
          ...pageContext
        } as any
      }
    >
      <ul>
        <DDonorInfo element={mockElement} {...props} />
      </ul>
    </DonationPageContext.Provider>
  );
}

describe('DDonorInfo', () => {
  describe.each([
    ['first name', 'first_name', 'donationPage.dDonorInfo.firstName'],
    ['last name', 'last_name', 'donationPage.dDonorInfo.lastName'],
    ['email', 'email', 'donationPage.dDonorInfo.email']
  ])('The %s field', (_, formName, name) => {
    it(`has the form name ${formName}`, () => {
      tree();
      expect(screen.getByRole('textbox', { name })).toHaveAttribute('name', formName);
    });

    it('is required', () => {
      tree();
      expect(screen.getByRole('textbox', { name })).toBeRequired();
    });

    it('shows an error if set in page context', () => {
      tree({}, { errors: { [formName]: 'test-error' } });
      expect(screen.getByText('test-error')).toBeVisible();
    });

    it('is editable', () => {
      tree();
      fireEvent.change(screen.getByRole('textbox', { name }), { target: { value: 'test-value' } });
      expect(screen.getByRole('textbox', { name })).toHaveValue('test-value');
    });
  });

  describe('If a phone field is enabled in content', () => {
    it('shows a phone field with form name phone', () => {
      tree({ element: { ...mockElement, content: { ...mockElement.content, askPhone: true } } });
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorInfo.phone' })).toHaveAttribute('name', 'phone');
    });

    it('sets a max length on the phone field of 20 characters', () => {
      tree({ element: { ...mockElement, content: { ...mockElement.content, askPhone: true } } });
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorInfo.phone' })).toHaveAttribute('maxlength', '20');
    });

    it('makes the field editable', () => {
      tree({ element: { ...mockElement, content: { ...mockElement.content, askPhone: true } } });
      fireEvent.change(screen.getByRole('textbox', { name: 'donationPage.dDonorInfo.phone' }), {
        target: { value: 'test-value' }
      });
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorInfo.phone' })).toHaveValue('test-value');
    });

    it('makes the field required if specified in content', () => {
      tree({
        element: { ...mockElement, content: { ...mockElement.content, askPhone: true }, requiredFields: ['phone'] }
      });
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorInfo.phone' })).toBeRequired();
    });

    it("doesn't make the field required if not specified in content", () => {
      tree({
        element: { ...mockElement, content: { ...mockElement.content, askPhone: true }, requiredFields: [] }
      });
      expect(screen.getByRole('textbox', { name: 'donationPage.dDonorInfo.phone' })).not.toBeRequired();
    });

    it('shows an error if set in page context', () => {
      tree(
        {
          element: { ...mockElement, content: { ...mockElement.content, askPhone: true }, requiredFields: [] }
        },
        { errors: { phone: 'test-error' } }
      );
      expect(screen.getByText('test-error')).toBeVisible();
    });
  });

  describe('If a phone field is disabled in content', () => {
    it("doesn't show a phone field if disabled in content", () => {
      tree({ element: { ...mockElement, content: { ...mockElement.content, askPhone: false } } });
      expect(screen.queryByRole('textbox', { name: 'donationPage.dDonorInfo.phone' })).not.toBeInTheDocument();
    });

    it("doesn't show an error even if set in page content", () => {
      tree(
        { element: { ...mockElement, content: { ...mockElement.content, askPhone: false } } },
        { errors: { phone: 'test-error' } }
      );
      expect(screen.queryByText('test-error')).not.toBeInTheDocument();
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
