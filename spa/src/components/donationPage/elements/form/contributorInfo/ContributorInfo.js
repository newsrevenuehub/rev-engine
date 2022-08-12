import LabeledInput from 'elements/inputs/LabeledInput';
import clsx from 'clsx';

export const defaultArgs = {
  firstNameInputName: 'first-name',
  firstNameLabelText: 'First name',
  firstNameRequired: true,
  lastNameInputName: 'last-name',
  lastNameLabelText: 'Last name',
  lastNameRequired: true,
  emailInputName: 'email',
  emailLabelText: 'E-mail',
  emailRequired: true
};

function ContributorInfo({
  firstNameInputName = defaultArgs.firstNameInputName,
  firstNameLabelText = defaultArgs.firstNameLabelText,
  firstNameRequired = defaultArgs.firstNameRequired,
  lastNameInputName = defaultArgs.lastNameInputName,
  lastNameLabelText = defaultArgs.lastNameLabelText,
  lastNameRequired = defaultArgs.lastNameRequired,
  emailInputName = defaultArgs.emailInputName,
  emailLabelText = defaultArgs.emailLabelText,
  emailRequired = defaultArgs.emailRequired
}) {
  return (
    <fieldset className={clsx('w-full flex flex-col items-center')}>
      <div className={clsx('flex flex-col w-full max-w-full	items-center md:flex-row gap-2')}>
        <LabeledInput name={firstNameInputName} labelText={firstNameLabelText} required={firstNameRequired} />
        <LabeledInput name={lastNameInputName} labelText={lastNameLabelText} required={lastNameRequired} />
      </div>
      <LabeledInput
        className={clsx('w-full')}
        name={emailInputName}
        labelText={emailLabelText}
        required={emailRequired}
      />
    </fieldset>
  );
}

// Address.type = 'Address';
// Address.displayName = 'Donor address';
// Address.description = 'Collect donor address';
// Address.required = true;
// Address.unique = true;

export default ContributorInfo;
