import React from 'react';
import PropTypes, { InferProps } from 'prop-types';

import { Button, Icon, Span} from './BackButton.styled';

const BackButtonPropTypes = {
  onClick: PropTypes.func.isRequired,
  text: PropTypes.string,
};

interface BackButtonProps extends InferProps<typeof BackButtonPropTypes> {
  onClick: (event: React.MouseEvent) => void;
  text?: string
}

export const DEFAULT_BACK_BUTTON_TEXT = 'Back';

const BackButton = ( {onClick, text=DEFAULT_BACK_BUTTON_TEXT}: BackButtonProps ) => {
  return (
      <Button onClick={onClick}><Icon/><Span>{text}</Span></Button>
  );
};


export default BackButton;
