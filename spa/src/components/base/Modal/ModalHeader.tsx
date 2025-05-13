import { IconButton } from '@material-ui/core';
import { Close } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import styled from 'styled-components';

const ModalHeaderPropTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  closeAriaLabel: PropTypes.string,
  icon: PropTypes.node,
  id: PropTypes.string,
  onClose: PropTypes.func
};

export interface ModalHeaderProps extends InferProps<typeof ModalHeaderPropTypes> {
  onClose?: () => void;
}

const CloseButton = styled(IconButton)`
  align-self: baseline;
  color: ${({ theme }) => theme.basePalette.greyscale['30']};
  height: 24px;
  width: 24px;

  svg {
    height: 24px;
    width: 24px;
  }
`;

const Content = styled('div')`
  flex-grow: 1;
  outline: none;
`;

const Root = styled('div')`
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.basePalette.greyscale['10']};
  display: flex;
  font:
    18px Roboto,
    sans-serif;
  gap: 10px;
  margin: 0 10px;
  padding: 14px 0;
`;

export function ModalHeader({ children, className, closeAriaLabel, icon, id, onClose }: ModalHeaderProps) {
  // The data-autofocus and tabIndex props on Content below ask react-focus-lock
  // to focus the header first, but keep it out of tab order when the user tabs
  // around.

  return (
    <Root className={className!} id={id!}>
      {icon}
      <Content data-autofocus tabIndex={-1}>
        {children}
      </Content>
      {onClose && (
        <CloseButton aria-label={closeAriaLabel ?? 'Close'} onClick={onClose}>
          <Close />
        </CloseButton>
      )}
    </Root>
  );
}

ModalHeader.propTypes = ModalHeaderPropTypes;

export default ModalHeader;
