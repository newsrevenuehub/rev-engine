import { PRICING_URL } from 'constants/helperUrls';
import PropTypes, { InferProps } from 'prop-types';
import { Header, Button, Root, Text, Icon, ButtonWrapper } from './CustomizeCoreUpgradePrompt.styled';
import { User } from 'hooks/useUser.types';
import flagIsActiveForUser from 'utilities/flagIsActiveForUser';
import { SELF_UPGRADE_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import { Link } from 'react-router-dom';
import { SETTINGS } from 'routes';

const CustomizeCoreUpgradePromptPropTypes = {
  onClose: PropTypes.func.isRequired,
  user: PropTypes.object.isRequired
};

export interface CustomizeCoreUpgradePromptProps extends InferProps<typeof CustomizeCoreUpgradePromptPropTypes> {
  onClose: () => void;
  user: User;
}

export function CustomizeCoreUpgradePrompt({ onClose, user }: CustomizeCoreUpgradePromptProps) {
  const LooseButton = Button as any;
  const upgradeButton = flagIsActiveForUser(SELF_UPGRADE_ACCESS_FLAG_NAME, user) ? (
    <LooseButton component={Link} to={SETTINGS.SUBSCRIPTION}>
      Upgrade
    </LooseButton>
  ) : (
    <Button href={PRICING_URL} target="_blank">
      Upgrade
    </Button>
  );

  return (
    <Root>
      <Icon />
      <div>
        <Header>Unlock More Features</Header>
        <Text>
          Gain access to branded emails, additional checkout pages, and more features to create a seamless contribution
          experience.
        </Text>
      </div>
      <ButtonWrapper>
        <Button onClick={onClose} color="text">
          Close
        </Button>
        {upgradeButton}
      </ButtonWrapper>
    </Root>
  );
}

CustomizeCoreUpgradePrompt.propTypes = CustomizeCoreUpgradePromptPropTypes;

export default CustomizeCoreUpgradePrompt;
