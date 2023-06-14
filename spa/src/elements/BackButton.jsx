import * as S from './BackButton.styled';

// Assets
import { ICONS } from 'assets/icons/SvgIcon';

// Routing
import { useHistory } from 'react-router-dom';

function BackButton({ to, ...rest }) {
  const history = useHistory();
  const handleBack = () => {
    if (to) history.replace(to);
    else history.goBack();
  };

  return (
    <S.BackButton onClick={handleBack} whileHover={{ scale: 1.1, x: -2 }} {...rest}>
      <S.BackIcon icon={ICONS.ARROW_LEFT} />
    </S.BackButton>
  );
}

export default BackButton;
