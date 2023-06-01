import { IconButton } from '@material-ui/core';
import { Close } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import styled from 'styled-components';

const ModalHeaderPropTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  closeAriaLabel: PropTypes.string,
  icon: PropTypes.node,
  onClose: PropTypes.func
};

export interface ModalHeaderProps extends InferProps<typeof ModalHeaderPropTypes> {
  onClose?: () => void;
}

const CloseButton = styled(IconButton)`
  align-self: baseline;
  color: ${({ theme }) => theme.basePalette.greyscale.grey2};
  height: 24px;
  width: 24px;

  svg {
    height: 24px;
    width: 24px;
  }
`;

const Content = styled('div')`
  flex-grow: 1;
`;

const Root = styled('div')`
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.basePalette.greyscale.grey3};
  display: flex;
  font: 18px Roboto, sans-serif;
  gap: 10px;
  margin: 0 10px;
  padding: 14px 0;
`;

export function ModalHeader({ children, className, closeAriaLabel, icon, onClose }: ModalHeaderProps) {
  // The usage of data-no-autoFocus on the close button is to prevent it from
  // being the first focused element when the modal first opens. See
  // react-focus-lock usage in <Modal>.

  return (
    <Root className={className!}>
      {icon}
      <Content>{children}</Content>
      {onClose && (
        <CloseButton aria-label={closeAriaLabel ?? 'Close'} data-no-autoFocus onClick={onClose}>
          <Close />
        </CloseButton>
      )}
    </Root>
  );
}

ModalHeader.propTypes = ModalHeaderPropTypes;

export default ModalHeader;
