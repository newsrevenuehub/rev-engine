import PropTypes from 'prop-types';

import { Flex, Button, Label } from './NewButton.styled';

import AddIcon from 'assets/icons/add.svg';
import { BUTTON_TYPE } from 'constants/buttonConstants';

const NewButton = ({ type, onClick, className, disabled, buttonTestId, ...rest }) => {
  const buttonLabel = {
    [BUTTON_TYPE.PAGE]: 'New Page',
    [BUTTON_TYPE.STYLE]: 'New Style'
  }[type];

  return (
    <Flex className={className} disabled={disabled} {...rest}>
      <Button data-testid={buttonTestId} type={type} onClick={onClick} aria-label={buttonLabel} disabled={disabled}>
        <img src={AddIcon} alt={`add ${type}`} />
      </Button>
      <Label>{buttonLabel}</Label>
    </Flex>
  );
};

NewButton.propTypes = {
  type: PropTypes.oneOf(Object.values(BUTTON_TYPE)),
  onClick: PropTypes.func.isRequired,
  className: PropTypes.string,
  disabled: PropTypes.bool
};

NewButton.defaultProps = {
  type: BUTTON_TYPE.PAGE,
  className: '',
  disabled: false
};

export default NewButton;
