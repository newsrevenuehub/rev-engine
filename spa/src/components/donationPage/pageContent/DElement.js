import PropTypes from 'prop-types';
import * as S from './DElement.styled';

/**
 * DElement is used as the basis all dynamic elements. It establishes
 * baseline positioning and space, as well as allowing easy label and
 * description text
 */
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

/**
 * This schema is the basis for dynamic element props.
 * Each dynamic element should utilize this pattern.
 */
export const DynamicElementPropTypes = {
  uuid: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  content: PropTypes.any
};

export default DElement;
