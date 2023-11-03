import * as S from './TextArea.styled';
import PropTypes from 'prop-types';
import BaseField from 'elements/inputs/BaseField';

function TextArea({ value, onChange, testid, ...props }) {
  return (
    <BaseField {...props}>
      <S.TextArea value={value} onChange={onChange} data-testid={testid} />
    </BaseField>
  );
}

TextArea.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired
};

export default TextArea;
