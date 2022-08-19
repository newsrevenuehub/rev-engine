import PropTypes from 'prop-types';
import LabeledInput from 'elements/inputs/LabeledInput';
import clsx from 'clsx';

function ContributorInfo({
  firstNameInputName,
  firstNameLabelText,
  firstNameRequired,
  lastNameInputName,
  lastNameLabelText,
  lastNameRequired,
  emailInputName,
  emailLabelText,
  emailRequired,
  askPhone,
  phoneInputName,
  phoneLabelText,
  phoneRequired
}) {
  return (
    <fieldset className={clsx('w-full flex flex-col items-center')}>
      <div className={clsx('flex flex-col w-full max-w-full	items-center md:flex-row gap-2')}>
        <LabeledInput name={firstNameInputName} labelText={firstNameLabelText} required={firstNameRequired} />
        <LabeledInput name={lastNameInputName} labelText={lastNameLabelText} required={lastNameRequired} />
        <LabeledInput name={emailInputName} labelText={emailLabelText} required={emailRequired} />
        {askPhone && <LabeledInput name={phoneInputName} labelText={phoneLabelText} required={phoneRequired} />}
      </div>
    </fieldset>
  );
}

ContributorInfo.propTypes = {
  firstNameInputName: PropTypes.string.isRequired,
  firstNameLabelText: PropTypes.string.isRequired,
  firstNameRequired: PropTypes.bool.isRequired,
  lastNameInputName: PropTypes.string.isRequired,
  lastNameLabelText: PropTypes.string.isRequired,
  lastNameRequired: PropTypes.bool.isRequired,
  emailInputName: PropTypes.string.isRequired,
  emailLabelText: PropTypes.string.isRequired,
  emailRequired: PropTypes.bool.isRequired,
  askPhone: PropTypes.bool.isRequired,
  phoneInputName: PropTypes.string.isRequired,
  phoneLabelText: PropTypes.string.isRequired,
  phoneRequired: PropTypes.bool.isRequired
};

ContributorInfo.defaultProps = {
  firstNameInputName: 'first-name',
  firstNameLabelText: 'First name',
  firstNameRequired: true,
  lastNameInputName: 'last-name',
  lastNameLabelText: 'Last name',
  lastNameRequired: true,
  emailInputName: 'email',
  emailLabelText: 'E-mail',
  emailRequired: true,
  askPhone: false,
  phoneInputName: 'phone',
  phoneLabelText: 'Phone',
  phoneRequired: false
};
export default ContributorInfo;
