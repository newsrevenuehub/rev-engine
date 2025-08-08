import PropTypes, { InferProps } from 'prop-types';
import { Field, Fieldset, Label, TextInput } from './common.styled';
import { Fields } from './ContributorInfo.styled';

const ContributorInfoPropTypes = {
  email: PropTypes.string.isRequired,
  firstName: PropTypes.string.isRequired,
  lastName: PropTypes.string.isRequired,
  phone: PropTypes.string.isRequired,
  onChangeEmail: PropTypes.func.isRequired,
  onChangeFirstName: PropTypes.func.isRequired,
  onChangeLastName: PropTypes.func.isRequired,
  onChangePhone: PropTypes.func.isRequired
};

export interface ContributorInfoProps extends InferProps<typeof ContributorInfoPropTypes> {
  onChangeEmail: (value: string) => void;
  onChangeFirstName: (value: string) => void;
  onChangeLastName: (value: string) => void;
  onChangePhone: (value: string) => void;
}

export function ContributorInfo({
  email,
  firstName,
  lastName,
  onChangeEmail,
  onChangeFirstName,
  onChangeLastName,
  onChangePhone,
  phone
}: ContributorInfoProps) {
  const fields = [
    { id: 'first-name', label: 'First Name', onChange: onChangeFirstName, value: firstName },
    { id: 'last-name', label: 'Last Name', onChange: onChangeLastName, value: lastName },
    { id: 'email', label: 'Email', onChange: onChangeEmail, type: 'email', value: email },
    { id: 'phone', label: 'Phone', onChange: onChangePhone, type: 'phone', value: phone }
  ];

  return (
    <Fieldset>
      <Fields>
        {fields.map(({ id, label, onChange, type, value }) => (
          <Field key={id}>
            <Label htmlFor={id}>{label}</Label>
            <TextInput id={id} onChange={(event) => onChange(event.target.value)} type={type ?? 'text'} value={value} />
          </Field>
        ))}
      </Fields>
    </Fieldset>
  );
}

ContributorInfo.propTypes = ContributorInfoPropTypes;
export default ContributorInfo;
