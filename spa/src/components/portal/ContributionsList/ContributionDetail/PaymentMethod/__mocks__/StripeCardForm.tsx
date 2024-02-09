import { TextField } from 'components/base';
import { StripeCardFormProps } from '../StripeCardForm';

export const StripeCardForm = ({ onChangeCardComplete, onChangeName, name }: StripeCardFormProps) => (
  <div data-testid="mock-stripe-card-form">
    <TextField
      id="stripe-card-form-name"
      label="Name on Card"
      onChange={({ target }) => onChangeName(target.value)}
      value={name}
    />
    <button onClick={() => onChangeCardComplete(true)}>onChangeCardComplete true</button>
    <button onClick={() => onChangeCardComplete(false)}>onChangeCardComplete false</button>
  </div>
);

export default StripeCardForm;
