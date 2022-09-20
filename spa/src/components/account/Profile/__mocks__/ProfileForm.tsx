import { FormEvent } from 'react';
import { ProfileFormData, ProfileFormProps } from '../ProfileForm';

const mockFormData: ProfileFormData = {
  firstName: 'mock-first-name',
  lastName: 'mock-last-name',
  jobTitle: 'mock-job-title',
  companyName: 'mock-company-name',
  companyTaxStatus: 'nonprofit'
};

const ProfileForm = (props: ProfileFormProps) => {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    props.onProfileSubmit(mockFormData);
  }

  return (
    <form onSubmit={handleSubmit} data-testid="mock-profile-form">
      {props.disabled && <div data-testid="mock-profile-form-disabled" />}
      <button>mock-profile-form-submit</button>
    </form>
  );
};

export default ProfileForm;
