import { IconList, Modal, ModalContent, ModalFooter, ModalHeader } from 'components/base';
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';
import PropTypes, { InferProps } from 'prop-types';
import { ReactComponent as Mail } from '@material-design-icons/svg/filled/mail.svg';
import { ReactComponent as GroupAdd } from '@material-design-icons/svg/filled/group_add.svg';
import { ReactComponent as Diversity } from '@material-design-icons/svg/filled/diversity_2.svg';

import { CancelButton, ActionButton, InfoIcon, Title, SupportText } from './MailchimpModal.styled';
import { PLAN_NAMES, PLAN_LABELS } from 'constants/orgPlanConstants';
import IntegrationCardHeader from '../../IntegrationCardHeader';
import { CORE_UPGRADE_URL, FAQ_URL, HELP_URL } from 'constants/helperUrls';
import { useHistory } from 'react-router-dom';
import { DONATIONS_SLUG } from 'routes';
import ModalUpgradePrompt from '../../ModalUpgradePrompt/ModalUpgradePrompt';

export interface MailchimpModalProps extends InferProps<typeof MailchimpModalPropTypes> {
  /**
   * User is connected to mailchimp?
   */
  isActive: boolean;
  organizationPlan: 'FREE' | 'CORE' | 'PLUS';
}

const LIST_CONTENT = {
  NOT_CONNECTED: [
    { icon: <Mail />, text: 'Regularly thank, steward and bump up current contributors.' },
    { icon: <GroupAdd />, text: 'Re-engage lapsed donors.' },
    { icon: <Diversity />, text: 'Consistently market to new contributors, segmenting out those who already gave.' }
  ],
  // TODO: Update copy
  CONNECTED: []
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

  const handleCorrectState = (free: any, paidNotConnected: any, connected: any) => {
    if ([PLAN_LABELS.CORE, PLAN_LABELS.PLUS].includes(organizationPlan) && !isActive) {
      return paidNotConnected;
    } else if ([PLAN_LABELS.CORE, PLAN_LABELS.PLUS].includes(organizationPlan) && isActive) {
      return connected;
    }
    return free;
  };

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
        {isActive ? (
          <Title>Successfully Connected!</Title>
        ) : (
          <IntegrationCardHeader isActive={isActive} {...mailchimpHeaderData} />
        )}
      </ModalHeader>
      <ModalContent>
        <p style={{ marginBottom: 30, marginTop: 0 }}>
          {handleCorrectState(
            <>
              Integrate with Mailchimp to <b>automate targeted</b> emails.
            </>,
            <>
              Integrate with Mailchimp to <b>automate targeted</b> emails.
            </>,
            <b>What’s Next?</b>
          )}
        </p>
        <IconList
          list={handleCorrectState(LIST_CONTENT.NOT_CONNECTED, LIST_CONTENT.NOT_CONNECTED, LIST_CONTENT.CONNECTED)}
        />
        {handleCorrectState(
          <ModalUpgradePrompt text="Upgrade for integrated email marketing and more features!" />,
          <SupportText>
            See{' '}
            <a href={HELP_URL} style={{ textDecoration: 'underline' }} target="_blank" rel="noreferrer">
              Support
            </a>{' '}
            for more integration details and tips.
          </SupportText>,
          <SupportText>
            Need more help? Check our{' '}
            <a href={FAQ_URL} style={{ textDecoration: 'underline' }} target="_blank" rel="noreferrer">
              FAQ
            </a>{' '}
            for more integration details and tips.
          </SupportText>
        )}
      </ModalContent>
      <ModalFooter>
        <CancelButton color="secondary" variant="contained" onClick={onClose}>
          {isActive ? 'Close' : 'Maybe Later'}
        </CancelButton>
        <ActionButton
          color="primaryDark"
          variant="contained"
          disableElevation
          {...handleCorrectState(
            { href: CORE_UPGRADE_URL },
            { onClick: sendUserToMailchimp },
            {
              onClick: () => {
                history.push(DONATIONS_SLUG);
              }
            }
          )}
        >
          {handleCorrectState('Upgrade', 'Connect', 'Go to contributions')}
        </ActionButton>
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
