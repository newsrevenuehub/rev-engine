import PropTypes from 'prop-types';
import { ReactChild } from 'react';
import * as S from './DElement.styled';

export interface DElementProps {
  children?: ReactChild;
  /**
   * Description of the element.
   */
  description?: string;
  /**
   * Label for the element.
   */
  label?: string;

  // ... other props that we don't know about.
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

/**
 * This schema is the basis for dynamic element props.
 * Each dynamic element should utilize this pattern.
 * Maintaining these while we transition to TypeScript.
 */
export const DynamicElementPropTypes = {
  uuid: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  content: PropTypes.any
};

export default DElement;
