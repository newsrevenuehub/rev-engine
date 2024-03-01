import { RouterLinkButton } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';
import { SETTINGS } from 'routes';
import { Button, ButtonWrapper, Header, Icon, Root, Text } from './CustomizeCoreUpgradePrompt.styled';

const CustomizeCoreUpgradePromptPropTypes = {
  onClose: PropTypes.func.isRequired
};

export interface CustomizeCoreUpgradePromptProps extends InferProps<typeof CustomizeCoreUpgradePromptPropTypes> {
  onClose: () => void;
}

export function CustomizeCoreUpgradePrompt({ onClose }: CustomizeCoreUpgradePromptProps) {
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
        <RouterLinkButton to={SETTINGS.SUBSCRIPTION}>Upgrade</RouterLinkButton>
      </ButtonWrapper>
    </Root>
  );
}

CustomizeCoreUpgradePrompt.propTypes = CustomizeCoreUpgradePromptPropTypes;

export default CustomizeCoreUpgradePrompt;
