import { FormEvent } from 'react';
import { TAX_STATUS } from 'constants/fiscalStatus';
import { ProfileFormProps } from '../ProfileForm';

const mockFormData = {
  firstName: 'mock-first-name',
  lastName: 'mock-last-name',
  jobTitle: 'mock-job-title',
  companyName: 'mock-company-name',
  companyTaxStatus: 'mock-tax-status',
  taxId: '987654321',
  fiscalSponsorName: 'mock-sponsor-name'
};

type ProfileFormType = {
  disabled: boolean;
  onProfileSubmit: (form: typeof mockFormData) => void;
  error?: ProfileFormProps['error'];
};

const ProfileForm = ({ disabled, onProfileSubmit, error }: ProfileFormType) => {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onProfileSubmit(mockFormData);
  }

  function handleSubmitWithoutJobTitle() {
    onProfileSubmit({ ...mockFormData, jobTitle: '' });
  }

  function handleSubmitFiscalSponsor() {
    onProfileSubmit({ ...mockFormData, companyTaxStatus: TAX_STATUS.FISCALLY_SPONSORED });
  }

  return (
    <>
      <form onSubmit={handleSubmit} data-testid="mock-profile-form">
        {disabled && <div data-testid="mock-profile-form-disabled" />}
        <button>mock-profile-form-submit</button>
        <button type="button" onClick={handleSubmitWithoutJobTitle}>
          mock-profile-form-submit-without-job-title
        </button>
        <button type="button" onClick={handleSubmitFiscalSponsor}>
          mock-profile-form-fiscal-sponsor
        </button>
      </form>
      {error?.detail && <div data-testid="profile-modal-error">{error.detail}</div>}
    </>
  );
};

export default ProfileForm;
