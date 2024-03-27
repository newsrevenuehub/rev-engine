import { Close } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { CloseButton, Header, UpgradeButton, Root, Text, IconWrapper } from './SidebarUpgradePrompt.styled';
import ArrowUp from '@material-design-icons/svg/filled/keyboard_arrow_up.svg?react';
import DoubleArrowUp from '@material-design-icons/svg/filled/keyboard_double_arrow_up.svg?react';
import { SETTINGS } from 'routes';
import { PLAN_NAMES } from 'constants/orgPlanConstants';
import { HELP_URL } from 'constants/helperUrls';
import { LinkProps } from 'react-router-dom';
import { EnginePlan } from 'hooks/useContributionPage';
import React from 'react';

const SidebarUpgradePromptPropTypes = {
  onClose: PropTypes.func.isRequired,
  currentPlan: PropTypes.oneOf(Object.values(PLAN_NAMES)).isRequired
};

export type SidebarUpgradePromptProps = InferProps<typeof SidebarUpgradePromptPropTypes>;

const COPY: Record<
  EnginePlan['name'],
  {
    icon: React.ComponentType;
    iconTestID?: string;
    header: string;
    text: string;
    cta: string;
    to: LinkProps['to'];
    newTab?: boolean;
  }
> = {
  FREE: {
    icon: ArrowUp,
    iconTestID: 'arrow-up',
    header: 'Upgrade to Core',
    text: 'Boost your revenue with segmented email marketing.',
    cta: 'Upgrade',
    to: SETTINGS.SUBSCRIPTION
  },
  CORE: {
    icon: DoubleArrowUp,
    iconTestID: 'double-arrow-up',
    header: 'Upgrade to Plus',
    text: 'Gain access to advanced analytics and contributor data.',
    cta: 'Upgrade',
    to: SETTINGS.SUBSCRIPTION
  },
  PLUS: {
    icon: DoubleArrowUp,
    iconTestID: 'double-arrow-up',
    header: 'Ready for Custom Consulting?',
    text: 'Learn how our team has helped newsrooms raise $100 million. Level up!',
    cta: 'Contact Us',
    to: { pathname: HELP_URL },
    newTab: true
  }
};

export function SidebarUpgradePrompt({ onClose, currentPlan }: SidebarUpgradePromptProps) {
  const { icon: Icon, header, text, cta, to, newTab, iconTestID } = COPY[currentPlan];

  return (
    <Root>
      <IconWrapper $plan={currentPlan}>
        <Icon data-testid={iconTestID} />
      </IconWrapper>
      <CloseButton aria-label="Close" onClick={onClose}>
        <Close />
      </CloseButton>
      <Header>{header}</Header>
      <Text>{text}</Text>
      <UpgradeButton to={to} variant="outlined" {...(newTab && { target: '_blank' })}>
        {cta}
      </UpgradeButton>
    </Root>
  );
}

SidebarUpgradePrompt.propTypes = SidebarUpgradePromptPropTypes;
export default SidebarUpgradePrompt;
