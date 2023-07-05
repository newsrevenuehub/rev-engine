import { Close } from '@material-ui/icons';
import { PRICING_URL } from 'constants/helperUrls';
import PropTypes, { InferProps } from 'prop-types';
import { CloseButton, Header, LearnMoreButton, Root, Text, UpgradeIcon } from './SidebarCoreUpgradePrompt.styled';

const SidebarCoreUpgradePromptPropTypes = {
  onClose: PropTypes.func.isRequired
};

export type SidebarCoreUpgradePromptProps = InferProps<typeof SidebarCoreUpgradePromptPropTypes>;

export function SidebarCoreUpgradePrompt({ onClose }: SidebarCoreUpgradePromptProps) {
  return (
    <Root>
      <UpgradeIcon aria-hidden />
      <CloseButton aria-label="Close" onClick={onClose}>
        <Close />
      </CloseButton>
      <Header>Upgrade to Core</Header>
      <Text>Boost your revenue with segmented email marketing.</Text>
      <LearnMoreButton href={PRICING_URL} target="_blank" variant="outlined">
        Learn More
      </LearnMoreButton>
    </Root>
  );
}

SidebarCoreUpgradePrompt.propTypes = SidebarCoreUpgradePromptPropTypes;
export default SidebarCoreUpgradePrompt;
