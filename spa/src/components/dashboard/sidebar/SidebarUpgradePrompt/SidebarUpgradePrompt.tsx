import { Close } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { CloseButton, Header, UpgradeButton, Root, Text, IconWrapper } from './SidebarUpgradePrompt.styled';
import ArrowUp from '@material-design-icons/svg/filled/keyboard_arrow_up.svg?react';
import DoubleArrowUp from '@material-design-icons/svg/filled/keyboard_double_arrow_up.svg?react';
import { SETTINGS } from 'routes';
import { PLAN_NAMES } from 'constants/orgPlanConstants';
import { HELP_URL } from 'constants/helperUrls';

const SidebarUpgradePromptPropTypes = {
  onClose: PropTypes.func.isRequired,
  currentPlan: PropTypes.oneOf(Object.values(PLAN_NAMES)).isRequired
};

export type SidebarUpgradePromptProps = InferProps<typeof SidebarUpgradePromptPropTypes>;

export function SidebarUpgradePrompt({ onClose, currentPlan }: SidebarUpgradePromptProps) {
  const COPY = {
    [PLAN_NAMES.FREE]: {
      icon: ArrowUp,
      header: 'Upgrade to Core',
      text: 'Boost your revenue with segmented email marketing.',
      cta: 'Upgrade',
      to: SETTINGS.SUBSCRIPTION
    },
    [PLAN_NAMES.CORE]: {
      icon: DoubleArrowUp,
      header: 'Upgrade to Plus',
      text: 'Gain access to advanced analytics and contributor data.',
      cta: 'Upgrade',
      to: SETTINGS.SUBSCRIPTION
    },
    [PLAN_NAMES.PLUS]: {
      icon: DoubleArrowUp,
      header: 'Ready for Custom Consulting?',
      text: 'Learn how our team has helped newsrooms raise $100 million. Level up!',
      cta: 'Contact Us',
      to: { pathname: HELP_URL },
      newTab: true
    }
  }[currentPlan];

  return (
    <Root>
      <IconWrapper $plan={currentPlan}>{COPY.icon && <COPY.icon />}</IconWrapper>
      <CloseButton aria-label="Close" onClick={onClose}>
        <Close />
      </CloseButton>
      <Header>{COPY.header}</Header>
      <Text>{COPY.text}</Text>
      <UpgradeButton to={COPY.to} variant="outlined" {...(COPY.newTab && { target: '_blank' })}>
        {COPY.cta}
      </UpgradeButton>
    </Root>
  );
}

SidebarUpgradePrompt.propTypes = SidebarUpgradePromptPropTypes;
export default SidebarUpgradePrompt;
