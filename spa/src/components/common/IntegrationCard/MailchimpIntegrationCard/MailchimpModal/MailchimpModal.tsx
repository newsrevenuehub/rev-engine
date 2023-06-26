import { ReactComponent as Diversity } from '@material-design-icons/svg/filled/diversity_2.svg';
import { ReactComponent as BarChart } from '@material-design-icons/svg/outlined/bar_chart.svg';
import { ReactComponent as Group } from '@material-design-icons/svg/outlined/group.svg';
import { ReactComponent as GroupAdd } from '@material-design-icons/svg/outlined/group_add.svg';
import { ReactComponent as Mail } from '@material-design-icons/svg/outlined/mail.svg';
import { ReactComponent as MailCheck } from '@material-design-icons/svg/outlined/mark_email_read.svg';
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';
import { ButtonProps, Modal, ModalContent, ModalFooter, ModalHeader } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';
import { useMemo } from 'react';

import IconList from 'components/common/IconList/IconList';
import SystemNotification from 'components/common/SystemNotification';
import { CORE_UPGRADE_URL, FAQ_URL, HELP_URL } from 'constants/helperUrls';
import { PLAN_LABELS, PLAN_NAMES } from 'constants/orgPlanConstants';
import { useSnackbar } from 'notistack';
import { useHistory } from 'react-router-dom';
import { DONATIONS_SLUG } from 'routes';
import IntegrationCardHeader from '../../IntegrationCardHeader';
import ModalUpgradePrompt from '../../ModalUpgradePrompt/ModalUpgradePrompt';
import {
  ActionButton,
  CancelButton,
  ConnectedTitle,
  ExternalLink,
  InfoIcon,
  NotConnectedTitle,
  SupportText,
  Title
} from './MailchimpModal.styled';

export interface MailchimpModalProps extends InferProps<typeof MailchimpModalPropTypes> {
  /**
   * User is connected to mailchimp?
   */
  isActive: boolean;
  organizationPlan: 'FREE' | 'CORE' | 'PLUS';
}

type DisplayState = 'free' | 'paidNotConnected' | 'connected';

const LIST_CONTENT = {
  NOT_CONNECTED: [
    { icon: <Mail />, text: 'Regularly thank, steward and bump up current contributors.' },
    { icon: <Diversity />, text: 'Re-engage lapsed donors.' },
    { icon: <GroupAdd />, text: 'Consistently market to new contributors, segmenting out those who already gave.' }
  ],
  CONNECTED: [
    {
      icon: <MailCheck />,
      text: 'You can now send email campaigns to your RevEngine contributors without manually importing or exporting their contact information.'
    },
    {
      icon: <Group />,
      text: 'Create and automate targeted emails with pre-populated segments based on a contributor’s activity.'
    },
    { icon: <BarChart />, text: 'You can track contributor engagement from the moment they give.' }
  ]
};

const DISPLAY_STATE: Record<string, DisplayState> = {
  FREE: 'free',
  PAID_NOT_CONNECTED: 'paidNotConnected',
  CONNECTED: 'connected'
};

