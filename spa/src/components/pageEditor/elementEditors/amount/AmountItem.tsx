import { ButtonBase } from '@material-ui/core';
import PropTypes, { InferProps } from 'prop-types';
import { MouseEvent } from 'react';
import { NumberButton, RemoveIcon, Root } from './AmountItem.styled';

const AmountItemPropTypes = {
  amount: PropTypes.number.isRequired,
  isDefault: PropTypes.bool,
  onRemove: PropTypes.func.isRequired,
  removable: PropTypes.bool,
  onSetDefault: PropTypes.func.isRequired
};

export interface AmountItemProps extends InferProps<typeof AmountItemPropTypes> {
  onRemove: () => void;
  onSetDefault: (event: MouseEvent) => void;
}

export function AmountItem({ amount, isDefault, onRemove, onSetDefault, removable }: AmountItemProps) {
  return (
    <Root $isDefault={!!isDefault}>
      <NumberButton aria-label={`Make ${amount} default`} onClick={onSetDefault}>
        {amount}
      </NumberButton>
      <ButtonBase aria-label={`Remove ${amount}`} disabled={!removable} onClick={onRemove}>
        {removable && <RemoveIcon $isDefault={!!isDefault} />}
      </ButtonBase>
    </Root>
  );
}

AmountItem.propTypes = AmountItemPropTypes;
export default AmountItem;
