import { CardElement } from '@stripe/react-stripe-js';
import { StripeCardElementChangeEvent } from '@stripe/stripe-js';
import PropTypes, { InferProps } from 'prop-types';
import { useState } from 'react';
import { TextField } from 'components/base';
import { CardElementContainer, CardElementLabel, Error, Fields } from './StripeCardForm.styled';

const StripeCardFormPropTypes = {
  name: PropTypes.string.isRequired,
  onChangeCardComplete: PropTypes.func.isRequired,
  onChangeName: PropTypes.func.isRequired
};

export interface StripeCardFormProps extends InferProps<typeof StripeCardFormPropTypes> {
  onChangeCardComplete: (isComplete: boolean) => void;
  onChangeName: (value: string) => void;
}

export function StripeCardForm({ name, onChangeCardComplete, onChangeName }: StripeCardFormProps) {
  const [error, setError] = useState<string>();

  function handleChange(event: StripeCardElementChangeEvent) {
    setError(event.error?.message);
    onChangeCardComplete(event.complete);
  }

  return (
    <>
      <Fields>
        <TextField
          id="stripe-card-form-name"
          label="Name on Card"
          onChange={({ target }) => onChangeName(target.value)}
          value={name}
        />
        <div>
          <CardElementLabel>Credit Card</CardElementLabel>
          <CardElementContainer $error={!!error}>
            <CardElement
              onChange={handleChange}
              options={{ style: { base: { fontFamily: 'Roboto, sans-serif', fontSize: '16px' } } }}
            />
          </CardElementContainer>
        </div>
      </Fields>
      {error && <Error role="alert">{error}</Error>}
    </>
  );
}

StripeCardForm.propTypes = StripeCardFormPropTypes;
export default StripeCardForm;
