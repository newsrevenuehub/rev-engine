import PropTypes, { InferProps } from 'prop-types';
import styled from 'styled-components';

const ModalContentPropTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

export type ModalContentProps = InferProps<typeof ModalContentPropTypes>;

const Root = styled('div')`
  color: ${({ theme }) => theme.basePalette.greyscale.black};
  font:
    16px Roboto,
    sans-serif;
  padding: 14px 14px 20px 14px;
`;

export function ModalContent({ children, className }: ModalContentProps) {
  return <Root className={className!}>{children}</Root>;
}

ModalContent.propTypes = ModalContentPropTypes;

export default ModalContent;
