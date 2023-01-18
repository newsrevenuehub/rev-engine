import PropTypes, { InferProps } from 'prop-types';
import * as S from './DElement.styled';

const DElementPropTypes = {
  children: PropTypes.node,
  label: PropTypes.string,
  description: PropTypes.string
};

export interface DElementProps extends InferProps<typeof DElementPropTypes> {
  // We allow props to be set on the component that we're not aware of, but are
  // spread on the container `<li>` element.
  [key: string]: unknown;
}

/**
 * DElement is used as the basis all dynamic elements. It establishes
 * baseline positioning and space, as well as allowing easy label and
 * description text
 */
function DElement({ label, description, children, ...props }: DElementProps) {
  return (
    <S.DElement {...props}>
      {label && <S.Label>{label}</S.Label>}
      {description && <S.Description>{description}</S.Description>}
      {children}
    </S.DElement>
  );
}

DElement.propTypes = DElementPropTypes;

/**
 * This schema is the basis for dynamic element props.
 * Each dynamic element should utilize this pattern.
 * Maintaining these while we transition to TypeScript.
 */
export const DynamicElementPropTypes = {
  uuid: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  content: PropTypes.any.isRequired
};

export default DElement;
