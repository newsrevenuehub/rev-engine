import PropTypes, { InferProps } from 'prop-types';
import { Field, Fieldset, Heading, Label, TextInput } from './common.styled';

const AmountPropTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired
};

export interface AmountProps extends InferProps<typeof AmountPropTypes> {
  onChange: (value: string) => void;
}

export function Amount({ onChange, value }: AmountProps) {
  return (
    <Fieldset>
      <Heading>Amount</Heading>
      <Field>
        <Label htmlFor="amount-field">Amount</Label>
        <TextInput id="amount-field" onChange={(event) => onChange(event.target.value)} type="number" value={value} />
      </Field>
    </Fieldset>
  );
}

Amount.propTypes = AmountPropTypes;
export default Amount;
