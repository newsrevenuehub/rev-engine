import { FormControl, InputAdornment, OutlinedInput } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';

const useStyles = makeStyles(() => ({
  root: {
    width: '164px',
    height: '40px',
    '& > input::-webkit-outer-spin-button, input::-webkit-inner-spin-button': {
      fontStyle: 'normal',
      '-webkit-appearance': 'none'
    },
    '& ::placeholder': {
      fontStyle: 'normal'
    }
  }
}));

const CurrencyField = ({ ariaLabel, value, onChange, placeholder, currency, ...rest }) => {
  const classes = useStyles();
  return (
    <FormControl fullWidth variant="outlined">
      <OutlinedInput
        inputProps={{ min: 0, 'aria-label': ariaLabel }}
        className={classes.root}
        type="number"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        startAdornment={<InputAdornment position="start">{currency}</InputAdornment>}
        {...rest}
      />
    </FormControl>
  );
};

CurrencyField.propTypes = {
  currency: PropTypes.string
};

CurrencyField.defaultProps = {
  currency: '$'
};

export default CurrencyField;
