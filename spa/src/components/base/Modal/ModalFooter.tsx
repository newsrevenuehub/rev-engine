import PropTypes, { InferProps } from 'prop-types';
import styled from 'styled-components';

const ModalFooterPropTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

export type ModalFooterProps = InferProps<typeof ModalFooterPropTypes>;

const Root = styled('div')`
  display: flex;
  gap: 14px;
  justify-content: flex-end;
  padding: 0 14px 14px 14px;
`;

export function ModalFooter({ children, className }: ModalFooterProps) {
  return <Root className={className!}>{children}</Root>;
}

ModalFooter.propTypes = ModalFooterPropTypes;

export default ModalFooter;