const MailchimpModal = ({
  open,
  onClose,
  isActive,
  sendUserToMailchimp,
  organizationPlan,
  firstTimeConnected,
  ...mailchimpHeaderData
}: MailchimpModalProps) => {
  const history = useHistory();
  const { enqueueSnackbar } = useSnackbar();
  const actionButtonProps: Partial<ButtonProps> = {
    color: 'primaryDark',
    variant: 'contained',
    disableElevation: true
  };
  const displayState = useMemo(() => {
    if ([PLAN_LABELS.CORE, PLAN_LABELS.PLUS].includes(organizationPlan) && !isActive) {
      return DISPLAY_STATE.PAID_NOT_CONNECTED;
    } else if ([PLAN_LABELS.CORE, PLAN_LABELS.PLUS].includes(organizationPlan) && isActive) {
      return DISPLAY_STATE.CONNECTED;
    }
    return DISPLAY_STATE.FREE;
  }, [isActive, organizationPlan]);

  const showSuccessfulConnectionNotification = () => {
    if (firstTimeConnected) {
      enqueueSnackbar('You’ve successfully connected to Mailchimp! Your contributor data will sync automatically.', {
        persist: true,
        content: (key: string, message: string) => (
          <SystemNotification id={key} message={message} header="Successfully Connected!" type="success" />
        )
      });
    }
  };

  const handleClose = () => {
    onClose();
    showSuccessfulConnectionNotification();
  };

  return (
    <Modal width={isActive ? 660 : 566} open={open} onClose={handleClose} aria-label="Mailchimp connection modal">
      <ModalHeader
        onClose={handleClose}
        icon={
          isActive ? (
            <InfoIcon>
              <InfoOutlinedIcon />
            </InfoIcon>
          ) : undefined
        }
      >
        {displayState === DISPLAY_STATE.CONNECTED ? (
          <Title>Successfully Connected!</Title>
        ) : (
          <IntegrationCardHeader isActive={isActive} {...mailchimpHeaderData} />
        )}
      </ModalHeader>
      <ModalContent>
        {displayState === DISPLAY_STATE.CONNECTED ? (
          <ConnectedTitle>What’s Next?</ConnectedTitle>
        ) : (
          <NotConnectedTitle>
            Integrate with Mailchimp to <b style={{ fontWeight: 500 }}>automate targeted</b> emails.
          </NotConnectedTitle>
        )}
        <IconList
          iconSize={displayState === DISPLAY_STATE.CONNECTED ? 'medium' : 'small'}
          list={displayState === DISPLAY_STATE.CONNECTED ? LIST_CONTENT.CONNECTED : LIST_CONTENT.NOT_CONNECTED}
        />
        {
          {
            [DISPLAY_STATE.FREE]: (
              <ModalUpgradePrompt text="Upgrade for integrated email marketing and more features!" />
            ),
            [DISPLAY_STATE.PAID_NOT_CONNECTED]: (
              <SupportText>
                For more integration details and tips contact{' '}
                <ExternalLink href={HELP_URL} target="_blank">
                  Support
                </ExternalLink>
                .
              </SupportText>
            ),
            [DISPLAY_STATE.CONNECTED]: (
              <SupportText>
                <b>Need more help?</b> Check our{' '}
                <ExternalLink href={FAQ_URL} target="_blank">
                  FAQ
                </ExternalLink>{' '}
                for more integration details and tips.
              </SupportText>
            )
          }[displayState]
        }
      </ModalContent>
      <ModalFooter>
        <CancelButton color="secondary" variant="contained" onClick={handleClose}>
          {isActive ? 'Close' : 'Maybe Later'}
        </CancelButton>
        {
          {
            [DISPLAY_STATE.FREE]: (
              <ActionButton {...actionButtonProps} href={CORE_UPGRADE_URL}>
                Upgrade
              </ActionButton>
            ),
            [DISPLAY_STATE.PAID_NOT_CONNECTED]: (
              <ActionButton {...actionButtonProps} onClick={sendUserToMailchimp!}>
                Connect
              </ActionButton>
            ),
            [DISPLAY_STATE.CONNECTED]: (
              <ActionButton
                {...actionButtonProps}
                onClick={() => {
                  showSuccessfulConnectionNotification();
                  history.push(DONATIONS_SLUG);
                }}
              >
                Go to contributions
              </ActionButton>
            )
          }[displayState]
        }
      </ModalFooter>
    </Modal>
  );
};

const MailchimpModalPropTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  sendUserToMailchimp: PropTypes.func,
  image: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  cornerMessage: PropTypes.node,
  site: PropTypes.shape({
    label: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired
  }).isRequired,
  isActive: PropTypes.bool,
  isRequired: PropTypes.bool.isRequired,
  organizationPlan: PropTypes.oneOf(Object.keys(PLAN_NAMES)).isRequired,
  firstTimeConnected: PropTypes.bool
};

MailchimpModal.propTypes = MailchimpModalPropTypes;

export default MailchimpModal;
