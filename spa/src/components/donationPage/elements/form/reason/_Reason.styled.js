import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';

function Reason({ name, labelText, helperText, placeholder }) {
  const { register } = useFormContext();
  return <fieldset></fieldset>;
}

Reason.propTypes = {
  name: PropTypes.string.isRequired,
  labelText: PropTypes.string.isRequired,
  helperText: PropTypes.string.isRequired,
  placeholder: PropTypes.string
};

Reason.defaultProps = {
  name: 'contribution-reason',
  labelText: '',
  helperText: ''
};

export default Reason;
