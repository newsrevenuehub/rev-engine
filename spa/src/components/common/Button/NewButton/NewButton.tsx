import PropTypes, { InferProps } from 'prop-types';

import { Button, Flex, Label } from './NewButton.styled';

import AddIcon from 'assets/icons/add.svg';
import { BUTTON_TYPE } from 'constants/buttonConstants';

interface NewButtonType extends InferProps<typeof NewButtonPropTypes> {
  onClick: () => void;
}

const NewButton = ({ type, onClick, className, disabled, buttonTestId, ...rest }: NewButtonType) => {
  const buttonLabel = {
    [BUTTON_TYPE.PAGE]: 'New Page',
    [BUTTON_TYPE.STYLE]: 'New Style'
  }[type!];

  return (
    <Flex className={className!} disabled={disabled!} {...rest}>
      <Button
        data-testid={buttonTestId}
        customType={type!}
        onClick={onClick}
        aria-labelledby="new-page-button"
        disabled={disabled!}
      >
        <img src={AddIcon} alt={buttonLabel} />
      </Button>
      <Label id="new-page-button">{buttonLabel}</Label>
    </Flex>
  );
};

const NewButtonPropTypes = {
  type: PropTypes.oneOf(Object.values(BUTTON_TYPE)),
  onClick: PropTypes.func.isRequired,
  className: PropTypes.string,
  buttonTestId: PropTypes.string,
  disabled: PropTypes.bool
};

NewButton.propTypes = NewButtonPropTypes;

NewButton.defaultProps = {
  type: BUTTON_TYPE.PAGE,
  className: '',
  disabled: false
};

export default NewButton;
