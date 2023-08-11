import { PRICING_URL } from 'constants/helperUrls';
import PropTypes, { InferProps } from 'prop-types';
import { Header, LearnMoreButton, Root, Text, Icon, ButtonWrapper } from './CustomizeCoreUpgradePrompt.styled';

const CustomizeCoreUpgradePromptPropTypes = {
  onClose: PropTypes.func.isRequired
};

export type CustomizeCoreUpgradePromptProps = InferProps<typeof CustomizeCoreUpgradePromptPropTypes>;

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
        <LearnMoreButton onClick={onClose} target="_blank" color="text">
          Close
        </LearnMoreButton>
        <LearnMoreButton href={PRICING_URL} target="_blank">
          Upgrade
        </LearnMoreButton>
      </ButtonWrapper>
    </Root>
  );
}

CustomizeCoreUpgradePrompt.propTypes = CustomizeCoreUpgradePromptPropTypes;

export default CustomizeCoreUpgradePrompt;
