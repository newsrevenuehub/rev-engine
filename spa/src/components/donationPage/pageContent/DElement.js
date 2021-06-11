import PropTypes from 'prop-types';
import * as S from './DElement.styled';

function DElement({ label, description, children, ...props }) {
  return (
    <S.DElement {...props}>
      {label && <S.Label>{label}</S.Label>}
      {description && <S.Description>{description}</S.Description>}
      {children}
    </S.DElement>
  );
}

DElement.propTypes = {
  label: PropTypes.string,
  description: PropTypes.string
};

export const DynamicElementPropTypes = {
  uuid: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  content: PropTypes.any
};

export default DElement;
