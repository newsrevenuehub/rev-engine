const mockFormData = {
  firstName: 'mock-first-name',
  lastName: 'mock-last-name',
  jobTitle: 'mock-job-title',
  companyName: 'mock-company-name',
  companyTaxStatus: 'mock-tax-status'
};

const ProfileForm = ({ disabled, onProfileSubmit }) => {
  function handleSubmit(event) {
    event.preventDefault();
    onProfileSubmit(mockFormData);
  }

  function handleSubmitWithoutJobTitle() {
    onProfileSubmit({ ...mockFormData, jobTitle: '' });
  }

  return (
    <form onSubmit={handleSubmit} data-testid="mock-profile-form">
      {disabled && <div data-testid="mock-profile-form-disabled" />}
      <button>mock-profile-form-submit</button>
      <button type="button" onClick={handleSubmitWithoutJobTitle}>
        mock-profile-form-submit-without-job-title
      </button>
    </form>
  );
};

export default ProfileForm;
