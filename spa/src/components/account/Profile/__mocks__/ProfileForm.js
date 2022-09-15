const mockFormData = {
  firstName: 'mock-first-name',
  lastName: 'mock-first-name',
  jobTitle: 'mock-job-title',
  companyName: 'mock-company-name',
  companyTaxStatus: 'mock-tax-status'
};

const ProfileForm = ({ disabled, onProfileSubmit }) => {
  function handleSubmit(event) {
    event.preventDefault();
    onProfileSubmit(mockFormData);
  }

  return (
    <form onSubmit={handleSubmit} data-testid="mock-profile-form">
      {disabled && <div data-testid="mock-profile-form-disabled" />}
      <button>mock-profile-form-submit</button>
    </form>
  );
};

export default ProfileForm;
