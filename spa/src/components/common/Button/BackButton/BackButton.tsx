import React from 'react';
import PropTypes, { InferProps } from 'prop-types';

import { Button, Icon, Span} from './BackButton.styled';

const BackButtonPropTypes = {
  onClick: PropTypes.func.isRequired,
  text: PropTypes.string.isRequired,
};

interface BackButtonProps extends InferProps<typeof BackButtonPropTypes> {
  onClick: (event: React.MouseEvent) => void;
}

const BackButton = ( {onClick, text='Back'}: BackButtonProps ) => {
  return (
      <Button onClick={onClick}><Icon /><Span>{text}</Span></Button>
  );
};


export default BackButton;
