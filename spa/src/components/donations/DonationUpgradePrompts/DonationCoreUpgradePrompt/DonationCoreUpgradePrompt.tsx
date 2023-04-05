import { Close } from '@material-ui/icons';
import { PRICING_URL } from 'constants/helperUrls';
import PropTypes, { InferProps } from 'prop-types';
import { CloseButton, Header, LearnMoreLink, Root, Text, UpgradeIcon } from './DonationCoreUpgradePrompt.styled';

const DonationCoreUpgradePromptPropTypes = {
  onClose: PropTypes.func.isRequired
};

export type DonationCoreUpgradePromptProps = InferProps<typeof DonationCoreUpgradePromptPropTypes>;

export function DonationCoreUpgradePrompt({ onClose }: DonationCoreUpgradePromptProps) {
  return (
    <Root>
      <UpgradeIcon />
      <CloseButton aria-label="Close" onClick={onClose}>
        <Close />
      </CloseButton>
      <Header>Upgrade to Core</Header>
      <Text>Automatically send data to Mailchimp.</Text>
      <LearnMoreLink href={PRICING_URL} target="_blank">
        Learn More
      </LearnMoreLink>
    </Root>
  );
}

DonationCoreUpgradePrompt.propTypes = DonationCoreUpgradePromptPropTypes;
export default DonationCoreUpgradePrompt;
