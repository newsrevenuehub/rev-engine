import { ChevronLeft } from '@material-ui/icons';
import { BackButton, Root } from './MobileBackButton.styled';
import { PORTAL } from 'routes';

export function MobileBackButton() {
  return (
    <Root>
      <BackButton role="link" to={PORTAL.CONTRIBUTIONS} color="text">
        <ChevronLeft />
        Back
      </BackButton>
    </Root>
  );
}

export default MobileBackButton;
