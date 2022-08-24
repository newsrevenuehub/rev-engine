import PropTypes from 'prop-types';

import { Flex, Button, Label } from './NewButton.styled';

import AddIcon from 'assets/icons/add.svg';

export const NEW_BUTTON_TYPE = {
  PAGE: 'page',
  STYLE: 'style'
};

const NewButton = ({ type, onClick, className }) => {
  const buttonLabel = {
    [NEW_BUTTON_TYPE.PAGE]: 'New Page',
    [NEW_BUTTON_TYPE.STYLE]: 'New Style'
  }[type];

  return (
    <Flex className={className}>
      <Button type={type} onClick={onClick}>
        <img src={AddIcon} alt={`add ${type}`} />
      </Button>
      <Label>{buttonLabel}</Label>
    </Flex>
  );
};

NewButton.propTypes = {
  type: PropTypes.oneOf(Object.values(NEW_BUTTON_TYPE)),
  onClick: PropTypes.func.isRequired,
  className: PropTypes.string
};

NewButton.defaultProps = {
  type: NEW_BUTTON_TYPE.PAGE,
  className: ''
};

export default NewButton;
