import PropTypes from 'prop-types';
import Switch from '@material-ui/core/Switch';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import { useFormContext, Controller } from 'react-hook-form';

function PayFees({ name, legendHeading, payFeesLabelText, helperText, defaultChecked }) {
  const { control } = useFormContext();

  return (
    <fieldset>
      <legend className="mb-5">
        <h2 className="text-3xl">{legendHeading}</h2>
        <Controller
          defaultValue={defaultChecked}
          name={name}
          control={control}
          render={({ field: { onChange, value } }) => {
            return (
              <FormControlLabel
                control={<Switch checked={value} color="primary" />}
                onChange={onChange}
                label={payFeesLabelText}
              ></FormControlLabel>
            );
          }}
        />
        <p>{helperText}</p>
      </legend>
    </fieldset>
  );
}

PayFees.propTypes = {
  name: PropTypes.string.isRequired,
  legendHeading: PropTypes.string.isRequired,
  payFeesLabelText: PropTypes.string.isRequired,
  helperText: PropTypes.string.isRequired,
  defaultChecked: PropTypes.bool
};

PayFees.defaultProps = {
  name: 'agree-pay-fees',
  legendHeading: 'Agree to pay fees?',
  helperText: 'Paying the Stripe transaction fee, while not required, directs more money in support of our mission.',
  defaultChecked: false
};

export default PayFees;
