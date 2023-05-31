import { ReactComponent as Diversity } from '@material-design-icons/svg/filled/diversity_2.svg';
import { ReactComponent as GroupAdd } from '@material-design-icons/svg/outlined/group_add.svg';
import { ReactComponent as Mail } from '@material-design-icons/svg/outlined/mail.svg';
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';
import { ButtonProps, Modal, ModalContent, ModalFooter, ModalHeader } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';
import { useMemo } from 'react';

import IconList from 'components/common/IconList/IconList';
import { CORE_UPGRADE_URL, FAQ_URL, HELP_URL } from 'constants/helperUrls';
import { PLAN_LABELS, PLAN_NAMES } from 'constants/orgPlanConstants';
import { useHistory } from 'react-router-dom';
import { DONATIONS_SLUG } from 'routes';
import IntegrationCardHeader from '../../IntegrationCardHeader';
import ModalUpgradePrompt from '../../ModalUpgradePrompt/ModalUpgradePrompt';
import { ActionButton, CancelButton, ExternalLink, InfoIcon, SupportText, Title } from './MailchimpModal.styled';

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
  // TODO: DEV-3279 Update copy when available
  CONNECTED: [
    { icon: <Mail />, text: 'Regularly thank, steward and bump up current contributors.' },
    { icon: <Diversity />, text: 'Re-engage lapsed donors.' },
    { icon: <GroupAdd />, text: 'Consistently market to new contributors, segmenting out those who already gave.' }
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
  ...mailchimpHeaderData
}: MailchimpModalProps) => {
  const history = useHistory();
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

  return (
    <Modal width={isActive ? 660 : 566} open={open} onClose={onClose} aria-label="Mailchimp connection modal">
      <ModalHeader
        onClose={onClose}
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
        <p style={{ marginBottom: 30, marginTop: 0 }}>
          {displayState === DISPLAY_STATE.CONNECTED ? (
            <b>What’s Next?</b>
          ) : (
            <>
              Integrate with Mailchimp to <b style={{ fontWeight: 500 }}>automate targeted</b> emails.
            </>
          )}
        </p>
        <IconList
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
        <CancelButton color="secondary" variant="contained" onClick={onClose}>
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
  organizationPlan: PropTypes.oneOf(Object.keys(PLAN_NAMES)).isRequired
};

MailchimpModal.propTypes = MailchimpModalPropTypes;

export default MailchimpModal;
