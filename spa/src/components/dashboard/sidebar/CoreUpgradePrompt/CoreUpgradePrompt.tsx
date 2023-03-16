import { Close } from '@material-ui/icons';
import { PRICING_URL } from 'constants/helperUrls';
import PropTypes, { InferProps } from 'prop-types';
import { CloseButton, Header, LearnMoreButton, Root, Text, UpgradeIcon } from './CoreUpgradePrompt.styled';

const CoreUpgradePromptPropTypes = {
  onClose: PropTypes.func.isRequired
};

export type CoreUpgradePromptProps = InferProps<typeof CoreUpgradePromptPropTypes>;

export function CoreUpgradePrompt({ onClose }: CoreUpgradePromptProps) {
  return (
    <Root>
      <UpgradeIcon />
      <CloseButton aria-label="Close" onClick={onClose}>
        <Close />
      </CloseButton>
      <Header>Upgrade to Core</Header>
      <Text>Boost your revenue with segmented email marketing.</Text>
      <LearnMoreButton disableRipple href={PRICING_URL} target="_blank" variant="outlined">
        Learn More
      </LearnMoreButton>
    </Root>
  );
}

CoreUpgradePrompt.propTypes = CoreUpgradePromptPropTypes;
export default CoreUpgradePrompt;
