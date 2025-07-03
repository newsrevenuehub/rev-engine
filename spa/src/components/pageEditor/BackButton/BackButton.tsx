import { KeyboardBackspace } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { useHistory } from 'react-router-dom';
import { Tooltip } from 'components/base';
import { DiscardChangesButton } from 'components/common/DiscardChangesButton';
import { CONTENT_SLUG } from 'routes';
import { IconButton } from './BackButton.styled';

const BackButtonPropTypes = {
  changesPending: PropTypes.bool
};

export type BackButtonProps = InferProps<typeof BackButtonPropTypes>;

export function BackButton({ changesPending }: BackButtonProps) {
  const history = useHistory();

  return (
    <Tooltip title="Exit">
      <DiscardChangesButton
        aria-label="Exit"
        changesPending={!!changesPending}
        component={IconButton}
        onDiscard={() => history.push(CONTENT_SLUG)}
      >
        <KeyboardBackspace />
      </DiscardChangesButton>
    </Tooltip>
  );
}

BackButton.propTypes = BackButtonPropTypes;
export default BackButton;
