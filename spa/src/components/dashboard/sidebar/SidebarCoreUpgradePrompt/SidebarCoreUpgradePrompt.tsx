import { Close } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { CloseButton, Header, UpgradeButton, Root, Text, UpgradeIcon } from './SidebarCoreUpgradePrompt.styled';
import { SETTINGS } from 'routes';

const SidebarCoreUpgradePromptPropTypes = {
  onClose: PropTypes.func.isRequired
};

export type SidebarCoreUpgradePromptProps = InferProps<typeof SidebarCoreUpgradePromptPropTypes>;

export function SidebarCoreUpgradePrompt({ onClose }: SidebarCoreUpgradePromptProps) {
  return (
    <Root>
      <UpgradeIcon />
      <CloseButton aria-label="Close" onClick={onClose}>
        <Close />
      </CloseButton>
      <Header>Upgrade to Core</Header>
      <Text>Boost your revenue with segmented email marketing.</Text>
      <UpgradeButton to={SETTINGS.SUBSCRIPTION} variant="outlined">
        Upgrade
      </UpgradeButton>
    </Root>
  );
}

SidebarCoreUpgradePrompt.propTypes = SidebarCoreUpgradePromptPropTypes;
export default SidebarCoreUpgradePrompt;
